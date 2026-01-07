import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import LeadList from './components/leads/LeadList';
import LeadForm from './components/leads/LeadForm';
import PhoneCall from './components/common/PhoneCall';
import Settings from './components/common/Settings';
import api from './services/api';
import './App.css';

function App() {
    const [leads, setLeads] = useState([]);
    const [filteredLeads, setFilteredLeads] = useState([]);
    const [activeView, setActiveView] = useState('leads');
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeCall, setActiveCall] = useState(null);
    const [showSettings, setShowSettings] = useState(false);

    // Fetch leads on mount
    useEffect(() => {
        fetchLeads();
    }, []);

    // Filter leads when search term changes
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredLeads(leads);
        } else {
            const term = searchTerm.toLowerCase();
            const filtered = leads.filter(lead =>
                (lead.company?.toLowerCase().includes(term)) ||
                (lead.name?.toLowerCase().includes(term)) ||
                (lead.phone?.includes(term)) ||
                (lead.email?.toLowerCase().includes(term)) ||
                (lead.location?.toLowerCase().includes(term))
            );
            setFilteredLeads(filtered);
        }
    }, [searchTerm, leads]);

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

    return (
        <div className="app-container">
            <Sidebar
                activeView={activeView}
                onViewChange={setActiveView}
                leadCount={leads.length}
            />

            <main className="main-content">
                <Topbar
                    title="All Leads"
                    onAddLead={handleAddLead}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onOpenSettings={() => setShowSettings(true)}
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
                        <LeadList
                            leads={filteredLeads}
                            onEditLead={handleEditLead}
                            onDeleteLead={handleDeleteLead}
                            onUpdateStatus={handleUpdateStatus}
                            onCall={handleCall}
                        />
                    )}
                </div>
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

export default App;
