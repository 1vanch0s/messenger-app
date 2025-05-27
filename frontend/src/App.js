import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import ChatList from './components/ChatList';
import Chat from './components/Chat';
import './styles/App.css';

function App() {
    const isAuthenticated = !!localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.href = '/login';
    };

    return (
        <Router>
            <div className="app">
                <header className="app-header">
                    <h1>Messenger</h1>
                    <nav className="app-nav">
                        <Link to="/login" class="nav-link">Login</Link>
                        <Link to="/register" class="nav-link">Register</Link>
                        {isAuthenticated && (
                            <>
                                <Link to="/chats" class="nav-link">My Chats</Link>
                                <button className="nav-button" onClick={handleLogout}>
                                    Logout
                                </button>
                            </>
                        )}
                    </nav>
                </header>
                <main className="app-main">
                    <Routes>
                        <Route path="/" element={<div className="welcome">Welcome! Choose an action above.</div>} />
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
                </main>
            </div>
        </Router>
    );
}

export default App;