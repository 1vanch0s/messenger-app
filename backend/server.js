const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const pool = require('./src/config/db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Middleware для передачи io в маршруты
app.set('io', io);

// Маршруты
app.use('/api/users', require('./src/routes/users'));
app.use('/api/chats', require('./src/routes/chats'));
app.use('/api/messages', require('./src/routes/messages'));

// WebSocket
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Токен не предоставлен'));
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error('Неверный токен'));
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.user.userId);

    socket.on('joinChat', (chatId) => {
        socket.join(chatId);
        console.log(`User ${socket.user.userId} joined chat ${chatId}`);
    });

    socket.on('sendMessage', async ({ chatId, content }) => {
    try {
        const newMessage = await pool.query(
            'INSERT INTO messages (chat_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
            [chatId, socket.user.userId, content]
        );

        const user = await pool.query('SELECT username FROM users WHERE id = $1', [socket.user.userId]);

        const chat = await pool.query('SELECT name, is_group FROM chats WHERE id = $1', [chatId]);

        const message = {
            id: newMessage.rows[0].id,
            chat_id: chatId,
            user_id: socket.user.userId,
            username: user.rows[0].username,
            content,
            created_at: newMessage.rows[0].created_at,
            file_url: null,
            file_type: null,
            reactions: [],
        };

        // Отправляем сообщение
        io.to(chatId).emit('message', message);

        // Отправляем уведомление всем участникам чата (кроме отправителя)
        const members = await pool.query(
            'SELECT user_id FROM chat_members WHERE chat_id = $1 AND user_id != $2',
            [chatId, socket.user.userId]
        );
        for (const member of members.rows) {
            io.to(`user:${member.user_id}`).emit('notification', {
                chatId,
                chatName: chat.rows[0].name || (chat.rows[0].is_group ? `Group Chat ${chatId}` : `Private Chat ${chatId}`),
            });
        }
    } catch (err) {
        console.error('Error saving message:', err);
    }
});

socket.on('joinChat', (chatId) => {
    socket.join(chatId);
    socket.join(`user:${socket.user.userId}`); // Подписываемся на уведомления для пользователя
    console.log(`User ${socket.user.userId} joined chat ${chatId}`);
});

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.user.userId);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});