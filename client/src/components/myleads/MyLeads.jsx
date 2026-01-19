import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LeadListView from '../leads/LeadListView';
import LeadFilters from '../leads/LeadFilters';
import api from '../../services/api';
import './MyLeads.css';

const MyLeads = ({ onEditLead, onDeleteLead, onCall }) => {
    const { user } = useAuth();
    const [campaigns, setCampaigns] = useState([]);
    const [allLeads, setAllLeads] = useState([]);
    const [filteredLeads, setFilteredLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCampaign, setSelectedCampaign] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        status: 'all',
        priority: 'all',
        sortBy: 'newest',
        groupBy: 'none'
    });

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [allLeads, selectedCampaign, searchTerm, filters]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [campaignsRes, leadsRes] = await Promise.all([
                api.getCampaigns(),
                api.getLeads()
            ]);

            // Filter campaigns where the current user is assigned
            const userCampaigns = (campaignsRes.campaigns || []).filter(campaign => {
                const campaignUsers = campaign.campaign_users || [];
                return campaignUsers.some(cu => {
                    const userId = cu.user?.id || cu.user_id;
                    return userId === user?.id;
                });
            });

            // Transform campaigns for display
            const transformedCampaigns = userCampaigns.map(campaign => ({
                id: campaign.id,
                name: campaign.name,
                description: campaign.description,
                status: campaign.status,
                leadCount: campaign.lead_count || 0
            }));

            setCampaigns(transformedCampaigns);

            // Filter leads that belong to user's campaigns
            const campaignIds = transformedCampaigns.map(c => c.id);
            const myLeads = (leadsRes.leads || []).filter(lead =>
                campaignIds.includes(lead.campaignId)
            );

            setAllLeads(myLeads);
            setError(null);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load your leads');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = [...allLeads];

        // Filter by selected campaign
        if (selectedCampaign !== 'all') {
            result = result.filter(lead => lead.campaignId === selectedCampaign);
        }

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
        setCurrentPage(1);
    };

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

    const handleUpdateStatus = async (leadId, newStatus) => {
        try {
            await api.updateLead(leadId, { status: newStatus });
            await fetchData();
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Failed to update status');
        }
    };

    const handleUpdateCampaign = async (leadId, campaignId) => {
        try {
            await api.updateLead(leadId, { campaignId: campaignId });
            await fetchData();
        } catch (err) {
            console.error('Error updating campaign:', err);
            alert('Failed to update campaign');
        }
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

    const getCampaignLeadCount = (campaignId) => {
        return allLeads.filter(lead => lead.campaignId === campaignId).length;
    };

    if (loading) {
        return (
            <div className="my-leads-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading your leads...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="my-leads-container">
                <div className="error-state">
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={fetchData}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (campaigns.length === 0) {
        return (
            <div className="my-leads-container">
                <div className="empty-state">
                    <div className="empty-icon">📁</div>
                    <h3>No campaigns assigned</h3>
                    <p>You haven't been assigned to any campaigns yet. Contact your administrator to get started.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="my-leads-container">
            <div className="my-leads-header">
                <div className="header-content">
                    <h2>My Leads</h2>
                    <p>Leads from your assigned campaigns</p>
                </div>
                <div className="summary-stats">
                    <div className="stat-card">
                        <div className="stat-value">{campaigns.length}</div>
                        <div className="stat-label">Campaigns</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{allLeads.length}</div>
                        <div className="stat-label">Total Leads</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{filteredLeads.length}</div>
                        <div className="stat-label">Filtered</div>
                    </div>
                </div>
            </div>

            <div className="campaign-selector">
                <label>Filter by Campaign:</label>
                <select
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    className="campaign-select"
                >
                    <option value="all">All Campaigns ({allLeads.length} leads)</option>
                    {campaigns.map(campaign => (
                        <option key={campaign.id} value={campaign.id}>
                            {campaign.name} ({getCampaignLeadCount(campaign.id)} leads)
                        </option>
                    ))}
                </select>
            </div>

            <div className="search-bar-container">
                <input
                    type="text"
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            <LeadFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onSortChange={handleSortChange}
                onGroupChange={handleGroupChange}
                leadCount={filteredLeads.length}
            />

            <div className="leads-content">
                {filteredLeads.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🔍</div>
                        <h3>No leads found</h3>
                        <p>Try adjusting your filters or search term</p>
                    </div>
                ) : (
                    <LeadListView
                        leads={filteredLeads}
                        onEditLead={onEditLead}
                        onDeleteLead={onDeleteLead}
                        onUpdateStatus={handleUpdateStatus}
                        onUpdateCampaign={handleUpdateCampaign}
                        onCall={onCall}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>
        </div>
    );
};

export default MyLeads;
