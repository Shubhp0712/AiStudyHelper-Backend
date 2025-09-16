import Progress from '../models/Progress.js';
import Flashcard from '../models/Flashcard.js';

// Get user's progress data
export const getUserProgress = async (req, res) => {
    try {
        const userId = req.user.uid;
        console.log('Fetching progress for user:', userId);

        let progress = await Progress.findOne({ userId });

        if (!progress) {
            // Create new progress record if doesn't exist
            progress = new Progress({
                userId,
                topicsStudied: [],
                recentSessions: [],
                weeklyProgress: []
            });
            await progress.save();
            console.log('Created new progress record for user');
        } else {
            // Ensure existing progress has properly initialized stats
            if (!progress.stats) {
                progress.stats = {};
            }

            // Initialize any missing stat fields with defaults
            if (progress.stats.totalFlashcardsCreated === undefined) {
                progress.stats.totalFlashcardsCreated = 0;
            }
            if (progress.stats.totalFlashcardsLearned === undefined) {
                progress.stats.totalFlashcardsLearned = 0;
            }
            if (progress.stats.totalQuizzesTaken === undefined) {
                progress.stats.totalQuizzesTaken = 0;
            }
            if (progress.stats.averageQuizScore === undefined) {
                progress.stats.averageQuizScore = 0;
            }
            if (progress.stats.totalStudyTime === undefined) {
                progress.stats.totalStudyTime = 0;
            }
            if (progress.stats.currentStreak === undefined) {
                progress.stats.currentStreak = 0;
            }
            if (progress.stats.longestStreak === undefined) {
                progress.stats.longestStreak = 0;
            }

            // Save if we made any updates
            await progress.save();
        }

        // Calculate dynamic flashcards created count
        const flashcardDocuments = await Flashcard.find({ userId });
        const totalFlashcardsCreated = flashcardDocuments.reduce((total, doc) => {
            return total + (doc.flashcards ? doc.flashcards.length : 0);
        }, 0);

        // Update the dynamic count in the response
        progress.stats.totalFlashcardsCreated = totalFlashcardsCreated;

        res.json(progress);
    } catch (error) {
        console.error('Error fetching progress:', error);
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
};

// Log a study session (flashcard, quiz, or general study)
export const logStudySession = async (req, res) => {
    try {
        const userId = req.user.uid;
        const { activityType, activityData, timeSpent = 0 } = req.body;

        console.log('Logging study session:', { userId, activityType, activityData });

        if (!activityType || !['flashcard', 'quiz', 'chat'].includes(activityType)) {
            return res.status(400).json({ error: 'Invalid activity type' });
        }

        let progress = await Progress.findOne({ userId });

        if (!progress) {
            progress = new Progress({ userId });
        }

        // Ensure stats object exists and is properly initialized
        if (!progress.stats) {
            progress.stats = {};
        }

        // Initialize any missing stat fields with defaults
        if (progress.stats.totalFlashcardsCreated === undefined) {
            progress.stats.totalFlashcardsCreated = 0;
        }
        if (progress.stats.totalFlashcardsLearned === undefined) {
            progress.stats.totalFlashcardsLearned = 0;
        }
        if (progress.stats.totalQuizzesTaken === undefined) {
            progress.stats.totalQuizzesTaken = 0;
        }
        if (progress.stats.averageQuizScore === undefined) {
            progress.stats.averageQuizScore = 0;
        }
        if (progress.stats.totalStudyTime === undefined) {
            progress.stats.totalStudyTime = 0;
        }
        if (progress.stats.currentStreak === undefined) {
            progress.stats.currentStreak = 0;
        }
        if (progress.stats.longestStreak === undefined) {
            progress.stats.longestStreak = 0;
        }

        // Create study session
        const session = {
            activityType,
            activityData,
            timeSpent,
            date: new Date()
        };

        // Add to recent sessions (keep only last 50)
        progress.recentSessions.unshift(session);
        progress.recentSessions = progress.recentSessions.slice(0, 50);

        // Update statistics based on activity type
        await updateProgressStats(progress, activityType, activityData, timeSpent);

        // Update streak
        progress.updateStreak();

        // Update weekly progress
        updateWeeklyProgress(progress, activityType, activityData, timeSpent);

        progress.updatedAt = new Date();
        await progress.save();

        // Calculate dynamic flashcards created count
        const flashcardDocuments = await Flashcard.find({ userId });
        const totalFlashcardsCreated = flashcardDocuments.reduce((total, doc) => {
            return total + (doc.flashcards ? doc.flashcards.length : 0);
        }, 0);

        // Update the dynamic count in the response
        progress.stats.totalFlashcardsCreated = totalFlashcardsCreated;

        console.log('Study session logged successfully');
        res.json({ message: 'Study session logged successfully', progress });

    } catch (error) {
        console.error('Error logging study session:', error);
        res.status(500).json({ error: 'Failed to log study session' });
    }
};

// Update progress statistics
async function updateProgressStats(progress, activityType, activityData, timeSpent) {
    progress.stats.totalStudyTime += timeSpent;

    switch (activityType) {
        case 'flashcard':
            if (activityData.isLearned) {
                progress.stats.totalFlashcardsLearned += 1;
            }
            break;

        case 'quiz':
            progress.stats.totalQuizzesTaken += 1;

            // Update average quiz score
            const currentTotal = progress.stats.averageQuizScore * (progress.stats.totalQuizzesTaken - 1);
            progress.stats.averageQuizScore = (currentTotal + activityData.percentage) / progress.stats.totalQuizzesTaken;
            break;

        case 'chat':
            // For chat sessions, we mainly track time and topics
            break;
    }

    // Update topic-specific progress
    if (activityData.topic) {
        updateTopicProgress(progress, activityData.topic, activityType, activityData);
    }
}

// Update topic-specific progress
function updateTopicProgress(progress, topicName, activityType, activityData) {
    let topic = progress.topicsStudied.find(t => t.topic === topicName);

    if (!topic) {
        topic = {
            topic: topicName,
            flashcardsCount: 0,
            quizzesCount: 0,
            averageScore: 0,
            lastStudied: new Date()
        };
        progress.topicsStudied.push(topic);
    }

    topic.lastStudied = new Date();

    switch (activityType) {
        case 'flashcard':
            if (activityData.isLearned) {
                topic.flashcardsCount += 1;
            }
            break;

        case 'quiz':
            topic.quizzesCount += 1;

            // Update topic average score
            const currentTotal = topic.averageScore * (topic.quizzesCount - 1);
            topic.averageScore = (currentTotal + activityData.percentage) / topic.quizzesCount;
            break;
    }
}

// Update weekly progress
function updateWeeklyProgress(progress, activityType, activityData, timeSpent) {
    const currentWeek = Progress.getCurrentWeek();
    let weekData = progress.weeklyProgress.find(w => w.week === currentWeek);

    if (!weekData) {
        weekData = {
            week: currentWeek,
            studyDays: 0,
            totalSessions: 0,
            totalTime: 0,
            flashcardsLearned: 0,
            quizzesTaken: 0,
            averageScore: 0
        };
        progress.weeklyProgress.unshift(weekData);
    }

    // Check if this is a new study day
    const today = new Date().toDateString();
    const hasStudiedToday = progress.recentSessions.some(session =>
        new Date(session.date).toDateString() === today
    );

    if (!hasStudiedToday) {
        weekData.studyDays += 1;
    }

    weekData.totalSessions += 1;
    weekData.totalTime += timeSpent;

    switch (activityType) {
        case 'flashcard':
            if (activityData.isLearned) {
                weekData.flashcardsLearned += 1;
            }
            break;

        case 'quiz':
            weekData.quizzesTaken += 1;

            // Update weekly average score
            const currentTotal = weekData.averageScore * (weekData.quizzesTaken - 1);
            weekData.averageScore = (currentTotal + activityData.percentage) / weekData.quizzesTaken;
            break;
    }

    // Keep only last 12 weeks
    progress.weeklyProgress = progress.weeklyProgress.slice(0, 12);
}

// Get detailed analytics
export const getAnalytics = async (req, res) => {
    try {
        const userId = req.user.uid;
        const { period = 'week' } = req.query; // week, month, year

        const progress = await Progress.findOne({ userId });

        if (!progress) {
            return res.json({
                totalStats: {
                    flashcardsLearned: 0,
                    quizzesTaken: 0,
                    averageScore: 0,
                    studyTime: 0,
                    currentStreak: 0
                },
                recentActivity: [],
                topTopics: [],
                weeklyProgress: []
            });
        }

        // Calculate period-specific data
        const now = new Date();
        let startDate;

        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        const recentSessions = progress.recentSessions.filter(
            session => new Date(session.date) >= startDate
        );

        const analytics = {
            totalStats: progress.stats,
            recentActivity: recentSessions.slice(0, 10),
            topTopics: progress.topicsStudied
                .sort((a, b) => b.flashcardsCount + b.quizzesCount - (a.flashcardsCount + a.quizzesCount))
                .slice(0, 5),
            weeklyProgress: progress.weeklyProgress.slice(0, 8),
            periodStats: calculatePeriodStats(recentSessions)
        };

        res.json(analytics);

    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
};

// Calculate statistics for a specific period
function calculatePeriodStats(sessions) {
    const stats = {
        flashcardsLearned: 0,
        quizzesTaken: 0,
        totalSessions: sessions.length,
        totalTime: 0,
        averageScore: 0
    };

    let quizScores = [];

    sessions.forEach(session => {
        stats.totalTime += session.timeSpent || 0;

        switch (session.activityType) {
            case 'flashcard':
                if (session.activityData.isLearned) {
                    stats.flashcardsLearned += 1;
                }
                break;

            case 'quiz':
                stats.quizzesTaken += 1;
                if (session.activityData.percentage) {
                    quizScores.push(session.activityData.percentage);
                }
                break;
        }
    });

    if (quizScores.length > 0) {
        stats.averageScore = quizScores.reduce((a, b) => a + b, 0) / quizScores.length;
    }

    return stats;
}

// Get dashboard statistics
export const getDashboardStatistics = async (req, res) => {
    try {
        const userId = req.user.uid;
        console.log('Fetching dashboard statistics for user:', userId);

        // Get progress data
        const progress = await Progress.findOne({ userId });

        // Initialize default stats
        let stats = {
            studySessions: 0,
            cardsCreated: 0,
            quizScore: 0,
            studyStreak: 0
        };

        if (progress) {
            // Calculate study sessions
            stats.studySessions = progress.recentSessions ? progress.recentSessions.length : 0;

            // Calculate study streak
            stats.studyStreak = progress.stats && progress.stats.currentStreak ? progress.stats.currentStreak : 0;

            // Calculate average quiz score
            if (progress.recentSessions) {
                const quizSessions = progress.recentSessions.filter(session =>
                    session.activityType === 'quiz' && session.activityData && session.activityData.score !== undefined
                );

                if (quizSessions.length > 0) {
                    const totalScore = quizSessions.reduce((sum, session) => sum + session.activityData.score, 0);
                    stats.quizScore = Math.round(totalScore / quizSessions.length);
                }
            }
        }

        // Note: cardsCreated will be calculated on frontend from flashcard service
        // since it's stored in a different collection

        res.json(stats);
    } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
};
