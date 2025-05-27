const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Настройка multer для хранения файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|mp4/;
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = fileTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Только изображения (jpg, jpeg, png) и видео (mp4) разрешены'));
    },
});

// Загрузка медиафайла
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
    const { chatId } = req.body;
    const userId = req.user.userId;

    if (!chatId || !req.file) {
        return res.status(400).json({ error: 'chatId и файл обязательны' });
    }

    try {
        const newMessage = await pool.query(
            'INSERT INTO messages (chat_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
            [chatId, userId, '']
        );

        const fileUrl = `/uploads/${req.file.filename}`;
        const fileType = req.file.mimetype.startsWith('image') ? 'image' : 'video';
        await pool.query(
            'INSERT INTO media_files (message_id, file_url, file_type) VALUES ($1, $2, $3)',
            [newMessage.rows[0].id, fileUrl, fileType]
        );

        const user = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);

        const io = req.app.get('io');
        io.to(chatId).emit('message', {
            id: newMessage.rows[0].id,
            chat_id: chatId,
            user_id: userId,
            username: user.rows[0].username,
            content: '',
            created_at: newMessage.rows[0].created_at,
            file_url: fileUrl,
            file_type: fileType,
        });

        res.json({ message: 'Файл загружен', file_url: fileUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение истории сообщений
router.get('/history/:chatId', authMiddleware, async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.userId;

    try {
        const isMember = await pool.query(
            'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
            [chatId, userId]
        );
        if (!isMember.rows.length) {
            return res.status(403).json({ error: 'Доступ к чату запрещён' });
        }

        const messages = await pool.query(
            `SELECT m.id, m.chat_id, m.user_id, u.username, m.content, m.created_at,
                    mf.file_url, mf.file_type,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', r.id,
                                'user_id', r.user_id,
                                'username', ru.username,
                                'reaction_type', r.reaction_type,
                                'created_at', r.created_at
                            )
                        ) FILTER (WHERE r.id IS NOT NULL),
                        '[]'
                    ) as reactions
             FROM messages m
             JOIN users u ON m.user_id = u.id
             LEFT JOIN media_files mf ON m.id = mf.message_id
             LEFT JOIN reactions r ON m.id = r.message_id
             LEFT JOIN users ru ON r.user_id = ru.id
             WHERE m.chat_id = $1
             GROUP BY m.id, u.username, mf.file_url, mf.file_type
             ORDER BY m.created_at ASC`,
            [chatId]
        );

        res.json(messages.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Поиск сообщений
router.get('/search/:chatId', authMiddleware, async (req, res) => {
    const { chatId } = req.params;
    const { query } = req.query;
    const userId = req.user.userId;

    if (!query) {
        return res.status(400).json({ error: 'Запрос поиска обязателен' });
    }

    try {
        const isMember = await pool.query(
            'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
            [chatId, userId]
        );
        if (!isMember.rows.length) {
            return res.status(403).json({ error: 'Доступ к чату запрещён' });
        }

        const messages = await pool.query(
            `SELECT m.id, m.chat_id, m.user_id, u.username, m.content, m.created_at,
                    mf.file_url, mf.file_type,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', r.id,
                                'user_id', r.user_id,
                                'username', ru.username,
                                'reaction_type', r.reaction_type,
                                'created_at', r.created_at
                            )
                        ) FILTER (WHERE r.id IS NOT NULL),
                        '[]'
                    ) as reactions
             FROM messages m
             JOIN users u ON m.user_id = u.id
             LEFT JOIN media_files mf ON m.id = mf.message_id
             LEFT JOIN reactions r ON m.id = r.message_id
             LEFT JOIN users ru ON r.user_id = ru.id
             WHERE m.chat_id = $1 AND m.content ILIKE $2
             GROUP BY m.id, u.username, mf.file_url, mf.file_type
             ORDER BY m.created_at ASC`,
            [chatId, `%${query}%`]
        );

        res.json(messages.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавление/удаление реакции
router.post('/react', authMiddleware, async (req, res) => {
    const { messageId, reactionType } = req.body;
    const userId = req.user.userId;

    if (!messageId || !['like', 'heart', 'dislike', 'laugh'].includes(reactionType)) {
        return res.status(400).json({ error: 'Неверные параметры' });
    }

    try {
        // Проверяем, есть ли уже такая реакция
        const existingReaction = await pool.query(
            'SELECT id FROM reactions WHERE message_id = $1 AND user_id = $2 AND reaction_type = $3',
            [messageId, userId, reactionType]
        );

        let reaction;
        if (existingReaction.rows.length) {
            // Удаляем реакцию
            reaction = await pool.query(
                'DELETE FROM reactions WHERE id = $1 RETURNING *',
                [existingReaction.rows[0].id]
            );
        } else {
            // Добавляем реакцию
            reaction = await pool.query(
                'INSERT INTO reactions (message_id, user_id, reaction_type) VALUES ($1, $2, $3) RETURNING *',
                [messageId, userId, reactionType]
            );
        }

        // Получаем информацию о пользователе
        const user = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);

        // Получаем chat_id сообщения
        const message = await pool.query('SELECT chat_id FROM messages WHERE id = $1', [messageId]);

        // Отправляем обновление через WebSocket
        const io = req.app.get('io');
        io.to(message.rows[0].chat_id).emit('reaction', {
            messageId,
            reaction: {
                id: reaction.rows[0].id,
                user_id: userId,
                username: user.rows[0].username,
                reaction_type: reactionType,
                created_at: reaction.rows[0].created_at,
            },
            isAdded: !existingReaction.rows.length,
        });

        res.json({ message: existingReaction.rows.length ? 'Реакция удалена' : 'Реакция добавлена' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }

    
});

// Отметить сообщения как просмотренные
router.post('/view', authMiddleware, async (req, res) => {
    const { chatId, lastMessageId } = req.body;
    const userId = req.user.userId;

    if (!chatId || !lastMessageId) {
        return res.status(400).json({ error: 'chatId и lastMessageId обязательны' });
    }

    try {
        // Проверяем, является ли пользователь участником чата
        const isMember = await pool.query(
            'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
            [chatId, userId]
        );
        if (!isMember.rows.length) {
            return res.status(403).json({ error: 'Доступ к чату запрещён' });
        }

        // Обновляем или создаём запись в message_views
        await pool.query(
            `INSERT INTO message_views (chat_id, user_id, last_viewed_message_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (chat_id, user_id)
             DO UPDATE SET last_viewed_message_id = EXCLUDED.last_viewed_message_id`,
            [chatId, userId, lastMessageId]
        );

        res.json({ message: 'Просмотры обновлены' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;