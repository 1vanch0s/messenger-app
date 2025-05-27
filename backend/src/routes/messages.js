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
        // Сохраняем сообщение
        const newMessage = await pool.query(
            'INSERT INTO messages (chat_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
            [chatId, userId, '']
        );

        // Сохраняем информацию о файле
        const fileUrl = `/uploads/${req.file.filename}`;
        const fileType = req.file.mimetype.startsWith('image') ? 'image' : 'video';
        await pool.query(
            'INSERT INTO media_files (message_id, file_url, file_type) VALUES ($1, $2, $3)',
            [newMessage.rows[0].id, fileUrl, fileType]
        );

        // Получаем username
        const user = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);

        // Отправляем сообщение через WebSocket
        const io = req.app.get('io');
        io.to(chatId).emit('message', {
            id: newMessage.rows[0].id,
            chatId,
            userId,
            username: user.rows[0].username,
            content: '',
            fileUrl,
            fileType,
            created_at: newMessage.rows[0].created_at,
        });

        res.json({ message: 'Файл загружен', fileUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;