import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
    auth: {
        token: localStorage.getItem('token'), // Отправляем токен для аутентификации
    },
});

function Chat() {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [chatId] = useState('1'); // Тестовый chatId, позже заменим на динамический
    const userId = localStorage.getItem('userId') || '1'; // Тестовый userId

    useEffect(() => {
        // Присоединяемся к чату
        socket.emit('joinChat', chatId);

        // Получаем сообщения
        socket.on('message', (newMessage) => {
            setMessages((prev) => [...prev, newMessage]);
        });

        return () => {
            socket.off('message');
        };
    }, [chatId]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('sendMessage', { chatId, userId, content: message });
            setMessage('');
        }
    };

    return (
        <div>
            <h2>Чат</h2>
            <div style={{ border: '1px solid #ccc', padding: '10px', height: '300px', overflowY: 'scroll' }}>
                {messages.map((msg) => (
                    <p key={msg.id}>
                        <strong>User {msg.userId}:</strong> {msg.content} <em>({new Date(msg.created_at).toLocaleTimeString()})</em>
                    </p>
                ))}
            </div>
            <form onSubmit={handleSendMessage}>
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Введите сообщение"
                />
                <button type="submit">Отправить</button>
            </form>
        </div>
    );
}

export default Chat;