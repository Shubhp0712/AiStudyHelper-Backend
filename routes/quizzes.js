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

// Generate quiz route
router.post("/generate", verifyToken, generateQuiz);

// Get all quizzes for the user
router.get("/", verifyToken, getUserQuizzes);

// Get specific quiz by ID
router.get("/:id", verifyToken, getQuizById);

// Update quiz
router.put("/:id", verifyToken, updateQuiz);

// Delete quiz
router.delete("/:id", verifyToken, deleteQuiz);

export default router;
