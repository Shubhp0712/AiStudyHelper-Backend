import Quiz from '../models/Quiz.js';
import { callGeminiAI } from '../server.js';

export const generateQuiz = async (req, res) => {
    try {
        console.log('🎯 Quiz generation request received:', req.body);
        const { content, title, questionCount = 5, questionType = 'multiple-choice', difficulty = 'medium', sourceType = 'notes' } = req.body;
        const userId = req.user.uid;

        console.log('👤 User ID:', userId);
        console.log('📝 Content:', content);

        if (!content || content.trim() === '') {
            console.log('❌ No content provided');
            return res.status(400).json({ error: 'Content is required to generate quiz' });
        }

        // Use the existing working Gemini AI endpoint
        const prompt = `Create exactly ${questionCount} multiple-choice quiz questions about: "${content}"

CRITICAL: Return ONLY a valid JSON array, no markdown, no explanation, no other text.

Format exactly like this:
[
  {
    "question": "What is ${content} primarily used for?",
    "options": ["Web development", "Mobile apps", "Data analysis", "All of the above"],
    "correctAnswer": "All of the above",
    "explanation": "Brief explanation here"
  }
]

Requirements:
- ${questionCount} questions total
- All questions about: ${content}
- Difficulty: ${difficulty}
- Each question must have exactly 4 options
- correctAnswer must match one of the options exactly
- Make questions diverse and educational
- Return ONLY the JSON array, nothing else`;

        console.log('🚀 Using internal Gemini AI function...');

        // Use the working internal Gemini function
        const aiResult = await callGeminiAI(prompt);
        const responseText = aiResult.answer;

        console.log('✅ Gemini AI response received');
        console.log('📄 Response preview:', responseText.substring(0, 200) + '...');

        let questions;
        try {
            // Clean the AI response
            let cleanResponse = responseText.trim();

            // Remove any markdown formatting
            cleanResponse = cleanResponse.replace(/```json/g, '').replace(/```/g, '');

            // Extract JSON array
            const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                cleanResponse = jsonMatch[0];
            }

            console.log('🧹 Cleaned response for parsing:', cleanResponse.substring(0, 100) + '...');

            questions = JSON.parse(cleanResponse);

            if (!Array.isArray(questions) || questions.length === 0) {
                throw new Error('AI did not return a valid question array');
            }

            console.log('✅ Successfully parsed', questions.length, 'AI-generated questions');

        } catch (parseError) {
            console.error('❌ Failed to parse AI response:', parseError.message);
            console.log('🔄 Raw AI response that failed to parse:', responseText);

            // If parsing fails, try a different approach
            throw new Error(`AI response could not be parsed as valid JSON: ${parseError.message}`);
        }

        // Validate and format the AI-generated questions
        const formattedQuestions = questions.map((q, index) => {
            if (!q.question) {
                throw new Error(`AI question ${index + 1} is missing question text`);
            }

            if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
                console.log(`Warning: Question ${index + 1} options:`, q.options);
                // Fix options if they're not exactly 4
                const baseOptions = q.options || [];
                while (baseOptions.length < 4) {
                    baseOptions.push(`Option ${baseOptions.length + 1}`);
                }
                q.options = baseOptions.slice(0, 4);
            }

            if (!q.correctAnswer) {
                q.correctAnswer = q.options[0]; // Default to first option
            }

            return {
                type: questionType,
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation || `This question tests your knowledge of ${content}.`
            };
        });

        console.log('📊 Final AI-generated questions count:', formattedQuestions.length);

        // Save quiz to database
        const quiz = new Quiz({
            userId,
            title: title || `AI Quiz: ${content} - ${new Date().toLocaleDateString()}`,
            questions: formattedQuestions,
            sourceType,
            sourceContent: content,
            difficulty,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log('💾 Saving AI-generated quiz to database...');
        await quiz.save();
        console.log('✅ AI Quiz saved successfully with ID:', quiz._id);

        res.status(201).json({
            message: 'AI Quiz generated successfully',
            quiz: quiz,
            generatedBy: 'Gemini AI',
            questionCount: formattedQuestions.length,
            aiPowered: true
        });

    } catch (error) {
        console.error('💥 Quiz generation error:', error.message);
        console.error('📊 Error details:', error);

        res.status(500).json({
            error: 'Failed to generate AI quiz',
            details: error.message,
            timestamp: new Date().toISOString(),
            suggestion: 'Please try again or check if the content is appropriate for quiz generation'
        });
    }
};// Get all quizzes for a user
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
