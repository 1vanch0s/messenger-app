const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const authRoutes = require('./src/routes/auth');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// Подключаем маршруты
app.use('/api/auth', authRoutes);

// Тестовый маршрут
app.get('/', (req, res) => {
    res.send('Messenger Backend');
});

// WebSocket соединение
wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('message', (message) => {
        console.log('Received:', message.toString());
        ws.send('Message received');
    });
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});