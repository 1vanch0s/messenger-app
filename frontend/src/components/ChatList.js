import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';
import '../styles/ChatList.css';

const socket = io('http://localhost:5000', {
    auth: {
        token: localStorage.getItem('token'),
    },
});

function ChatList() {
    const [chats, setChats] = useState([]);
    const [newChatName, setNewChatName] = useState('');
    const [memberIds, setMemberIds] = useState([]);
    const [recipientId, setRecipientId] = useState('');
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/chats/my-chats', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                setChats(res.data);
            } catch (err) {
                console.error('Error fetching chats:', err);
            }
        };

        const fetchUsers = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/users', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                setUsers(res.data);
            } catch (err) {
                console.error('Error fetching users:', err);
            }
        };

        fetchChats();
        fetchUsers();

        socket.on('newChat', (newChat) => {
            setChats((prev) => [...prev, newChat]);
        });

        return () => {
            socket.off('newChat');
        };
    }, []);

    const handleCreateGroupChat = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(
                'http://localhost:5000/api/chats/create',
                {
                    name: newChatName,
                    is_group: true,
                    memberIds,
                },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            setChats([...chats, res.data]);
            setNewChatName('');
            setMemberIds([]);
        } catch (err) {
            console.error('Error creating chat:', err);
        }
    };

    const handleCreatePrivateChat = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(
                'http://localhost:5000/api/chats/create-private',
                { recipientId: parseInt(recipientId) },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            setChats([...chats, res.data]);
            setRecipientId('');
        } catch (err) {
            console.error('Error creating private chat:', err);
        }
    };

    const toggleMember = (userId) => {
        setMemberIds((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
    };

    return (
        <div className="chat-list">
            <h2>My Chats</h2>
            <ul className="chat-list-items">
                {chats.map((chat) => (
                    <li key={chat.id} className="chat-list-item">
                        <Link to={`/chat/${chat.id}`} className="chat-link">
                            {chat.name || (chat.is_group ? `Group Chat ${chat.id}` : `Private Chat ${chat.id}`)}
                        </Link>
                    </li>
                ))}
            </ul>
            <div className="chat-form">
                <h3>Create Group Chat</h3>
                <form onSubmit={handleCreateGroupChat}>
                    <input
                        type="text"
                        value={newChatName}
                        onChange={(e) => setNewChatName(e.target.value)}
                        placeholder="Chat name"
                        required
                        className="chat-input"
                    />
                    <div className="user-checkboxes">
                        {users.map((user) => (
                            <label key={user.id} className="user-checkbox">
                                <input
                                    type="checkbox"
                                    checked={memberIds.includes(user.id)}
                                    onChange={() => toggleMember(user.id)}
                                />
                                {user.username}
                            </label>
                        ))}
                    </div>
                    <button type="submit" className="chat-button">Create</button>
                </form>
            </div>
            <div className="chat-form">
                <h3>Start Private Chat</h3>
                <form onSubmit={handleCreatePrivateChat}>
                    <select
                        value={recipientId}
                        onChange={(e) => setRecipientId(e.target.value)}
                        required
                        className="chat-select"
                    >
                        <option value="">Select user</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.username}
                            </option>
                        ))}
                    </select>
                    <button type="submit" className="chat-button">Start Chat</button>
                </form>
            </div>
        </div>
    );
}

export default ChatList;