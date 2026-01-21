import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CampaignForm from './CampaignForm';
import CampaignDetail from './CampaignDetail';
import './Campaigns.css';

// Special ID for the "No Campaign Assigned" virtual campaign
const UNASSIGNED_CAMPAIGN_ID = '__unassigned__';

const Campaigns = ({ onSelectCampaign }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [users, setUsers] = useState([]);
    const [unassignedCount, setUnassignedCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState(null);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [expandedCampaign, setExpandedCampaign] = useState(null);
    const { profile, user } = useAuth();

    // Check both profile (from DB) and user metadata for admin role
    const isAdmin = profile?.role === 'admin' || user?.user_metadata?.role === 'admin' || true; // TODO: Always show for now until profile loading is fixed

    useEffect(() => {
        fetchCampaigns();
        fetchUsers();
        fetchUnassignedCount();
    }, []);

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const response = await api.getCampaigns();
            console.log('API Response:', response);
            // Transform snake_case to camelCase and flatten user data
            const transformedCampaigns = (response.campaigns || []).map(campaign => ({
                ...campaign,
                leadCount: campaign.lead_count || 0,
                wonCount: campaign.won_count || 0,
                userCount: campaign.user_count || 0,
                userStats: campaign.user_stats || {},
                assignedUsers: (campaign.campaign_users || []).map(cu => ({
                    id: cu.user?.id || cu.user_id,
                    name: cu.user?.name,
                    email: cu.user?.email,
                    assignedAt: cu.assigned_at
                }))
            }));
            console.log('Transformed campaigns:', transformedCampaigns);
            setCampaigns(transformedCampaigns);

            // Update selected campaign if it's currently selected
            if (selectedCampaign) {
                const updatedSelected = transformedCampaigns.find(c => c.id === selectedCampaign.id);
                if (updatedSelected) {
                    setSelectedCampaign(updatedSelected);
                }
            }

            setError(null);
        } catch (err) {
            console.error('Error fetching campaigns:', err);
            setError('Failed to load campaigns');
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

    const fetchUnassignedCount = async () => {
        try {
            const response = await api.getUnassignedLeadsCount();
            setUnassignedCount(response.count || 0);
        } catch (err) {
            console.error('Error fetching unassigned count:', err);
        }
    };

    // Virtual campaign for unassigned leads
    const unassignedCampaign = {
        id: UNASSIGNED_CAMPAIGN_ID,
        name: 'No Campaign Assigned',
        description: 'Leads not assigned to any campaign',
        status: 'active',
        leadCount: unassignedCount,
        wonCount: 0,
        userCount: 0,
        assignedUsers: [],
        isVirtual: true
    };

    const handleCreateCampaign = () => {
        setEditingCampaign(null);
        setShowForm(true);
    };

    const handleEditCampaign = (campaign) => {
        setEditingCampaign(campaign);
        setShowForm(true);
    };

    const handleSaveCampaign = async (campaignData) => {
        try {
            if (editingCampaign) {
                await api.updateCampaign(editingCampaign.id, campaignData);
            } else {
                await api.createCampaign(campaignData);
            }
            await fetchCampaigns();
            setShowForm(false);
            setEditingCampaign(null);
        } catch (err) {
            console.error('Error saving campaign:', err);
            throw err;
        }
    };

    const handleDeleteCampaign = async (campaignId) => {
        if (!confirm('Are you sure you want to delete this campaign? Leads will be unassigned.')) {
            return;
        }

        try {
            await api.deleteCampaign(campaignId);
            await fetchCampaigns();
            if (selectedCampaign?.id === campaignId) {
                setSelectedCampaign(null);
            }
        } catch (err) {
            console.error('Error deleting campaign:', err);
            alert('Failed to delete campaign');
        }
    };

    const handleSelectCampaign = (campaign) => {
        setSelectedCampaign(campaign);
        if (onSelectCampaign) {
            onSelectCampaign(campaign);
        }
    };

    const handleUserAssignment = async (campaignId, userIds) => {
        try {
            await api.assignUsersToCampaign(campaignId, userIds);
            await fetchCampaigns();
            // Update selected campaign with fresh data
            if (selectedCampaign?.id === campaignId) {
                const response = await api.getCampaigns();
                const updatedCampaign = (response.campaigns || []).find(c => c.id === campaignId);
                if (updatedCampaign) {
                    setSelectedCampaign({
                        ...updatedCampaign,
                        leadCount: updatedCampaign.lead_count || 0,
                        userCount: updatedCampaign.user_count || 0,
                        assignedUsers: (updatedCampaign.campaign_users || []).map(cu => ({
                            id: cu.user?.id || cu.user_id,
                            name: cu.user?.name,
                            email: cu.user?.email,
                            assignedAt: cu.assigned_at
                        }))
                    });
                }
            }
        } catch (err) {
            console.error('Error assigning users:', err);
            throw err;
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'active': return 'status-badge status-active';
            case 'paused': return 'status-badge status-paused';
            case 'completed': return 'status-badge status-completed';
            default: return 'status-badge';
        }
    };

    if (loading) {
        return (
            <div className="campaigns-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading campaigns...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="campaigns-container">
            <div className="campaigns-header">
                <div className="header-content">
                    <h1>Campaigns</h1>
                    <p>Manage your lead campaigns and user assignments</p>
                </div>
                {isAdmin && (
                    <button className="btn btn-primary" onClick={handleCreateCampaign}>
                        + New Campaign
                    </button>
                )}
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            <div className="campaigns-layout">
                <div className="campaigns-list">
                    {/* Always show "No Campaign Assigned" at the top */}
                    <div
                        className={`campaign-card campaign-unassigned ${selectedCampaign?.id === UNASSIGNED_CAMPAIGN_ID ? 'selected' : ''}`}
                    >
                        <div className="campaign-row" onClick={() => handleSelectCampaign(unassignedCampaign)}>
                            <div className="campaign-card-header">
                                <h3>No Campaign Assigned</h3>
                            </div>

                            <div className="campaign-stats">
                                <div className="stat">
                                    <span className="stat-value">{unassignedCount}</span>
                                    <span className="stat-label">leads</span>
                                </div>
                            </div>

                            <span className="status-badge status-unassigned">
                                unassigned
                            </span>
                        </div>
                    </div>

                    {campaigns.length === 0 ? (
                        <div className="empty-state">
                            <p>No campaigns yet</p>
                            {isAdmin && (
                                <button className="btn btn-primary" onClick={handleCreateCampaign}>
                                    Create your first campaign
                                </button>
                            )}
                        </div>
                    ) : (
                        campaigns.map(campaign => (
                            <div
                                key={campaign.id}
                                className={`campaign-card ${selectedCampaign?.id === campaign.id ? 'selected' : ''} ${expandedCampaign === campaign.id ? 'expanded' : ''}`}
                            >
                                <div className="campaign-row" onClick={() => handleSelectCampaign(campaign)}>
                                    <div className="campaign-card-header">
                                        <h3>{campaign.name}</h3>
                                    </div>

                                    <div className="campaign-stats">
                                        <div className="stat">
                                            <span className="stat-value">{campaign.leadCount || 0}</span>
                                            <span className="stat-label">leads</span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-value">{campaign.assignedUsers?.length || 0}</span>
                                            <span className="stat-label">users</span>
                                        </div>
                                        <div className="stat stat-won">
                                            <span className="stat-value">{campaign.wonCount || 0}</span>
                                            <span className="stat-label">won</span>
                                        </div>
                                    </div>

                                    <span className={getStatusBadgeClass(campaign.status)}>
                                        {campaign.status}
                                    </span>

                                    {isAdmin && (
                                        <div className="campaign-actions">
                                            <button
                                                className="btn-icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditCampaign(campaign);
                                                }}
                                                title="Edit campaign"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="btn-icon btn-icon-danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteCampaign(campaign.id);
                                                }}
                                                title="Delete campaign"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    )}

                                    {campaign.assignedUsers?.length > 0 && (
                                        <button
                                            className="btn-icon btn-expand"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedCampaign(expandedCampaign === campaign.id ? null : campaign.id);
                                            }}
                                            title="Show user stats"
                                        >
                                            {expandedCampaign === campaign.id ? '▲' : '▼'}
                                        </button>
                                    )}
                                </div>

                                {expandedCampaign === campaign.id && campaign.assignedUsers?.length > 0 && (
                                    <div className="campaign-users-dropdown">
                                        <div className="users-dropdown-header">
                                            <span>User</span>
                                            <span>Assigned</span>
                                            <span>Called</span>
                                        </div>
                                        {campaign.assignedUsers.map(assignedUser => {
                                            const stats = campaign.userStats?.[assignedUser.id] || { assigned: 0, called: 0 };
                                            return (
                                                <div key={assignedUser.id} className="user-stat-row">
                                                    <span className="user-name">{assignedUser.name || assignedUser.email?.split('@')[0]}</span>
                                                    <span className="user-assigned">{stats.assigned}</span>
                                                    <span className="user-called">{stats.called}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {selectedCampaign && (
                    <CampaignDetail
                        campaign={selectedCampaign}
                        users={users}
                        isAdmin={isAdmin}
                        onUserAssignment={handleUserAssignment}
                        onClose={() => setSelectedCampaign(null)}
                        onRefresh={fetchCampaigns}
                    />
                )}
            </div>

            {showForm && (
                <CampaignForm
                    campaign={editingCampaign}
                    onSave={handleSaveCampaign}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingCampaign(null);
                    }}
                />
            )}
        </div>
    );
};

export default Campaigns;
