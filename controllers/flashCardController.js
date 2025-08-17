import axios from "axios";
import dotenv from "dotenv";
import Flashcard from "../models/Flashcard.js";

dotenv.config();

// ✅ Create / Generate Flashcards
export const generateFlashcards = async (req, res) => {
  const { topic } = req.body;
  const userId = req.user?.uid || "guest";

  console.log("📝 Generating flashcards for topic:", topic, "User:", userId);

  if (!topic || topic.trim() === "") {
    return res.status(400).json({ error: "Topic is required." });
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY not found in environment variables");
    return res.status(500).json({ error: "Gemini API key not configured." });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const prompt = `Generate 5 flashcards for the topic "${topic}". Respond in JSON format ONLY as an array of objects with "question" and "answer" fields. Example:
  [
    {"question": "What is ...?", "answer": "..."},
    {"question": "What does ... mean?", "answer": "..."}
  ]`;

  try {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🚀 Attempt ${attempt}: Calling Gemini API...`);

        const response = await axios.post(endpoint, {
          contents: [{ parts: [{ text: prompt }] }],
        });

        console.log("✅ Gemini API response received");

        const modelText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!modelText) {
          console.error("❌ No response text from Gemini API");
          return res.status(500).json({ error: "No response from Gemini API." });
        }

        console.log("📄 Raw Gemini response:", modelText);

        let parsedCards;
        try {
          // Clean the response text to extract JSON
          const cleanedText = modelText.replace(/```json\n?|\n?```/g, '').trim();
          parsedCards = JSON.parse(cleanedText);
          console.log("✅ Successfully parsed flashcards:", parsedCards);
        } catch (e) {
          console.error("❌ Failed to parse Gemini JSON:", e.message);
          console.error("❌ Raw text:", modelText);
          return res.status(500).json({ error: "Invalid JSON from Gemini API." });
        }

        if (!Array.isArray(parsedCards) || parsedCards.length === 0) {
          console.error("❌ Invalid flashcards format:", parsedCards);
          return res.status(500).json({ error: "Invalid flashcards format from AI." });
        }

        const newFlashcard = new Flashcard({
          userId,
          topic,
          flashcards: parsedCards,
        });

        await newFlashcard.save();
        console.log("✅ Flashcards saved to database");

        return res.json(newFlashcard);
      } catch (error) {
        lastError = error;
        if (error.response?.status === 503) {
          console.warn(`Gemini API 503 — retrying... (${attempt}/3)`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw error;
      }
    }

    console.error("Gemini API failed after retries:", lastError.message);
    res.status(503).json({ error: "Gemini API temporarily unavailable." });
  } catch (error) {
    console.error("Error generating flashcards:", error.message);
    res.status(500).json({ error: "Failed to generate flashcards." });
  }
};

// ✅ Read Flashcards
export const fetchFlashcards = async (req, res) => {
  try {
    const userId = req.user?.uid || "guest";
    const flashcards = await Flashcard.find({ userId }).sort({ createdAt: -1 });

    res.json(flashcards);
  } catch (error) {
    console.error("Error fetching flashcards:", error);
    res.status(500).json({ error: "Failed to fetch flashcards" });
  }
};

// ✅ Update Flashcards
export const updateFlashcard = async (req, res) => {
  try {
    const userId = req.user?.uid || "guest";
    const { id } = req.params;
    const { topic, flashcards } = req.body;

    const updated = await Flashcard.findOneAndUpdate(
      { _id: id, userId },
      { topic, flashcards },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Flashcard not found." });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating flashcard:", error);
    res.status(500).json({ error: "Failed to update flashcard." });
  }
};

// ✅ Delete Flashcards
export const deleteFlashcard = async (req, res) => {
  try {
    const userId = req.user?.uid || "guest";
    const { id } = req.params;

    const deleted = await Flashcard.findOneAndDelete({ _id: id, userId });

    if (!deleted) {
      return res.status(404).json({ error: "Flashcard not found." });
    }

    res.json({ message: "Flashcard deleted successfully." });
  } catch (error) {
    console.error("Error deleting flashcard:", error);
    res.status(500).json({ error: "Failed to delete flashcard." });
  }
};
