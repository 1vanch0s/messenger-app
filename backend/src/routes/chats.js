const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Создание группового чата
router.post('/create', authMiddleware, async (req, res) => {
    const { name, is_group, memberIds } = req.body;
    const userId = req.user.userId;

    if (!name || !is_group || !Array.isArray(memberIds) || !memberIds.includes(userId)) {
        return res.status(400).json({ error: 'Неверные параметры' });
    }

    try {
        const newChat = await pool.query(
            'INSERT INTO chats (name, is_group, created_by) VALUES ($1, $2, $3) RETURNING *',
            [name, is_group, userId]
        );

        const chatId = newChat.rows[0].id;
        const values = memberIds.map((memberId) => `(${chatId}, ${memberId})`).join(',');
        await pool.query(`INSERT INTO chat_members (chat_id, user_id) VALUES ${values}`);

        const io = req.app.get('io');
        io.emit('newChat', newChat.rows[0]);

        res.json(newChat.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создание личного чата
router.post('/create-private', authMiddleware, async (req, res) => {
    const { recipientId } = req.body;
    const userId = req.user.userId;

    if (!recipientId || recipientId === userId) {
        return res.status(400).json({ error: 'Неверный recipientId' });
    }

    try {
        const existingChat = await pool.query(
            `SELECT c.id FROM chats c
             JOIN chat_members cm1 ON c.id = cm1.chat_id AND cm1.user_id = $1
             JOIN chat_members cm2 ON c.id = cm2.chat_id AND cm2.user_id = $2
             WHERE c.is_group = false`,
            [userId, recipientId]
        );

        if (existingChat.rows.length) {
            return res.json(existingChat.rows[0]);
        }

        const newChat = await pool.query(
            'INSERT INTO chats (is_group, created_by) VALUES (false, $1) RETURNING *',
            [userId]
        );

        const chatId = newChat.rows[0].id;
        await pool.query(
            'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)',
            [chatId, userId, recipientId]
        );

        const io = req.app.get('io');
        io.emit('newChat', newChat.rows[0]);

        res.json(newChat.rows[0]);
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
            `SELECT c.id, c.name, c.is_group,
                    COALESCE(
                        (SELECT COUNT(*)::INTEGER
                         FROM messages m
                         LEFT JOIN message_views mv
                         ON m.chat_id = mv.chat_id AND mv.user_id = $1
                         WHERE m.chat_id = c.id
                         AND (mv.last_viewed_message_id IS NULL OR m.id > mv.last_viewed_message_id)),
                        0
                    ) as unread_count
             FROM chats c
             JOIN chat_members cm ON c.id = cm.chat_id
             WHERE cm.user_id = $1
             ORDER BY c.created_at DESC`,
            [userId]
        );

        res.json(chats.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;