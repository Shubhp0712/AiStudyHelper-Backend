import express from "express";
import { verifyFirebaseToken } from "../middleware/authMiddleware.js";
import {
  generateFlashcards,
  fetchFlashcards,
  updateFlashcard,
  deleteFlashcard
} from "../controllers/flashCardController.js";

const router = express.Router();

// Protected route to create/generate flashcards
router.post("/", verifyFirebaseToken, generateFlashcards);

// Protected route to get flashcards
router.get("/", verifyFirebaseToken, fetchFlashcards);

// Protected route to update flashcards
router.put("/:id", verifyFirebaseToken, updateFlashcard);

// Protected route to delete flashcards
router.delete("/:id", verifyFirebaseToken, deleteFlashcard);

export default router;
