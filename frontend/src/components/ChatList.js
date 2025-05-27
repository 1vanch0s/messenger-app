import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';

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

    return (
        <div>
            <h2>Мои чаты</h2>
            <ul>
                {chats.map((chat) => (
                    <li key={chat.id}>
                        <Link to={`/chat/${chat.id}`}>
                            {chat.name || (chat.is_group ? `Чат ${chat.id}` : `Личный чат ${chat.id}`)}
                        </Link>
                    </li>
                ))}
            </ul>
            <h3>Создать групповой чат</h3>
            <form onSubmit={handleCreateGroupChat}>
                <input
                    type="text"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    placeholder="Название чата"
                    required
                />
                <select
                    multiple
                    value={memberIds}
                    onChange={(e) =>
                        setMemberIds(
                            Array.from(e.target.selectedOptions, (option) => parseInt(option.value))
                        )
                    }
                >
                    {users.map((user) => (
                        <option key={user.id} value={user.id}>
                            {user.username}
                        </option>
                    ))}
                </select>
                <button type="submit">Создать</button>
            </form>
            <h3>Написать личное сообщение</h3>
            <form onSubmit={handleCreatePrivateChat}>
                <select
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    required
                >
                    <option value="">Выберите пользователя</option>
                    {users.map((user) => (
                        <option key={user.id} value={user.id}>
                            {user.username}
                        </option>
                    ))}
                </select>
                <button type="submit">Начать чат</button>
            </form>
        </div>
    );
}

export default ChatList;