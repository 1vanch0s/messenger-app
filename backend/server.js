const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./src/routes/auth');
const chatRoutes = require('./src/routes/chats');
const pool = require('./src/config/db');
const jwt = require('jsonwebtoken');
const usersRoutes = require('./src/routes/users');
require('dotenv').config();


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});

app.use(cors());
app.use(express.json());
app.set('io', io);

// Подключаем маршруты
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/users', usersRoutes);

// Тестовый маршрут
app.get('/', (req, res) => {
    res.send('Messenger Backend');
});

// WebSocket события с проверкой токена
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Токен не предоставлен'));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error('Недействительный токен'));
    }
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id, 'User:', socket.user.userId);

    // Присоединение к чату
    socket.on('joinChat', (chatId) => {
        socket.join(chatId);
        console.log(`User ${socket.user.userId} joined chat ${chatId}`);
    });

    // Отправка сообщения
    socket.on('sendMessage', async ({ chatId, content }) => {
        try {
            const newMessage = await pool.query(
                'INSERT INTO messages (chat_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
                [chatId, socket.user.userId, content]
            );

            const user = await pool.query('SELECT username FROM users WHERE id = $1', [socket.user.userId]);

            io.to(chatId).emit('message', {
                id: newMessage.rows[0].id,
                chatId,
                userId: socket.user.userId,
                username: user.rows[0].username,
                content,
                created_at: newMessage.rows[0].created_at,
            });
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    // Уведомление о новом чате
    socket.on('newChat', async ({ chatId, userIds }) => {
        try {
            const chat = await pool.query('SELECT * FROM chats WHERE id = $1', [chatId]);
            for (const userId of userIds) {
                socket.to(`user:${userId}`).emit('newChat', chat.rows[0]);
            }
        } catch (err) {
            console.error('Error notifying new chat:', err);
        }
    });

    // Подключаем пользователя к его персональной комнате
    socket.join(`user:${socket.user.userId}`);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});