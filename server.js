import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import flashcardRoutes from './routes/flashcards.js';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chats.js';
import otpRoutes from './routes/otpRoutes.js';
import quizRoutes from './routes/quizzes.js';

import { GoogleGenerativeAI } from '@google/generative-ai'; // ✅ Import Gemini

// Import Quiz model for database operations
import Quiz from './models/Quiz.js';

// Import Progress Controller
import { getUserProgress, logStudySession, getAnalytics, getDashboardStatistics } from './controllers/progressController.js';

// Import verifyToken middleware
import { verifyToken } from './middleware/verifyToken.js';

dotenv.config();

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: [
    // 'http://localhost:3000',
    'https://ai-study-assistant-frontend.onrender.com',
    'https://aistudyhelper-frontend.onrender.com'
  ],
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
app.use('/api/quizzes', quizRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!', timestamp: new Date().toISOString() });
});

// Environment test endpoint
app.get('/api/test/env', (req, res) => {
  res.json({
    message: 'Environment check',
    mongoConnected: mongoose.connection.readyState === 1,
    geminiApiKeyExists: !!process.env.GEMINI_API_KEY,
    geminiApiKeyLength: process.env.GEMINI_API_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// OTP test endpoint
app.get('/api/otp/test', (req, res) => {
  res.json({ message: 'OTP service is accessible!', timestamp: new Date().toISOString() });
});

// ✅ Progress Tracking Routes
// Get user progress
app.get('/api/progress', verifyToken, getUserProgress);

// Log study session
app.post('/api/progress/session', verifyToken, logStudySession);

// Get analytics
app.get('/api/progress/analytics', verifyToken, getAnalytics);

// Get dashboard statistics
app.get('/api/progress/statistics', verifyToken, getDashboardStatistics);

// ✅ Gemini AI setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Internal function for Gemini AI calls (used by quiz controller)
export const callGeminiAI = async (prompt) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log("🤖 Internal Gemini AI call...");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("✅ Internal Gemini response received");
    return { answer: text };
  } catch (error) {
    console.error("❌ Internal Gemini AI Error:", error.message);
    throw error;
  }
};

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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
