import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './layout/Sidebar';
import Topbar from './layout/Topbar';
import LeadListView from './leads/LeadListView';
import LeadFilters from './leads/LeadFilters';
import LeadForm from './leads/LeadForm';
import PhoneCall from './common/PhoneCall';
import SipSettings from './common/Settings';
import Settings from './settings/Settings';
import IndividualDashboard from './dashboard/IndividualDashboard';
import AdminDashboard from './dashboard/AdminDashboard';
import Campaigns from './campaigns/Campaigns';
import MyLeads from './myleads/MyLeads';
import UserManagement from './users/UserManagement';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import '../App.css';

function CRM() {
    const [leads, setLeads] = useState([]);
    const [filteredLeads, setFilteredLeads] = useState([]);
    const [activeView, setActiveView] = useState('leads');
    const [viewMode] = useState('list'); // Permanently set to list view
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeCall, setActiveCall] = useState(null);
    const [showSipSettings, setShowSipSettings] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const [currentPageState, setCurrentPageState] = useState(1);
    const preservePageRef = useRef(false);
    const [filters, setFilters] = useState({
        status: 'all',
        priority: 'all',
        campaign: 'all',
        sortBy: 'newest',
        groupBy: 'none'
    });

    // Fetch leads and users on mount
    useEffect(() => {
        fetchLeads();
        fetchUsers();
    }, []);

    // Filter, sort, and group leads when filters or search term changes
    useEffect(() => {
        let result = [...leads];

        // Apply search filter
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            result = result.filter(lead =>
                (lead.company?.toLowerCase().includes(term)) ||
                (lead.name?.toLowerCase().includes(term)) ||
                (lead.phone?.includes(term)) ||
                (lead.email?.toLowerCase().includes(term)) ||
                (lead.location?.toLowerCase().includes(term))
            );
        }

        // Apply status filter
        if (filters.status !== 'all') {
            result = result.filter(lead => lead.status === filters.status);
        }

        // Apply priority filter
        if (filters.priority !== 'all') {
            result = result.filter(lead => lead.priority === filters.priority);
        }

        // Apply campaign filter
        if (filters.campaign !== 'all') {
            if (filters.campaign === 'unassigned') {
                result = result.filter(lead => !lead.campaignId);
            } else {
                result = result.filter(lead => lead.campaignId === filters.campaign);
            }
        }

        // Apply sorting
        result = sortLeads(result, filters.sortBy);

        setFilteredLeads(result);

        // Reset page to 1 when filters change (unless we're preserving page)
        if (!preservePageRef.current) {
            setCurrentPageState(1);
        }
        preservePageRef.current = false;
    }, [searchTerm, filters, leads]);

    const sortLeads = (leadsToSort, sortBy) => {
        const sorted = [...leadsToSort];

        switch (sortBy) {
            case 'newest':
                return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            case 'oldest':
                return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            case 'company':
                return sorted.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
            case 'companyDesc':
                return sorted.sort((a, b) => (b.company || '').localeCompare(a.company || ''));
            case 'status':
                const statusOrder = { new: 1, contacted: 2, qualified: 3, quoted: 4, won: 5, lost: 6 };
                return sorted.sort((a, b) => (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0));
            case 'priority':
                const priorityOrder = { hot: 1, warm: 2, cold: 3 };
                return sorted.sort((a, b) => (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0));
            default:
                return sorted;
        }
    };

    const groupLeads = (leadsToGroup, groupBy) => {
        if (groupBy === 'none') {
            return { 'All Leads': leadsToGroup };
        }

        const grouped = {};

        leadsToGroup.forEach(lead => {
            let key;
            if (groupBy === 'status') {
                key = lead.status || 'new';
            } else if (groupBy === 'priority') {
                key = lead.priority || 'cold';
            } else if (groupBy === 'assignedTo') {
                key = lead.assignedTo || 'unassigned';
            } else {
                key = 'other';
            }

            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(lead);
        });

        return grouped;
    };

    const getGroupDisplayName = (groupKey, groupBy) => {
        if (groupBy === 'assignedTo') {
            if (groupKey === 'unassigned') {
                return 'Unassigned';
            }
            const user = users.find(u => u.id === groupKey);
            return user ? (user.name || user.email) : groupKey;
        }
        return groupKey;
    };

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const response = await api.getLeads();
            setLeads(response.leads || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching leads:', err);
            setError('Failed to load leads. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.getUsers();
            setUsers(response.users || []);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    const handleAddLead = () => {
        setEditingLead(null);
        setShowForm(true);
    };

    const handleEditLead = (lead) => {
        setEditingLead(lead);
        setShowForm(true);
    };

    const handleSaveLead = async (leadData) => {
        try {
            if (editingLead) {
                // Update existing lead - preserve current page
                preservePageRef.current = true;
                await api.updateLead(editingLead.id, leadData);
            } else {
                // Create new lead - reset to page 1
                preservePageRef.current = false;
                await api.createLead(leadData);
            }
            await fetchLeads();
            setShowForm(false);
            setEditingLead(null);
        } catch (err) {
            console.error('Error saving lead:', err);
            alert('Failed to save lead. Please try again.');
        }
    };

    const handleDeleteLead = async (leadId) => {
        if (!confirm('Are you sure you want to delete this lead?')) {
            return;
        }

        try {
            await api.deleteLead(leadId);
            await fetchLeads();
        } catch (err) {
            console.error('Error deleting lead:', err);
            alert('Failed to delete lead. Please try again.');
        }
    };

    const handleUpdateStatus = async (leadId, newStatus) => {
        try {
            // Status updates should preserve current page
            preservePageRef.current = true;
            await api.updateLead(leadId, { status: newStatus });
            await fetchLeads();
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Failed to update status. Please try again.');
        }
    };

    const handleUpdateCampaign = async (leadId, campaignId) => {
        try {
            // Campaign updates should preserve current page
            preservePageRef.current = true;
            await api.updateLead(leadId, { campaignId: campaignId });
            await fetchLeads();
        } catch (err) {
            console.error('Error updating campaign:', err);
            alert('Failed to update campaign. Please try again.');
        }
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setEditingLead(null);
    };

    const handleCall = (phoneNumber, leadId) => {
        setActiveCall({ phoneNumber, leadId });
    };

    const handleCloseCall = () => {
        setActiveCall(null);
        // Refresh leads to show updated notes
        fetchLeads();
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const handleSortChange = (sortBy) => {
        setFilters(prev => ({
            ...prev,
            sortBy
        }));
    };

    const handleGroupChange = (groupBy) => {
        setFilters(prev => ({
            ...prev,
            groupBy
        }));
    };

    const renderLeadsView = () => {
        const groupedLeads = groupLeads(filteredLeads, filters.groupBy);

        // Always use list view
        if (filters.groupBy === 'none') {
            return (
                <LeadListView
                    leads={filteredLeads}
                    onEditLead={handleEditLead}
                    onDeleteLead={handleDeleteLead}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateCampaign={handleUpdateCampaign}
                    onCall={handleCall}
                    currentPage={currentPageState}
                    onPageChange={setCurrentPageState}
                />
            );
        } else {
            return (
                <div>
                    {Object.entries(groupedLeads).map(([groupName, groupLeads]) => (
                        <div key={groupName} style={{ marginBottom: '24px' }}>
                            <h3 style={{
                                padding: '12px 24px',
                                background: 'var(--bg-secondary)',
                                borderBottom: '2px solid var(--border-color)',
                                textTransform: 'capitalize',
                                fontSize: '16px',
                                fontWeight: '700',
                                color: 'var(--text-primary)'
                            }}>
                                {getGroupDisplayName(groupName, filters.groupBy)} ({groupLeads.length})
                            </h3>
                            <LeadListView
                                leads={groupLeads}
                                onEditLead={handleEditLead}
                                onDeleteLead={handleDeleteLead}
                                onUpdateStatus={handleUpdateStatus}
                                onUpdateCampaign={handleUpdateCampaign}
                                onCall={handleCall}
                                currentPage={currentPageState}
                                onPageChange={setCurrentPageState}
                            />
                        </div>
                    ))}
                </div>
            );
        }
    };

    return (
        <div className="app-container">
            {/* Mobile overlay */}
            <div className={'sidebar-overlay ' + (mobileMenuOpen ? 'active' : '')} onClick={closeMobileMenu}></div>

            <Sidebar
                activeView={activeView}
                onViewChange={setActiveView}
                leadCount={leads.length}
                mobileOpen={mobileMenuOpen}
                onClose={closeMobileMenu}
            />

            <main className="main-content">
                {activeView === 'dashboard' ? (
                    <>
                        <Topbar
                            title="My Dashboard"
                            onOpenSettings={() => setShowSipSettings(true)}
                            onToggleMobileMenu={toggleMobileMenu}
                            searchTerm=""
                            onSearchChange={() => {}}
                        />
                        <div className="content-area">
                            <IndividualDashboard />
                        </div>
                    </>
                ) : activeView === 'team-dashboard' ? (
                    <>
                        <Topbar
                            title="Team Dashboard"
                            onOpenSettings={() => setShowSipSettings(true)}
                            onToggleMobileMenu={toggleMobileMenu}
                            searchTerm=""
                            onSearchChange={() => {}}
                        />
                        <div className="content-area">
                            <AdminDashboard />
                        </div>
                    </>
                ) : activeView === 'settings' ? (
                    <>
                        <Topbar
                            title="Settings"
                            onOpenSettings={() => setShowSipSettings(true)}
                            onToggleMobileMenu={toggleMobileMenu}
                            searchTerm=""
                            onSearchChange={() => {}}
                        />
                        <div className="content-area">
                            <Settings />
                        </div>
                    </>
                ) : activeView === 'campaigns' ? (
                    <>
                        <Topbar
                            title="Campaigns"
                            onOpenSettings={() => setShowSipSettings(true)}
                            onToggleMobileMenu={toggleMobileMenu}
                            searchTerm=""
                            onSearchChange={() => {}}
                        />
                        <div className="content-area">
                            <Campaigns />
                        </div>
                    </>
                ) : activeView === 'my-leads' ? (
                    <>
                        <Topbar
                            title="My Leads"
                            onOpenSettings={() => setShowSipSettings(true)}
                            onToggleMobileMenu={toggleMobileMenu}
                            searchTerm=""
                            onSearchChange={() => {}}
                        />
                        <div className="content-area">
                            <MyLeads
                                onEditLead={handleEditLead}
                                onDeleteLead={handleDeleteLead}
                                onCall={handleCall}
                            />
                        </div>
                    </>
                ) : activeView === 'users' ? (
                    <>
                        <Topbar
                            title="User Management"
                            onOpenSettings={() => setShowSipSettings(true)}
                            onToggleMobileMenu={toggleMobileMenu}
                            searchTerm=""
                            onSearchChange={() => {}}
                        />
                        <div className="content-area">
                            <UserManagement />
                        </div>
                    </>
                ) : (
                    <>
                        <Topbar
                            title="All Leads"
                            onAddLead={handleAddLead}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            onOpenSettings={() => setShowSipSettings(true)}
                            onToggleMobileMenu={toggleMobileMenu}
                        />

                        <LeadFilters
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onSortChange={handleSortChange}
                            onGroupChange={handleGroupChange}
                            leadCount={filteredLeads.length}
                        />

                        <div className="content-area">
                            {loading ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <p>Loading leads...</p>
                                </div>
                            ) : error ? (
                                <div className="error-state">
                                    <p>{error}</p>
                                    <button className="btn btn-primary" onClick={fetchLeads}>
                                        Retry
                                    </button>
                                </div>
                            ) : (
                                renderLeadsView()
                            )}
                        </div>
                    </>
                )}
            </main>

            {showForm && (
                <LeadForm
                    lead={editingLead}
                    onSave={handleSaveLead}
                    onCancel={handleCancelForm}
                />
            )}

            {activeCall && (
                <PhoneCall
                    phoneNumber={activeCall.phoneNumber}
                    leadId={activeCall.leadId}
                    onClose={handleCloseCall}
                />
            )}

            {showSipSettings && (
                <SipSettings onClose={() => setShowSipSettings(false)} />
            )}
        </div>
    );
}

export default CRM;
