import mongoose from "mongoose";

const cardSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
});

const flashcardSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    topic: { type: String, required: true },
    flashcards: { type: [cardSchema], required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Flashcard", flashcardSchema);
