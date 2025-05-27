import React, { useState, useEffect, useRef } from 'react';
    import { useParams } from 'react-router-dom';
    import io from 'socket.io-client';
    import axios from 'axios';
    import '../styles/Chat.css';

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
        const messagesEndRef = useRef(null);

        useEffect(() => {
            const fetchHistory = async () => {
                try {
                    const res = await axios.get(`http://localhost:5000/api/messages/history/${chatId}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                    });
                    setMessages(res.data);
                } catch (err) {
                    console.error('Error fetching history:', err);
                    alert('Error loading history');
                }
            };

            fetchHistory();

            socket.on('connect_error', (err) => {
                console.error('Connection error:', err.message);
                alert('Connection error: ' + err.message);
            });

            socket.emit('joinChat', chatId);

            socket.on('message', (newMessage) => {
                setMessages((prev) => [...prev, newMessage]);
            });

            socket.on('reaction', ({ messageId, reaction, isAdded }) => {
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        msg.id === messageId
                            ? {
                                  ...msg,
                                  reactions: isAdded
                                      ? [...msg.reactions, reaction]
                                      : msg.reactions.filter((r) => r.id !== reaction.id),
                              }
                            : msg
                    )
                );
            });

            return () => {
                socket.off('message');
                socket.off('reaction');
                socket.off('connect_error');
            };
        }, [chatId]);

        useEffect(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, [messages]);

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
                alert('Error uploading file');
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
                alert('Search error');
            }
        };

        const handleReaction = async (messageId, reactionType) => {
            try {
                await axios.post(
                    'http://localhost:5000/api/messages/react',
                    {
                        messageId,
                        reactionType,
                    },
                    {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                    }
                );
            } catch (err) {
                console.error('Error reacting:', err);
                alert('Error adding reaction');
            }
        };

        const reactionEmojis = {
            like: '👍',
            heart: '❤️',
            dislike: '👎',
            laugh: '😂',
        };

        return (
            <div className="chat">
                <h2>Chat {chatId}</h2>
                <form className="chat-search" onSubmit={handleSearch}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search messages"
                        className="chat-search-input"
                    />
                    <button type="submit" className="chat-search-button">
                        Search
                    </button>
                </form>
                <div className="chat-messages">
                    {messages.map((msg) => (
                        <div key={msg.id} className="chat-message">
                            <div className="message-header">
                                <strong>{msg.username}</strong>
                                <span className="message-time">
                                    {new Date(msg.created_at).toLocaleTimeString()}
                                </span>
                            </div>
                            {msg.content && msg.content.trim() && (
                                <div className="message-content">{msg.content}</div>
                            )}
                            {msg.file_url && (
                                <div className="message-media">
                                    {msg.file_type === 'image' ? (
                                        <img
                                            src={`http://localhost:5000${msg.file_url}`}
                                            alt="media"
                                            className="media-image"
                                        />
                                    ) : (
                                        <video
                                            src={`http://localhost:5000${msg.file_url}`}
                                            controls
                                            className="media-video"
                                        />
                                    )}
                                </div>
                            )}
                            <div className="message-reactions">
                                {Object.keys(reactionEmojis).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => handleReaction(msg.id, type)}
                                        className="reaction-button"
                                        title={type}
                                    >
                                        {reactionEmojis[type]}
                                    </button>
                                ))}
                            </div>
                            <div className="reactions-list">
                                {msg.reactions &&
                                    msg.reactions.map((r) => (
                                        <span
                                            key={r.id}
                                            className="reaction-item"
                                            title={`${r.username}: ${r.reaction_type}`}
                                        >
                                            {reactionEmojis[r.reaction_type]} {r.username}
                                        </span>
                                    ))}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <form className="chat-form" onSubmit={handleSendMessage}>
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type a message"
                        className="chat-input"
                    />
                    <button type="submit" className="chat-button">
                        Send
                    </button>
                </form>
                <form className="chat-form" onSubmit={handleFileUpload}>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,video/mp4"
                        onChange={(e) => setFile(e.target.files[0])}
                        className="chat-file-input"
                    />
                    <button type="submit" disabled={!file} className="chat-button">
                        Upload File
                    </button>
                </form>
            </div>
        );
    }

    export default Chat;