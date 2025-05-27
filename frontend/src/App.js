import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import ChatList from './components/ChatList';

function App() {
    const isAuthenticated = !!localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.href = '/login';
    };

    return (
        <Router>
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <h1>Messenger App</h1>
                <nav>
                    <Link to="/login" style={{ margin: '10px' }}>
                        <button>Вход</button>
                    </Link>
                    <Link to="/register" style={{ margin: '10px' }}>
                        <button>Регистрация</button>
                    </Link>
                    {isAuthenticated && (
                        <>
                            <Link to="/chats" style={{ margin: '10px' }}>
                                <button>Мои чаты</button>
                            </Link>
                            <button onClick={handleLogout} style={{ margin: '10px' }}>
                                Выход
                            </button>
                        </>
                    )}
                </nav>
                <Routes>
                    <Route path="/" element={<h2>Добро пожаловать! Выберите действие выше.</h2>} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                        path="/chats"
                        element={isAuthenticated ? <ChatList /> : <Navigate to="/login" />}
                    />
                    <Route
                        path="/chat/:chatId"
                        element={isAuthenticated ? <Chat /> : <Navigate to="/login" />}
                    />
                </Routes>
            </div>
        </Router>
    );
}

export default App;