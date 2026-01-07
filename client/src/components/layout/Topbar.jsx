import React from 'react';
import './Topbar.css';

const Topbar = ({ title, onAddLead, searchTerm, onSearchChange, onOpenSettings }) => {
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
                <button className="btn btn-secondary" onClick={onOpenSettings} title="SIP Settings">
                    ⚙️
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
