import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = ({ activeView, onViewChange, leadCount, mobileOpen, onClose, isCollapsed, onToggleCollapse }) => {
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

    const sidebarClasses = [
        'sidebar',
        mobileOpen ? 'mobile-open' : '',
        isCollapsed ? 'collapsed' : ''
    ].filter(Boolean).join(' ');

    return (
        <aside className={sidebarClasses}>
            <div className="logo">
                <div className="logo-title">{isCollapsed ? 'ST' : 'SalesTrack Pro'}</div>
                {!isCollapsed && <div className="logo-subtitle">HVAC Cold Calling</div>}
                <button
                    className="collapse-btn"
                    onClick={onToggleCollapse}
                    title={isCollapsed ? 'Expand menu' : 'Collapse menu'}
                >
                    {isCollapsed ? '»' : '«'}
                </button>
            </div>

            <div className="user-info">
                <div className="user-profile">
                    <div className="user-avatar" title={displayName}>{getInitials(displayName)}</div>
                    {!isCollapsed && (
                        <div className="user-details">
                            <h3>{displayName}</h3>
                            <div className="user-role">{displayEmail}</div>
                        </div>
                    )}
                </div>
            </div>

            <nav className="nav-menu">
                <div className="nav-section">
                    <div
                        className={'nav-item ' + (activeView === 'leads' ? 'active' : '')}
                        onClick={() => handleNavClick('leads')}
                        title={isCollapsed ? 'All Leads' : ''}
                    >
                        <span className="nav-icon">📋</span>
                        {!isCollapsed && <span className="nav-text">All Leads</span>}
                        {!isCollapsed && <span className="nav-badge">{leadCount}</span>}
                        {isCollapsed && leadCount > 0 && <span className="nav-badge-mini">{leadCount}</span>}
                    </div>
                    <div
                        className={'nav-item ' + (activeView === 'my-leads' ? 'active' : '')}
                        onClick={() => handleNavClick('my-leads')}
                        title={isCollapsed ? 'My Leads' : ''}
                    >
                        <span className="nav-icon">🎯</span>
                        {!isCollapsed && <span className="nav-text">My Leads</span>}
                    </div>
                    <div
                        className={'nav-item ' + (activeView === 'dashboard' ? 'active' : '')}
                        onClick={() => handleNavClick('dashboard')}
                        title={isCollapsed ? 'My Dashboard' : ''}
                    >
                        <span className="nav-icon">📊</span>
                        {!isCollapsed && <span className="nav-text">My Dashboard</span>}
                    </div>
                    <div
                        className={'nav-item ' + (activeView === 'team-dashboard' ? 'active' : '')}
                        onClick={() => handleNavClick('team-dashboard')}
                        title={isCollapsed ? 'Team Dashboard' : ''}
                    >
                        <span className="nav-icon">👥</span>
                        {!isCollapsed && <span className="nav-text">Team Dashboard</span>}
                    </div>
                    <div
                        className="nav-item disabled"
                        title={isCollapsed ? 'Call Queue (Coming soon)' : 'Coming soon'}
                    >
                        <span className="nav-icon">📞</span>
                        {!isCollapsed && <span className="nav-text">Call Queue</span>}
                    </div>
                    <div
                        className={'nav-item ' + (activeView === 'campaigns' ? 'active' : '')}
                        onClick={() => handleNavClick('campaigns')}
                        title={isCollapsed ? 'Campaigns' : ''}
                    >
                        <span className="nav-icon">📁</span>
                        {!isCollapsed && <span className="nav-text">Campaigns</span>}
                    </div>
                </div>

                <div className="nav-section">
                    {!isCollapsed && <div className="nav-section-title">Management</div>}
                    {displayRole === 'admin' && (
                        <div
                            className={'nav-item ' + (activeView === 'users' ? 'active' : '')}
                            onClick={() => handleNavClick('users')}
                            title={isCollapsed ? 'User Management' : ''}
                        >
                            <span className="nav-icon">👤</span>
                            {!isCollapsed && <span className="nav-text">User Management</span>}
                        </div>
                    )}
                    <div
                        className="nav-item disabled"
                        title={isCollapsed ? 'Contacts (Coming soon)' : 'Coming soon'}
                    >
                        <span className="nav-icon">👥</span>
                        {!isCollapsed && <span className="nav-text">Contacts</span>}
                    </div>
                    <div
                        className="nav-item disabled"
                        title={isCollapsed ? 'Reports (Coming soon)' : 'Coming soon'}
                    >
                        <span className="nav-icon">📈</span>
                        {!isCollapsed && <span className="nav-text">Reports</span>}
                    </div>
                    <div
                        className={'nav-item ' + (activeView === 'automation' ? 'active' : '')}
                        onClick={() => handleNavClick('automation')}
                        title={isCollapsed ? 'Automation' : ''}
                    >
                        <span className="nav-icon">⚡</span>
                        {!isCollapsed && <span className="nav-text">Automation</span>}
                    </div>
                    <div
                        className={'nav-item ' + (activeView === 'settings' ? 'active' : '')}
                        onClick={() => handleNavClick('settings')}
                        title={isCollapsed ? 'Settings' : ''}
                    >
                        <span className="nav-icon">⚙️</span>
                        {!isCollapsed && <span className="nav-text">Settings</span>}
                    </div>
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar;
