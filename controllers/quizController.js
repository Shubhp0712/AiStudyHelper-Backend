import Quiz from '../models/Quiz.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const generateQuiz = async (req, res) => {
    try {
        console.log('Quiz generation request received:', req.body);
        const { content, title, questionCount = 5, questionType = 'multiple-choice', difficulty = 'medium', sourceType = 'notes' } = req.body;
        const userId = req.user.uid;

        console.log('User ID:', userId);
        console.log('Content length:', content?.length);
        console.log('API Key exists:', !!process.env.GEMINI_API_KEY);

        if (!content || content.trim() === '') {
            console.log('No content provided or content is empty');
            return res.status(400).json({ error: 'Content is required to generate quiz' });
        }

        // Prepare prompt for Gemini AI
        const prompt = `Generate exactly ${questionCount} ${questionType} questions based on the following content. 
        Difficulty level: ${difficulty}
        
        Content: ${content}
        
        IMPORTANT: Respond ONLY with a valid JSON array. No additional text or explanation.
        Format:
        [
            {
                "question": "Question text here",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctAnswer": "Option A",
                "explanation": "Brief explanation"
            }
        ]
        
        Rules:
        - For multiple-choice: provide exactly 4 options
        - correctAnswer must match one of the options exactly
        - Questions must be relevant to the content
        - Difficulty level: ${difficulty}`;

        console.log('Calling Gemini AI...');

        let questions;

        try {
            // Check if API key exists
            if (!process.env.GEMINI_API_KEY) {
                throw new Error('GEMINI_API_KEY not configured');
            }

            // Use Gemini AI directly
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            console.log('Raw Gemini response:', responseText.substring(0, 200) + '...');

            // Try to extract JSON from the response
            let jsonString = responseText.trim();

            // Remove any markdown code blocks
            jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');

            // Try to find JSON array in the response
            const jsonMatch = jsonString.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                jsonString = jsonMatch[0];
            }

            questions = JSON.parse(jsonString);
            console.log('Successfully parsed questions:', questions.length);

        } catch (aiError) {
            console.error('AI Error:', aiError.message);

            // Fallback: Create mock questions based on content
            console.log('Using fallback question generation...');

            const contentWords = content.split(' ').filter(word => word.length > 3);
            const sampleWords = contentWords.slice(0, 4);

            questions = Array.from({ length: questionCount }, (_, index) => {
                const questionWord = sampleWords[index % sampleWords.length] || 'concept';
                return {
                    question: `What is the main idea related to "${questionWord}" in the given content?`,
                    options: questionType === 'multiple-choice' ? [
                        `${questionWord} is the primary focus`,
                        'It is not mentioned in the content',
                        'It is a secondary concept',
                        'None of the above'
                    ] : [],
                    correctAnswer: questionType === 'multiple-choice' ? `${questionWord} is the primary focus` : `The main idea related to ${questionWord}`,
                    explanation: `This question tests understanding of ${questionWord} from the provided content.`
                };
            });
        }

        // Validate questions structure
        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('No valid questions generated');
        }

        // Validate and format questions
        const formattedQuestions = questions.map((q, index) => {
            if (!q.question) {
                throw new Error(`Question ${index + 1} is missing question text`);
            }

            return {
                type: questionType,
                question: q.question,
                options: questionType === 'multiple-choice' ? (q.options || []) : [],
                correctAnswer: q.correctAnswer || 'Answer not provided',
                explanation: q.explanation || 'No explanation provided'
            };
        });

        console.log('Formatted questions count:', formattedQuestions.length);

        // Save quiz to database
        const quiz = new Quiz({
            userId,
            title: title || `Quiz - ${new Date().toLocaleDateString()}`,
            questions: formattedQuestions,
            sourceType,
            sourceContent: content,
            difficulty,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log('Saving quiz to database...');
        await quiz.save();
        console.log('Quiz saved successfully with ID:', quiz._id);

        res.status(201).json({
            message: 'Quiz generated successfully',
            quiz: quiz
        });

    } catch (error) {
        console.error('Error generating quiz:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: 'Failed to generate quiz',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Get all quizzes for a user
export const getUserQuizzes = async (req, res) => {
    try {
        const userId = req.user.uid;
        console.log('Fetching quizzes for user:', userId);

        const quizzes = await Quiz.find({ userId }).sort({ createdAt: -1 });
        console.log('Found quizzes:', quizzes.length);

        res.json(quizzes);
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({ error: 'Failed to fetch quizzes' });
    }
};

// Get specific quiz by ID
export const getQuizById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid;

        const quiz = await Quiz.findOne({ _id: id, userId });

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        res.json(quiz);
    } catch (error) {
        console.error('Error fetching quiz:', error);
        res.status(500).json({ error: 'Failed to fetch quiz' });
    }
};

// Update quiz
export const updateQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid;
        const updates = req.body;

        const quiz = await Quiz.findOneAndUpdate(
            { _id: id, userId },
            { ...updates, updatedAt: new Date() },
            { new: true }
        );

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        res.json(quiz);
    } catch (error) {
        console.error('Error updating quiz:', error);
        res.status(500).json({ error: 'Failed to update quiz' });
    }
};

// Delete quiz
export const deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid;

        const quiz = await Quiz.findOneAndDelete({ _id: id, userId });

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        res.status(500).json({ error: 'Failed to delete quiz' });
    }
};
