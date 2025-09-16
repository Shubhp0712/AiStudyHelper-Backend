import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import flashcardRoutes from './routes/flashcards.js';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chats.js';
import otpRoutes from './routes/otpRoutes.js';
// import quizRoutes from './routes/quizzes.js';

import { GoogleGenerativeAI } from '@google/generative-ai'; // ✅ Import Gemini

// Import Quiz model for database operations
import Quiz from './models/Quiz.js';

// Import Progress Controller
import { getUserProgress, logStudySession, getAnalytics } from './controllers/progressController.js';

dotenv.config();

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Routes
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/otp', otpRoutes);
// app.use('/api/quizzes', quizRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!', timestamp: new Date().toISOString() });
});

// OTP test endpoint
app.get('/api/otp/test', (req, res) => {
  res.json({ message: 'OTP service is accessible!', timestamp: new Date().toISOString() });
});

// ✅ Quiz routes (inline for now)
import { verifyToken } from './middleware/verifyToken.js';

// Test quiz endpoint
app.get('/api/quizzes/test', (req, res) => {
  res.json({ message: 'Quiz routes are working!' });
});

// Generate quiz endpoint
app.post('/api/quizzes/generate', verifyToken, async (req, res) => {
  try {
    console.log('Quiz generation endpoint hit!');
    console.log('Request body:', req.body);
    console.log('User:', req.user?.uid);

    const { content, title, questionCount = 5, questionType = 'multiple-choice', difficulty = 'medium' } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required to generate quiz' });
    }

    // Generate quiz using Gemini AI
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

    console.log('Calling Gemini AI for quiz generation...');

    // Call Gemini AI API using the existing endpoint
    const aiResponse = await fetch('http://localhost:5000/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question: prompt
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error! status: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('Gemini AI response received:', aiData);

    let questions;
    try {
      // Parse the AI response to extract JSON
      const aiResponseText = aiData.answer;
      console.log('AI Response text:', aiResponseText);

      const jsonMatch = aiResponseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
        console.log('Parsed questions:', questions);
      } else {
        throw new Error('Could not parse AI response - no JSON array found');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('AI Response was:', aiData.answer);

      // Fallback to mock questions if AI parsing fails
      questions = [
        {
          question: `Based on "${content}", what is the main concept being discussed?`,
          options: questionType === 'multiple-choice' ? [
            content.split(' ')[0] || 'Concept A',
            'Alternative concept',
            'Different topic',
            'None of the above'
          ] : [],
          correctAnswer: questionType === 'multiple-choice' ? (content.split(' ')[0] || 'Concept A') : 'Main concept from the content',
          explanation: 'This question is based on the key concepts in your provided content.'
        }
      ];
    }

    // Validate and format questions
    const formattedQuestions = questions.map((q, index) => ({
      type: questionType,
      question: q.question,
      options: questionType === 'multiple-choice' ? (q.options || []) : [],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || 'No explanation provided'
    }));

    const generatedQuiz = {
      userId: req.user.uid, // Add user ID for database storage
      title: title || `Quiz - ${new Date().toLocaleDateString()}`,
      difficulty: difficulty,
      questions: formattedQuestions,
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceType: 'notes',
      sourceContent: content
    };

    console.log('Saving quiz to database...');

    // Save quiz to MongoDB
    const quiz = new Quiz(generatedQuiz);
    await quiz.save();

    console.log('Quiz saved successfully with ID:', quiz._id);

    res.json({
      message: 'Quiz generated successfully',
      quiz: quiz
    });
  } catch (error) {
    console.error('Error in quiz generation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all quizzes endpoint
app.get('/api/quizzes', verifyToken, async (req, res) => {
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
});

// ✅ Progress Tracking Routes
// Get user progress
app.get('/api/progress', verifyToken, getUserProgress);

// Log study session
app.post('/api/progress/session', verifyToken, logStudySession);

// Get analytics
app.get('/api/progress/analytics', verifyToken, getAnalytics);

// ✅ Gemini AI setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Gemini endpoint (no auth required for general questions)
app.post("/api/ask", async (req, res) => {
  const { question } = req.body;

  console.log("📝 Received question:", question);
  console.log("🔑 API Key exists:", !!process.env.GEMINI_API_KEY);
  console.log("🔑 API Key length:", process.env.GEMINI_API_KEY?.length);

  if (!question || question.trim() === '') {
    return res.status(400).json({ error: 'Question is required.' });
  }

  try {
    // Test if API key is properly configured
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log("🤖 Calling Gemini AI...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(question);
    const response = await result.response;
    const text = response.text();

    console.log("✅ Gemini response received:", text.substring(0, 100) + "...");
    res.json({ answer: text });
  } catch (error) {
    console.error("❌ Gemini AI Error:", error.message);
    console.error("❌ Error details:", error.response?.data || error);

    // Return more detailed error information
    res.status(500).json({
      error: "Failed to get response from Gemini AI.",
      details: error.message
    });
  }
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
