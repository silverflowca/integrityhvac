import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Topbar.css';

const Topbar = ({ title, onAddLead, searchTerm, onSearchChange, onOpenSettings }) => {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            logout();
        }
    };

    return (
        <div className="topbar">
            <h1 className="topbar-title">{title}</h1>
            <div className="topbar-actions">
                <div className="search-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="search-box"
                        placeholder="Search leads..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
                <span className="user-info" title={user?.email}>
                    👤 {user?.name}
                </span>
                <button className="btn btn-secondary" onClick={onOpenSettings} title="SIP Settings">
                    ⚙️
                </button>
                <button className="btn btn-secondary" onClick={handleLogout} title="Logout">
                    🚪
                </button>
                <button className="btn btn-primary" onClick={onAddLead}>
                    <span>+</span>
                    Add Lead
                </button>
            </div>
        </div>
    );
};

export default Topbar;
