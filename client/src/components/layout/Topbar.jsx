import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Topbar.css';

const Topbar = ({ title, onAddLead, searchTerm, onSearchChange, onOpenSettings, viewMode, onViewModeChange, onToggleMobileMenu }) => {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            logout();
        }
    };

    return (
        <div className="topbar">
            <div style={{ display: 'flex', alignItems: 'center' }}>
                {onToggleMobileMenu && (
                    <button className="mobile-menu-btn" onClick={onToggleMobileMenu} title="Menu">
                        ☰
                    </button>
                )}
                <h1 className="topbar-title">{title}</h1>
            </div>
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

                {viewMode && onViewModeChange && (
                    <div className="view-toggles">
                        <button
                            className={'view-toggle-btn ' + (viewMode === 'card' ? 'active' : '')}
                            onClick={() => onViewModeChange('card')}
                            title="Card View"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                                <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                                <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                                <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                            </svg>
                        </button>
                        <button
                            className={'view-toggle-btn ' + (viewMode === 'list' ? 'active' : '')}
                            onClick={() => onViewModeChange('list')}
                            title="List View"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="8" y1="6" x2="21" y2="6"></line>
                                <line x1="8" y1="12" x2="21" y2="12"></line>
                                <line x1="8" y1="18" x2="21" y2="18"></line>
                                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                <line x1="3" y1="18" x2="3.01" y2="18"></line>
                            </svg>
                        </button>
                        <button
                            className={'view-toggle-btn ' + (viewMode === 'map' ? 'active' : '')}
                            onClick={() => onViewModeChange('map')}
                            title="Map View"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path>
                                <circle cx="12" cy="9" r="2.5"></circle>
                            </svg>
                        </button>
                    </div>
                )}

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
