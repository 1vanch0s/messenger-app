import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:5000', {
    auth: {
        token: localStorage.getItem('token'),
    },
});

function Chat() {
    const { chatId } = useParams();
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [file, setFile] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // Загружаем историю сообщений
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/messages/history/${chatId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                console.log('Fetched history:', res.data); // Логируем данные
                setMessages(res.data);
            } catch (err) {
                console.error('Error fetching history:', err);
                alert('Ошибка загрузки истории');
            }
        };

        fetchHistory();

        socket.on('connect_error', (err) => {
            console.error('Connection error:', err.message);
            alert('Ошибка подключения: ' + err.message);
        });

        socket.emit('joinChat', chatId);

        socket.on('message', (newMessage) => {
            console.log('New WebSocket message:', newMessage); // Логируем сообщение
            setMessages((prev) => [...prev, newMessage]);
        });

        return () => {
            socket.off('message');
            socket.off('connect_error');
        };
    }, [chatId]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('sendMessage', { chatId, content: message });
            setMessage('');
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('chatId', chatId);

        try {
            await axios.post('http://localhost:5000/api/messages/upload', formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            setFile(null);
        } catch (err) {
            console.error('Error uploading file:', err);
            alert('Ошибка загрузки файла');
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            const res = await axios.get(`http://localhost:5000/api/messages/history/${chatId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            setMessages(res.data);
            return;
        }

        try {
            const res = await axios.get(
                `http://localhost:5000/api/messages/search/${chatId}?query=${encodeURIComponent(searchQuery)}`,
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                }
            );
            setMessages(res.data);
        } catch (err) {
            console.error('Error searching messages:', err);
            alert('Ошибка поиска');
        }
    };

    return (
        <div>
            <h2>Чат {chatId}</h2>
            <form onSubmit={handleSearch}>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск сообщений"
                />
                <button type="submit">Найти</button>
            </form>
            <div style={{ border: '1px solid #ccc', padding: '10px', height: '300px', overflowY: 'scroll' }}>
                {messages.map((msg) => (
                    <div key={msg.id}>
                        <strong>{msg.username}:</strong>{' '}
                        {msg.content && msg.content.trim() && <span>{msg.content}</span>}
                        {msg.file_url && (
                            <div>
                                {msg.file_type === 'image' ? (
                                    <img
                                        src={`http://localhost:5000${msg.file_url}`}
                                        alt="media"
                                        style={{ maxWidth: '200px', maxHeight: '200px' }}
                                    />
                                ) : (
                                    <video
                                        src={`http://localhost:5000${msg.file_url}`}
                                        controls
                                        style={{ maxWidth: '200px', maxHeight: '200px' }}
                                    />
                                )}
                            </div>
                        )}
                        <em>({new Date(msg.created_at).toLocaleTimeString()})</em>
                    </div>
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
            <form onSubmit={handleFileUpload}>
                <input
                    type="file"
                    accept="image/jpeg,image/png,video/mp4"
                    onChange={(e) => setFile(e.target.files[0])}
                />
                <button type="submit" disabled={!file}>
                    Загрузить файл
                </button>
            </form>
        </div>
    );
}

export default Chat;