const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./src/routes/auth');
const pool = require('./src/config/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000', // Разрешаем запросы с frontend
        methods: ['GET', 'POST'],
    },
});

app.use(cors());
app.use(express.json());

// Подключаем маршруты
app.use('/api/auth', authRoutes);

// Тестовый маршрут
app.get('/', (req, res) => {
    res.send('Messenger Backend');
});

// WebSocket события
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Присоединение к чату
    socket.on('joinChat', (chatId) => {
        socket.join(chatId);
        console.log(`User ${socket.id} joined chat ${chatId}`);
    });

    // Отправка сообщения
    socket.on('sendMessage', async ({ chatId, userId, content }) => {
        try {
            // Сохраняем сообщение в базе
            const newMessage = await pool.query(
                'INSERT INTO messages (chat_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
                [chatId, userId, content]
            );

            // Отправляем сообщение всем в чате
            io.to(chatId).emit('message', {
                id: newMessage.rows[0].id,
                chatId,
                userId,
                content,
                created_at: newMessage.rows[0].created_at,
            });
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});