import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Simple test route to verify routes are working
router.get("/test", (req, res) => {
    res.json({ message: "Quiz routes are working!" });
});

// Generate quiz route (without controller for now to test basic routing)
router.post("/generate", verifyToken, async (req, res) => {
    try {
        console.log("Quiz generation endpoint hit!");
        console.log("Request body:", req.body);
        console.log("User:", req.user?.uid);

        res.json({
            message: "Quiz generation endpoint working",
            userId: req.user?.uid,
            requestBody: req.body
        });
    } catch (error) {
        console.error("Error in quiz generation:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get all quizzes route
router.get("/", verifyToken, async (req, res) => {
    try {
        console.log("Get quizzes endpoint hit!");
        res.json({ message: "Get quizzes endpoint working", quizzes: [] });
    } catch (error) {
        console.error("Error fetching quizzes:", error);
        res.status(500).json({ error: "Failed to fetch quizzes" });
    }
});

export default router;
