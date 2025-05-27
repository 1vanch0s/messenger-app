import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';

function App() {
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
                    <Link to="/chat" style={{ margin: '10px' }}>
                        <button>Чат</button>
                    </Link>
                </nav>
                <Routes>
                    <Route path="/" element={<h2>Добро пожаловать! Выберите действие выше.</h2>} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/chat" element={<Chat />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;