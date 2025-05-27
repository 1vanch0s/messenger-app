import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:5000', {
    auth: {
        token: localStorage.getItem('token'),
    },
});

function Chat() {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [chatId] = useState('1'); // Тестовый chatId
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        // Проверяем подключение
        socket.on('connect_error', (err) => {
            console.error('Connection error:', err.message);
            alert('Ошибка подключения: ' + err.message);
        });

        // Присоединяемся к чату
        socket.emit('joinChat', chatId);

        // Получаем сообщения
        socket.on('message', (newMessage) => {
            setMessages((prev) => [...prev, newMessage]);
        });

        return () => {
            socket.off('message');
            socket.off('connect_error');
        };
    }, [chatId]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('sendMessage', { chatId, content: message });
            setMessage('');
        }
    };

    return (
        <div>
            <h2>Чат</h2>
            <div style={{ border: '1px solid #ccc', padding: '10px', height: '300px', overflowY: 'scroll' }}>
                {messages.map((msg) => (
                    <p key={msg.id}>
                        <strong>{msg.username}:</strong> {msg.content}{' '}
                        <em>({new Date(msg.created_at).toLocaleTimeString()})</em>
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