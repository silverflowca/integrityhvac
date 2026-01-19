import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './CampaignDetail.css';

const CampaignDetail = ({ campaign, users, isAdmin, onUserAssignment, onClose, onRefresh }) => {
    const [activeTab, setActiveTab] = useState('users');
    const [leads, setLeads] = useState([]);
    const [allLeads, setAllLeads] = useState([]);
    const [loadingLeads, setLoadingLeads] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [selectedLeadIds, setSelectedLeadIds] = useState([]);
    const [showAssignLeads, setShowAssignLeads] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (campaign) {
            setSelectedUserIds(campaign.assignedUsers?.map(u => u.id) || []);
            fetchCampaignLeads();
        }
    }, [campaign]);

    const fetchCampaignLeads = async () => {
        try {
            setLoadingLeads(true);
            const response = await api.getLeads();
            const allLeadsData = response.leads || [];
            setAllLeads(allLeadsData);
            setLeads(allLeadsData.filter(lead => lead.campaignId === campaign.id));
        } catch (err) {
            console.error('Error fetching leads:', err);
        } finally {
            setLoadingLeads(false);
        }
    };

    const handleUserToggle = (userId) => {
        setSelectedUserIds(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    const handleSaveUserAssignments = async () => {
        try {
            setSaving(true);
            await onUserAssignment(campaign.id, selectedUserIds);
            onRefresh();
        } catch (err) {
            console.error('Error saving user assignments:', err);
            alert('Failed to save user assignments');
        } finally {
            setSaving(false);
        }
    };

    const handleLeadToggle = (leadId) => {
        setSelectedLeadIds(prev => {
            if (prev.includes(leadId)) {
                return prev.filter(id => id !== leadId);
            } else {
                return [...prev, leadId];
            }
        });
    };

    const handleAssignLeads = async () => {
        if (selectedLeadIds.length === 0) {
            alert('Please select at least one lead');
            return;
        }

        try {
            setSaving(true);
            await api.bulkAssignLeadsToCampaign(selectedLeadIds, campaign.id);
            setSelectedLeadIds([]);
            setShowAssignLeads(false);
            await fetchCampaignLeads();
            onRefresh();
        } catch (err) {
            console.error('Error assigning leads:', err);
            alert('Failed to assign leads');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveLeadFromCampaign = async (leadId) => {
        try {
            setSaving(true);
            await api.bulkAssignLeadsToCampaign([leadId], null);
            // Remove from local state instead of refetching
            setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
            // Update parent component - refetch to update counts
            if (onRefresh) await onRefresh();
        } catch (err) {
            console.error('Error removing lead:', err);
            alert('Failed to remove lead from campaign');
        } finally {
            setSaving(false);
        }
    };

    const unassignedLeads = allLeads.filter(lead => !lead.campaignId);

    return (
        <div className="campaign-detail">
            <div className="campaign-detail-header">
                <div className="header-info">
                    <h2>{campaign.name}</h2>
                    {campaign.description && (
                        <p className="description">{campaign.description}</p>
                    )}
                </div>
                <button className="btn-close" onClick={onClose}>&times;</button>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    Users ({campaign.assignedUsers?.length || 0})
                </button>
                <button
                    className={`tab ${activeTab === 'leads' ? 'active' : ''}`}
                    onClick={() => setActiveTab('leads')}
                >
                    Leads ({leads.length})
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'users' && (
                    <div className="users-tab">
                        <p className="tab-description">
                            Assign users to this campaign. Assigned users can work on leads in this campaign.
                        </p>
                        <div className="user-list">
                            {users.map(user => (
                                <label key={user.id} className="user-item">
                                    <input
                                        type="checkbox"
                                        checked={selectedUserIds.includes(user.id)}
                                        onChange={() => handleUserToggle(user.id)}
                                        disabled={!isAdmin || saving}
                                    />
                                    <div className="user-info">
                                        <span className="user-name">{user.name || user.email}</span>
                                        <span className="user-email">{user.email}</span>
                                    </div>
                                    <span className={`role-badge role-${user.role}`}>{user.role}</span>
                                </label>
                            ))}
                        </div>
                        {isAdmin && (
                            <div className="action-bar">
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSaveUserAssignments}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save User Assignments'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'leads' && (
                    <div className="leads-tab">
                        {!showAssignLeads ? (
                            <>
                                <div className="leads-header">
                                    <p className="tab-description">
                                        Leads assigned to this campaign
                                    </p>
                                    {isAdmin && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => setShowAssignLeads(true)}
                                        >
                                            + Add Leads
                                        </button>
                                    )}
                                </div>
                                {loadingLeads ? (
                                    <div className="loading-state">
                                        <div className="spinner"></div>
                                        <p>Loading leads...</p>
                                    </div>
                                ) : leads.length === 0 ? (
                                    <div className="empty-state">
                                        <p>No leads assigned to this campaign yet</p>
                                    </div>
                                ) : (
                                    <div className="lead-list">
                                        {leads.map(lead => (
                                            <div key={lead.id} className="lead-item">
                                                <div className="lead-info">
                                                    <span className="lead-name">{lead.name}</span>
                                                    <span className="lead-phone">{lead.phone}</span>
                                                    {lead.company && (
                                                        <span className="lead-company">{lead.company}</span>
                                                    )}
                                                </div>
                                                <div className="lead-meta">
                                                    <span className={`status-badge status-${lead.status}`}>
                                                        {lead.status}
                                                    </span>
                                                    {isAdmin && (
                                                        <button
                                                            className="btn btn-small btn-danger"
                                                            onClick={() => handleRemoveLeadFromCampaign(lead.id)}
                                                            disabled={saving}
                                                            title="Remove from campaign"
                                                        >
                                                            &times;
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="leads-header">
                                    <p className="tab-description">
                                        Select unassigned leads to add to this campaign
                                    </p>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setShowAssignLeads(false);
                                            setSelectedLeadIds([]);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                                {unassignedLeads.length === 0 ? (
                                    <div className="empty-state">
                                        <p>All leads are already assigned to campaigns</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="select-all-bar">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLeadIds.length === unassignedLeads.length}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedLeadIds(unassignedLeads.map(l => l.id));
                                                        } else {
                                                            setSelectedLeadIds([]);
                                                        }
                                                    }}
                                                />
                                                Select All ({unassignedLeads.length} unassigned leads)
                                            </label>
                                        </div>
                                        <div className="lead-list selectable">
                                            {unassignedLeads.map(lead => (
                                                <label key={lead.id} className="lead-item selectable">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedLeadIds.includes(lead.id)}
                                                        onChange={() => handleLeadToggle(lead.id)}
                                                    />
                                                    <div className="lead-info">
                                                        <span className="lead-name">{lead.name}</span>
                                                        <span className="lead-phone">{lead.phone}</span>
                                                        {lead.company && (
                                                            <span className="lead-company">{lead.company}</span>
                                                        )}
                                                    </div>
                                                    <span className={`status-badge status-${lead.status}`}>
                                                        {lead.status}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                        <div className="action-bar">
                                            <span className="selection-count">
                                                {selectedLeadIds.length} leads selected
                                            </span>
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleAssignLeads}
                                                disabled={saving || selectedLeadIds.length === 0}
                                            >
                                                {saving ? 'Adding...' : `Add ${selectedLeadIds.length} Leads to Campaign`}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CampaignDetail;
