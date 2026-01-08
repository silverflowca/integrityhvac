import React, { useState, useEffect } from 'react';
import Sidebar from './layout/Sidebar';
import Topbar from './layout/Topbar';
import LeadList from './leads/LeadList';
import LeadListView from './leads/LeadListView';
import LeadMapView from './leads/LeadMapView';
import LeadFilters from './leads/LeadFilters';
import LeadForm from './leads/LeadForm';
import PhoneCall from './common/PhoneCall';
import Settings from './common/Settings';
import IndividualDashboard from './dashboard/IndividualDashboard';
import AdminDashboard from './dashboard/AdminDashboard';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import '../App.css';

function CRM() {
    const [leads, setLeads] = useState([]);
    const [filteredLeads, setFilteredLeads] = useState([]);
    const [activeView, setActiveView] = useState('leads');
    const [viewMode, setViewMode] = useState('card');
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeCall, setActiveCall] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all',
        priority: 'all',
        sortBy: 'newest',
        groupBy: 'none'
    });

    // Fetch leads on mount
    useEffect(() => {
        fetchLeads();
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

        // Apply sorting
        result = sortLeads(result, filters.sortBy);

        setFilteredLeads(result);
    }, [searchTerm, leads, filters]);

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
            const key = groupBy === 'status' ? (lead.status || 'new') : (lead.priority || 'cold');
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(lead);
        });

        return grouped;
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
                // Update existing lead
                await api.updateLead(editingLead.id, leadData);
            } else {
                // Create new lead
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
            await api.updateLead(leadId, { status: newStatus });
            await fetchLeads();
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Failed to update status. Please try again.');
        }
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setEditingLead(null);
    };

    const handleCall = (phoneNumber) => {
        setActiveCall(phoneNumber);
    };

    const handleCloseCall = () => {
        setActiveCall(null);
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

        if (viewMode === 'list') {
            if (filters.groupBy === 'none') {
                return (
                    <LeadListView
                        leads={filteredLeads}
                        onEditLead={handleEditLead}
                        onDeleteLead={handleDeleteLead}
                        onUpdateStatus={handleUpdateStatus}
                        onCall={handleCall}
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
                                    {groupName} ({groupLeads.length})
                                </h3>
                                <LeadListView
                                    leads={groupLeads}
                                    onEditLead={handleEditLead}
                                    onDeleteLead={handleDeleteLead}
                                    onUpdateStatus={handleUpdateStatus}
                                    onCall={handleCall}
                                />
                            </div>
                        ))}
                    </div>
                );
            }
        } else if (viewMode === 'map') {
            return (
                <LeadMapView
                    leads={filteredLeads}
                    onEditLead={handleEditLead}
                    onDeleteLead={handleDeleteLead}
                    onUpdateStatus={handleUpdateStatus}
                    onCall={handleCall}
                />
            );
        } else {
            if (filters.groupBy === 'none') {
                return (
                    <LeadList
                        leads={filteredLeads}
                        onEditLead={handleEditLead}
                        onDeleteLead={handleDeleteLead}
                        onUpdateStatus={handleUpdateStatus}
                        onCall={handleCall}
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
                                    {groupName} ({groupLeads.length})
                                </h3>
                                <LeadList
                                    leads={groupLeads}
                                    onEditLead={handleEditLead}
                                    onDeleteLead={handleDeleteLead}
                                    onUpdateStatus={handleUpdateStatus}
                                    onCall={handleCall}
                                />
                            </div>
                        ))}
                    </div>
                );
            }
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
                    <div className="content-area">
                        <IndividualDashboard />
                    </div>
                ) : (
                    <>
                        <Topbar
                            title="All Leads"
                            onAddLead={handleAddLead}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            onOpenSettings={() => setShowSettings(true)}
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                            onToggleMobileMenu={toggleMobileMenu}
                        />

                        {(viewMode === 'card' || viewMode === 'list') && (
                            <LeadFilters
                                filters={filters}
                                onFilterChange={handleFilterChange}
                                onSortChange={handleSortChange}
                                onGroupChange={handleGroupChange}
                                leadCount={filteredLeads.length}
                            />
                        )}

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
                    phoneNumber={activeCall}
                    onClose={handleCloseCall}
                />
            )}

            {showSettings && (
                <Settings onClose={() => setShowSettings(false)} />
            )}
        </div>
    );
}

export default CRM;
