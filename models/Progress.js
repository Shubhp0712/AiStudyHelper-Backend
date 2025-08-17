import mongoose from 'mongoose';

// Schema for individual study session
const studySessionSchema = new mongoose.Schema({
    activityType: {
        type: String,
        enum: ['flashcard', 'quiz', 'chat'],
        required: true
    },
    activityData: {
        // For flashcards
        flashcardId: String,
        isLearned: Boolean,

        // For quiz
        quizId: String,
        score: Number,
        totalQuestions: Number,
        percentage: Number,

        // For chat/general
        topic: String,
        content: String
    },
    timeSpent: {
        type: Number, // in minutes
        default: 0
    },
    date: {
        type: Date,
        default: Date.now
    }
});

// Main progress tracking schema
const progressSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },

    // Overall statistics
    stats: {
        totalFlashcardsLearned: {
            type: Number,
            default: 0
        },
        totalQuizzesTaken: {
            type: Number,
            default: 0
        },
        averageQuizScore: {
            type: Number,
            default: 0
        },
        totalStudyTime: {
            type: Number, // in minutes
            default: 0
        },
        currentStreak: {
            type: Number,
            default: 0
        },
        longestStreak: {
            type: Number,
            default: 0
        },
        lastStudyDate: {
            type: Date
        }
    },

    // Topics studied with progress
    topicsStudied: [{
        topic: String,
        flashcardsCount: {
            type: Number,
            default: 0
        },
        quizzesCount: {
            type: Number,
            default: 0
        },
        averageScore: {
            type: Number,
            default: 0
        },
        lastStudied: {
            type: Date,
            default: Date.now
        }
    }],

    // Recent study sessions
    recentSessions: [studySessionSchema],

    // Weekly progress tracking
    weeklyProgress: [{
        week: String, // Format: "2025-W32"
        studyDays: {
            type: Number,
            default: 0
        },
        totalSessions: {
            type: Number,
            default: 0
        },
        totalTime: {
            type: Number,
            default: 0
        },
        flashcardsLearned: {
            type: Number,
            default: 0
        },
        quizzesTaken: {
            type: Number,
            default: 0
        },
        averageScore: {
            type: Number,
            default: 0
        }
    }],

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
progressSchema.index({ userId: 1 });
progressSchema.index({ 'recentSessions.date': -1 });
progressSchema.index({ 'weeklyProgress.week': -1 });

// Helper method to get current week string
progressSchema.statics.getCurrentWeek = function () {
    const now = new Date();
    const year = now.getFullYear();
    const week = getWeekNumber(now);
    return `${year}-W${week.toString().padStart(2, '0')}`;
};

// Helper method to calculate study streak
progressSchema.methods.updateStreak = function () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!this.stats.lastStudyDate) {
        this.stats.currentStreak = 1;
        this.stats.longestStreak = Math.max(this.stats.longestStreak, 1);
        this.stats.lastStudyDate = today;
        return;
    }

    const lastStudy = new Date(this.stats.lastStudyDate);
    lastStudy.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today - lastStudy) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
        // Same day, no change to streak
        return;
    } else if (daysDiff === 1) {
        // Consecutive day
        this.stats.currentStreak += 1;
        this.stats.longestStreak = Math.max(this.stats.longestStreak, this.stats.currentStreak);
    } else {
        // Streak broken
        this.stats.currentStreak = 1;
    }

    this.stats.lastStudyDate = today;
};

// Helper function to get week number
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

export default mongoose.model('Progress', progressSchema);
