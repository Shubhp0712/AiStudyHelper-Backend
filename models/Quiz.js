import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['multiple-choice', 'short-answer'],
        required: true
    },
    question: {
        type: String,
        required: true
    },
    options: [{
        type: String
    }], // For multiple choice questions
    correctAnswer: {
        type: String,
        required: true
    },
    explanation: {
        type: String
    }
});

const quizSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    questions: [questionSchema],
    sourceType: {
        type: String,
        enum: ['notes', 'flashcards', 'custom'],
        required: true
    },
    sourceContent: {
        type: String // Original content used to generate quiz
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Add index for user-specific queries
quizSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Quiz', quizSchema);
