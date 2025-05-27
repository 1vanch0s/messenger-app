const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Ожидаем "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Добавляем userId в объект запроса
        next();
    } catch (err) {
        res.status(401).json({ error: 'Недействительный токен' });
    }
};

module.exports = authMiddleware;