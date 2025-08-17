import express from 'express';
import {
    saveChat,
    getUserChats,
    updateChat,
    deleteChat,
    getChatById
} from '../controllers/chatController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// POST /api/chats - Save new chat
router.post('/', saveChat);

// GET /api/chats - Get all chats for user
router.get('/', getUserChats);

// GET /api/chats/:chatId - Get specific chat
router.get('/:chatId', getChatById);

// PUT /api/chats/:chatId - Update chat
router.put('/:chatId', updateChat);

// DELETE /api/chats/:chatId - Delete chat
router.delete('/:chatId', deleteChat);

export default router;
