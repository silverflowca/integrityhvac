import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = ({ activeView, onViewChange, leadCount, mobileOpen, onClose }) => {
    const { user, profile } = useAuth();

    const handleNavClick = (view) => {
        onViewChange(view);
        if (onClose) {
            onClose();
        }
    };

    // Generate initials from user name
    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Get display name from profile or user metadata or email
    const displayName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
    const displayEmail = user?.email || '';
    const displayRole = profile?.role || user?.user_metadata?.role || 'user';

    return (
        <aside className={'sidebar ' + (mobileOpen ? 'mobile-open' : '')}>
            <div className="logo">
                <div className="logo-title">SalesTrack Pro</div>
                <div className="logo-subtitle">HVAC Cold Calling</div>
            </div>

            <div className="user-info">
                <div className="user-profile">
                    <div className="user-avatar">{getInitials(displayName)}</div>
                    <div className="user-details">
                        <h3>{displayName}</h3>
                        <div className="user-role">{displayEmail}</div>
                    </div>
                </div>
            </div>

            <nav className="nav-menu">
                <div className="nav-section">
                    <div
                        className={'nav-item ' + (activeView === 'leads' ? 'active' : '')}
                        onClick={() => handleNavClick('leads')}
                    >
                        <span className="nav-icon">📋</span>
                        All Leads
                        <span className="nav-badge">{leadCount}</span>
                    </div>
                    <div
                        className={'nav-item ' + (activeView === 'my-leads' ? 'active' : '')}
                        onClick={() => handleNavClick('my-leads')}
                    >
                        <span className="nav-icon">🎯</span>
                        My Leads
                    </div>
                    <div
                        className={'nav-item ' + (activeView === 'dashboard' ? 'active' : '')}
                        onClick={() => handleNavClick('dashboard')}
                    >
                        <span className="nav-icon">📊</span>
                        My Dashboard
                    </div>
                    <div
                        className={'nav-item ' + (activeView === 'team-dashboard' ? 'active' : '')}
                        onClick={() => handleNavClick('team-dashboard')}
                    >
                        <span className="nav-icon">👥</span>
                        Team Dashboard
                    </div>
                    <div
                        className="nav-item disabled"
                        title="Coming soon"
                    >
                        <span className="nav-icon">📞</span>
                        Call Queue
                    </div>
                    <div
                        className={'nav-item ' + (activeView === 'campaigns' ? 'active' : '')}
                        onClick={() => handleNavClick('campaigns')}
                    >
                        <span className="nav-icon">📁</span>
                        Campaigns
                    </div>
                </div>

                <div className="nav-section">
                    <div className="nav-section-title">Management</div>
                    {displayRole === 'admin' && (
                        <div
                            className={'nav-item ' + (activeView === 'users' ? 'active' : '')}
                            onClick={() => handleNavClick('users')}
                        >
                            <span className="nav-icon">👤</span>
                            User Management
                        </div>
                    )}
                    <div
                        className="nav-item disabled"
                        title="Coming soon"
                    >
                        <span className="nav-icon">👥</span>
                        Contacts
                    </div>
                    <div
                        className="nav-item disabled"
                        title="Coming soon"
                    >
                        <span className="nav-icon">📈</span>
                        Reports
                    </div>
                    <div
                        className={'nav-item ' + (activeView === 'automation' ? 'active' : '')}
                        onClick={() => handleNavClick('automation')}
                    >
                        <span className="nav-icon">⚡</span>
                        Automation
                    </div>
                    <div
                        className={'nav-item ' + (activeView === 'settings' ? 'active' : '')}
                        onClick={() => handleNavClick('settings')}
                    >
                        <span className="nav-icon">⚙️</span>
                        Settings
                    </div>
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar;
