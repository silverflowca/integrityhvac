import React from 'react';
import './Sidebar.css';

const Sidebar = ({ activeView, onViewChange, leadCount, mobileOpen, onClose }) => {
    const handleNavClick = (view) => {
        onViewChange(view);
        if (onClose) {
            onClose();
        }
    };

    return (
        <aside className={'sidebar ' + (mobileOpen ? 'mobile-open' : '')}>
            <div className="logo">
                <div className="logo-title">SalesTrack Pro</div>
                <div className="logo-subtitle">HVAC Cold Calling</div>
            </div>

            <div className="user-info">
                <div className="user-profile">
                    <div className="user-avatar">MT</div>
                    <div className="user-details">
                        <h3>Mike Thompson</h3>
                        <div className="user-role">Sales Rep</div>
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
                        className={'nav-item ' + (activeView === 'dashboard' ? 'active' : '')}
                        onClick={() => handleNavClick('dashboard')}
                    >
                        <span className="nav-icon">📊</span>
                        Dashboard
                    </div>
                    <div
                        className={'nav-item ' + (activeView === 'call-queue' ? 'active' : '')}
                        onClick={() => handleNavClick('call-queue')}
                    >
                        <span className="nav-icon">📞</span>
                        Call Queue
                    </div>
                </div>

                <div className="nav-section">
                    <div className="nav-section-title">Management</div>
                    <div
                        className={'nav-item ' + (activeView === 'contacts' ? 'active' : '')}
                        onClick={() => handleNavClick('contacts')}
                    >
                        <span className="nav-icon">👥</span>
                        Contacts
                    </div>
                    <div
                        className={'nav-item ' + (activeView === 'reports' ? 'active' : '')}
                        onClick={() => handleNavClick('reports')}
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
