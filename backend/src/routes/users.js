const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Получение списка пользователей
router.get('/', authMiddleware, async (req, res) => {
    try {
        const users = await pool.query('SELECT id, username FROM users WHERE id != $1', [req.user.userId]);
        res.json(users.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;