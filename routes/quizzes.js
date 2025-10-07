import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
    generateQuiz,
    getUserQuizzes,
    getQuizById,
    updateQuiz,
    deleteQuiz
} from "../controllers/quizController.js";

const router = express.Router();

// Test route to verify routes are working
router.get("/test", (req, res) => {
    res.json({ message: "Quiz routes are working!" });
});

// Debug route to test authentication
router.get("/debug", verifyToken, (req, res) => {
    res.json({
        message: "Authentication working!",
        userId: req.user?.uid,
        userEmail: req.user?.email,
        timestamp: new Date().toISOString()
    });
});

// Simple test generation (no AI)
router.post("/test-generate", verifyToken, async (req, res) => {
    try {
        const { content = "test content" } = req.body;
        const userId = req.user.uid;

        const testQuiz = {
            userId,
            title: "Test Quiz",
            questions: [{
                type: "multiple-choice",
                question: "What is this test about?",
                options: ["Testing", "Learning", "Development", "All of the above"],
                correctAnswer: "All of the above",
                explanation: "This is a test question"
            }],
            sourceType: "notes",
            sourceContent: content,
            difficulty: "medium",
            createdAt: new Date(),
            updatedAt: new Date()
        };

        res.json({
            message: "Test quiz generation successful",
            quiz: testQuiz,
            canSaveToDb: !!userId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate quiz route
router.post("/generate", verifyToken, async (req, res) => {
    console.log('🎯 Quiz generation route hit');
    console.log('📝 Request body:', req.body);
    console.log('👤 User:', req.user?.uid);

    try {
        await generateQuiz(req, res);
    } catch (error) {
        console.error('❌ Error in quiz generation route:', error);
        res.status(500).json({
            error: 'Quiz generation failed',
            details: error.message,
            route: 'POST /api/quizzes/generate'
        });
    }
});

// Get all quizzes for the user
router.get("/", verifyToken, getUserQuizzes);

// Get specific quiz by ID
router.get("/:id", verifyToken, getQuizById);

// Update quiz
router.put("/:id", verifyToken, updateQuiz);

// Delete quiz
router.delete("/:id", verifyToken, deleteQuiz);

export default router;
