const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Создание чата
router.post('/create', authMiddleware, async (req, res) => {
    const { name, is_group, memberIds } = req.body;
    const userId = req.user.userId;

    if (!name && is_group) {
        return res.status(400).json({ error: 'Название обязательно для группового чата' });
    }

    try {
        // Создаём чат
        const newChat = await pool.query(
            'INSERT INTO chats (name, is_group) VALUES ($1, $2) RETURNING *',
            [name || null, is_group || false]
        );
        const chatId = newChat.rows[0].id;

        // Собираем всех участников, включая создателя
        const allMemberIds = [userId, ...(is_group && memberIds ? memberIds : [])];

        // Добавляем участников
        for (const memberId of allMemberIds) {
            if (memberId) {
                const existingMember = await pool.query(
                    'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
                    [chatId, memberId]
                );
                if (!existingMember.rows.length) {
                    await pool.query(
                        'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2)',
                        [chatId, memberId]
                    );
                }
            }
        }

        // Уведомляем участников о новом чате
        const io = req.app.get('io'); // Получаем io из app
        io.emit('newChat', { chatId, userIds: allMemberIds.filter(id => id !== userId) });

        res.status(201).json(newChat.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение списка чатов пользователя
router.get('/my-chats', authMiddleware, async (req, res) => {
    const userId = req.user.userId;

    try {
        const chats = await pool.query(
            'SELECT c.* FROM chats c JOIN chat_members cm ON c.id = cm.chat_id WHERE cm.user_id = $1',
            [userId]
        );
        res.json(chats.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создание личного чата
router.post('/create-private', authMiddleware, async (req, res) => {
    const { recipientId } = req.body;
    const userId = req.user.userId;

    if (!recipientId) {
        return res.status(400).json({ error: 'ID получателя обязателен' });
    }

    try {
        // Проверяем, существует ли уже личный чат между пользователями
        const existingChat = await pool.query(
            `SELECT c.id
             FROM chats c
             JOIN chat_members cm1 ON c.id = cm1.chat_id
             JOIN chat_members cm2 ON c.id = cm2.chat_id
             WHERE c.is_group = FALSE
             AND cm1.user_id = $1 AND cm2.user_id = $2`,
            [userId, recipientId]
        );

        if (existingChat.rows.length > 0) {
            return res.json(existingChat.rows[0]);
        }

        // Создаём новый личный чат
        const newChat = await pool.query(
            'INSERT INTO chats (is_group) VALUES (FALSE) RETURNING *'
        );
        const chatId = newChat.rows[0].id;

        // Добавляем пользователей
        await pool.query(
            'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)',
            [chatId, userId, recipientId]
        );

        // Уведомляем участников
        const io = req.app.get('io');
        io.emit('newChat', { chatId, userIds: [userId, recipientId] });

        res.status(201).json(newChat.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;