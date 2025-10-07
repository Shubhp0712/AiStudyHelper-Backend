import Quiz from '../models/Quiz.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const generateQuiz = async (req, res) => {
    try {
        console.log('Quiz generation request received:', req.body);
        const { content, title, questionCount = 5, questionType = 'multiple-choice', difficulty = 'medium', sourceType = 'notes' } = req.body;
        const userId = req.user.uid;

        console.log('User ID:', userId);

        if (!content) {
            console.log('No content provided');
            return res.status(400).json({ error: 'Content is required to generate quiz' });
        }

        // Prepare prompt for Gemini AI
        const prompt = `Generate ${questionCount} ${questionType} questions based on the following content. 
        Difficulty level: ${difficulty}
        
        Content: ${content}
        
        Please format your response as a JSON array with the following structure:
        [
            {
                "question": "Question text here",
                "options": ["Option A", "Option B", "Option C", "Option D"], // Only for multiple-choice
                "correctAnswer": "Correct answer here",
                "explanation": "Brief explanation why this is correct"
            }
        ]
        
        For multiple-choice questions, provide 4 options and the correct answer should match one of the options exactly.
        For short-answer questions, omit the options array.
        Make sure all questions are relevant to the provided content and at ${difficulty} difficulty level.`;

        console.log('Calling Gemini AI with prompt length:', prompt.length);

        // Use Gemini AI directly
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        const result = await model.generateContent(prompt);
        const responseData = { answer: result.response.text() };
        console.log('Gemini AI response received:', responseData);

        let questions;
        try {
            // Parse the AI response to extract JSON
            const aiResponse = responseData.answer;
            console.log('AI Response:', aiResponse);

            const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                questions = JSON.parse(jsonMatch[0]);
                console.log('Parsed questions:', questions);
            } else {
                throw new Error('Could not parse AI response - no JSON array found');
            }
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            console.error('AI Response was:', responseData.answer);
            return res.status(500).json({
                error: 'Failed to generate valid quiz questions',
                details: parseError.message,
                aiResponse: responseData.answer?.substring(0, 500) + '...' // First 500 chars for debugging
            });
        }

        // Validate and format questions
        const formattedQuestions = questions.map(q => ({
            type: questionType,
            question: q.question,
            options: questionType === 'multiple-choice' ? q.options : [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || ''
        }));

        console.log('Formatted questions:', formattedQuestions);

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
        res.status(500).json({
            error: 'Failed to generate quiz',
            details: error.message
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
