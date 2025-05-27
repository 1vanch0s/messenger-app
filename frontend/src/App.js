import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

function App() {
    return (
        <Router>
            <div>
                <h1>Messenger App</h1>
                <Routes>
                    <Route path="/" element={<h2>Home Page</h2>} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;