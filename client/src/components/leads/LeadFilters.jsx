import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import './LeadFilters.css';

const LeadFilters = ({ filters, onFilterChange, onSortChange, onGroupChange, leadCount, onRefresh }) => {
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);
    const [statuses, setStatuses] = useState([]);
    const [campaigns, setCampaigns] = useState([]);

    useEffect(() => {
        fetchStatuses();
        fetchCampaigns();
    }, []);

    const fetchStatuses = async () => {
        try {
            const response = await api.getStatuses();
            setStatuses(response.statuses || []);
        } catch (error) {
            console.error('Error fetching statuses:', error);
        }
    };

    const fetchCampaigns = async () => {
        try {
            const response = await api.getCampaigns();
            setCampaigns(response.campaigns || []);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
        }
    };

    const hasActiveFilters = filters.status !== 'all' || filters.priority !== 'all' || filters.campaign !== 'all' || filters.assignedTo !== 'all';

    return (
        <div className="lead-filters">
            <div className="filter-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="filter-header-left">
                    <span className="filter-icon">🔍</span>
                    <span className="filter-title">Filters & Sort</span>
                    {hasActiveFilters && <span className="filter-badge">{(filters.status !== 'all' ? 1 : 0) + (filters.priority !== 'all' ? 1 : 0) + (filters.campaign !== 'all' ? 1 : 0) + (filters.assignedTo !== 'all' ? 1 : 0)}</span>}
                </div>
                <div className="filter-header-right">
                    <span className="lead-count-mobile">{leadCount}</span>
                    <span className={'filter-chevron ' + (isExpanded ? 'expanded' : '')}>▼</span>
                </div>
            </div>

            <div className={'filter-section ' + (isExpanded ? 'expanded' : '')}>
                <div className="filter-group">
                    <label className="filter-label">Status</label>
                    <select
                        className="filter-select"
                        value={filters.status}
                        onChange={(e) => onFilterChange('status', e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        {statuses.map(status => (
                            <option
                                key={status.id}
                                value={status.name.toLowerCase().replace(/\s+/g, '_')}
                            >
                                {status.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Priority</label>
                    <select
                        className="filter-select"
                        value={filters.priority}
                        onChange={(e) => onFilterChange('priority', e.target.value)}
                    >
                        <option value="all">All Priorities</option>
                        <option value="hot">Hot</option>
                        <option value="warm">Warm</option>
                        <option value="cold">Cold</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Campaign</label>
                    <select
                        className="filter-select"
                        value={filters.campaign || 'all'}
                        onChange={(e) => onFilterChange('campaign', e.target.value)}
                    >
                        <option value="all">All Campaigns</option>
                        <option value="unassigned">No Campaign</option>
                        {campaigns.map(campaign => (
                            <option key={campaign.id} value={campaign.id}>
                                {campaign.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Assigned To</label>
                    <select
                        className="filter-select"
                        value={filters.assignedTo || 'all'}
                        onChange={(e) => onFilterChange('assignedTo', e.target.value)}
                    >
                        <option value="all">All Users</option>
                        <option value="me">Assigned to Me</option>
                        <option value="unassigned">Unassigned</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Sort By</label>
                    <select
                        className="filter-select"
                        value={filters.sortBy}
                        onChange={(e) => onSortChange(e.target.value)}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="company">Company A-Z</option>
                        <option value="companyDesc">Company Z-A</option>
                        <option value="status">Status</option>
                        <option value="priority">Priority</option>
                        <option value="callsAsc">Calls (Low to High)</option>
                        <option value="callsDesc">Calls (High to Low)</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Group By</label>
                    <select
                        className="filter-select"
                        value={filters.groupBy}
                        onChange={(e) => onGroupChange(e.target.value)}
                    >
                        <option value="none">No Grouping</option>
                        <option value="status">Status</option>
                        <option value="priority">Priority</option>
                        <option value="assignedTo">Sales Rep</option>
                    </select>
                </div>

                <div className="filter-stats">
                    <span className="lead-count">{leadCount} leads</span>
                    {onRefresh && (
                        <button
                            className="btn-refresh"
                            onClick={onRefresh}
                            title="Refresh leads"
                        >
                            Refresh
                        </button>
                    )}
                </div>

                {(filters.status !== 'all' || filters.priority !== 'all' || filters.campaign !== 'all' || filters.assignedTo !== 'all') && (
                    <button
                        className="btn-clear-filters"
                        onClick={() => {
                            onFilterChange('status', 'all');
                            onFilterChange('priority', 'all');
                            onFilterChange('campaign', 'all');
                            onFilterChange('assignedTo', 'all');
                        }}
                        title="Clear all filters"
                    >
                        ✕ Clear
                    </button>
                )}
            </div>
        </div>
    );
};

export default LeadFilters;
