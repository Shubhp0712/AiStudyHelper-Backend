import Chat from '../models/Chat.js';

// Save new chat
export const saveChat = async (req, res) => {
    try {
        const { title, messages } = req.body;
        const userId = req.user.uid;

        const newChat = new Chat({
            userId,
            title,
            messages,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const savedChat = await newChat.save();
        res.status(201).json(savedChat);
    } catch (error) {
        console.error('Error saving chat:', error);
        res.status(500).json({ error: 'Failed to save chat' });
    }
};

// Get all chats for user
export const getUserChats = async (req, res) => {
    try {
        const userId = req.user.uid;

        const chats = await Chat.find({ userId })
            .sort({ updatedAt: -1 })
            .limit(50) // Limit to 50 most recent chats
            .select('_id title messages createdAt updatedAt');

        // Add lastMessage field for each chat
        const chatsWithLastMessage = chats.map(chat => ({
            ...chat.toObject(),
            lastMessage: chat.messages.length > 0
                ? chat.messages[chat.messages.length - 1].text.substring(0, 100) + '...'
                : 'No messages'
        }));

        res.json({ chats: chatsWithLastMessage });
    } catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
};

// Update existing chat
export const updateChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { title, messages } = req.body;
        const userId = req.user.uid;

        const updatedChat = await Chat.findOneAndUpdate(
            { _id: chatId, userId },
            {
                title,
                messages,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!updatedChat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        res.json(updatedChat);
    } catch (error) {
        console.error('Error updating chat:', error);
        res.status(500).json({ error: 'Failed to update chat' });
    }
};

// Delete chat
export const deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.uid;

        const deletedChat = await Chat.findOneAndDelete({ _id: chatId, userId });

        if (!deletedChat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        res.json({ message: 'Chat deleted successfully' });
    } catch (error) {
        console.error('Error deleting chat:', error);
        res.status(500).json({ error: 'Failed to delete chat' });
    }
};

// Get specific chat by ID
export const getChatById = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.uid;

        const chat = await Chat.findOne({ _id: chatId, userId });

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        res.json(chat);
    } catch (error) {
        console.error('Error fetching chat:', error);
        res.status(500).json({ error: 'Failed to fetch chat' });
    }
};
