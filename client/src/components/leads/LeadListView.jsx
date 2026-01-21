import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import BulkActionToolbar from './BulkActionToolbar';
import BulkActionModal from './BulkActionModal';
import './LeadListView.css';

const BULK_THRESHOLD = 250;

const STATUS_COLORS = {
    new: '#0ea5e9',
    contacted: '#06b6d4',
    no_answer: '#94a3b8',
    phone_number_not_in_service: '#64748b',
    qualified: '#8b5cf6',
    quoted: '#f59e0b',
    cleaning_lead: '#14b8a6',
    won: '#10b981',
    lost: '#ef4444',
    do_not_call: '#dc2626',
    call_back: '#3b82f6'
};

const PRIORITY_COLORS = {
    hot: '#ef4444',
    warm: '#f59e0b',
    cold: '#06b6d4'
};

const LeadListView = ({ leads, onEditLead, onDeleteLead, onUpdateStatus, onUpdateCampaign, onCall, currentPage: externalPage, onPageChange: externalPageChange, onRefresh }) => {
    const [internalPage, setInternalPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [statuses, setStatuses] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [users, setUsers] = useState([]);
    const [sortField, setSortField] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Bulk selection state
    const [selectedLeads, setSelectedLeads] = useState(new Set());
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkAction, setBulkAction] = useState(null);
    const [isServerSideMode, setIsServerSideMode] = useState(false);

    // Use external page if provided, otherwise use internal state
    const currentPage = externalPage !== undefined ? externalPage : internalPage;
    const setCurrentPage = externalPageChange || setInternalPage;

    // Fetch statuses, campaigns, and users on mount
    useEffect(() => {
        fetchStatuses();
        fetchCampaigns();
        fetchUsers();
    }, []);

    // Clear selection when leads change
    useEffect(() => {
        setSelectedLeads(new Set());
    }, [leads]);

    // Reset to page 1 only when itemsPerPage changes
    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    const fetchStatuses = async () => {
        try {
            const response = await api.getStatuses();
            setStatuses(response.statuses || []);
        } catch (error) {
            console.error('Error fetching statuses:', error);
            // Fallback to default statuses
            setStatuses([
                { id: '1', name: 'New', isDefault: true },
                { id: '2', name: 'Contacted', isDefault: true },
                { id: '3', name: 'No answer', isDefault: true },
                { id: '4', name: 'Phone number not in service', isDefault: true },
                { id: '5', name: 'Qualified', isDefault: true },
                { id: '6', name: 'Quoted', isDefault: true },
                { id: '7', name: 'Cleaning Lead', isDefault: true },
                { id: '8', name: 'Won', isDefault: true },
                { id: '9', name: 'Lost', isDefault: true },
                { id: '10', name: 'Do Not Call', isDefault: true },
                { id: '11', name: 'Call Back', isDefault: true }
            ]);
        }
    };

    const fetchCampaigns = async () => {
        try {
            const response = await api.getCampaigns();
            setCampaigns(response.campaigns || []);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            setCampaigns([]);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.getUsers();
            setUsers(response.users || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]);
        }
    };

    // Bulk selection handlers
    const handleSelectLead = (leadId) => {
        const newSelected = new Set(selectedLeads);
        if (newSelected.has(leadId)) {
            newSelected.delete(leadId);
        } else {
            newSelected.add(leadId);
        }
        setSelectedLeads(newSelected);
    };

    const handleSelectAll = () => {
        if (leads.length <= BULK_THRESHOLD) {
            const allIds = new Set(leads.map(l => l.id));
            setSelectedLeads(allIds);
        }
    };

    const handleSelectPage = () => {
        const pageIds = paginatedLeads.map(l => l.id);
        const newSelected = new Set(selectedLeads);
        pageIds.forEach(id => newSelected.add(id));
        setSelectedLeads(newSelected);
    };

    const handleClearSelection = () => {
        setSelectedLeads(new Set());
        setIsServerSideMode(false);
    };

    const handleBulkAction = (action) => {
        setBulkAction(action);
        setBulkModalOpen(true);
    };

    const handleOpenBulkModal = () => {
        setIsServerSideMode(true);
        setBulkModalOpen(true);
    };

    const handleBulkSuccess = (result) => {
        setSelectedLeads(new Set());
        setIsServerSideMode(false);
        setBulkModalOpen(false);
        setBulkAction(null);
        // Refresh leads list
        if (onRefresh) {
            onRefresh();
        }
        alert(`Success: ${result.message}`);
    };

    const isAllPageSelected = () => {
        return paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeads.has(l.id));
    };

    const isSomePageSelected = () => {
        return paginatedLeads.some(l => selectedLeads.has(l.id)) && !isAllPageSelected();
    };

    const handleHeaderCheckboxChange = () => {
        if (isAllPageSelected()) {
            // Deselect all on current page
            const pageIds = paginatedLeads.map(l => l.id);
            const newSelected = new Set(selectedLeads);
            pageIds.forEach(id => newSelected.delete(id));
            setSelectedLeads(newSelected);
        } else {
            // Select all on current page
            handleSelectPage();
        }
    };

    const handleCampaignChange = (leadId, campaignId) => {
        if (onUpdateCampaign) {
            onUpdateCampaign(leadId, campaignId || null);
        }
    };

    const getCampaignName = (campaignId) => {
        if (!campaignId) return null;
        const campaign = campaigns.find(c => c.id === campaignId);
        return campaign ? campaign.name : null;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleStatusChange = (leadId, newStatus) => {
        onUpdateStatus(leadId, newStatus);
    };

    const handleCall = async (phoneNumber, leadId) => {
        if (!phoneNumber) return;

        try {
            // Try to acquire lock before calling
            const response = await api.acquireLeadLock(leadId);
            if (response.success) {
                onCall(phoneNumber, leadId);
            }
        } catch (error) {
            if (error.message.includes('being dialed') || error.message.includes('locked')) {
                alert('This lead is currently being dialed by another user');
            } else {
                console.error('Error acquiring lock:', error);
                // Still allow call if lock check fails (graceful degradation)
                onCall(phoneNumber, leadId);
            }
        }
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (field) => {
        if (sortField !== field) return '↕';
        return sortDirection === 'asc' ? '↑' : '↓';
    };

    // Sort leads
    const sortedLeads = [...leads].sort((a, b) => {
        if (!sortField) return 0;

        let aVal = a[sortField];
        let bVal = b[sortField];

        // Handle null/undefined
        if (aVal == null) aVal = sortDirection === 'asc' ? Infinity : -Infinity;
        if (bVal == null) bVal = sortDirection === 'asc' ? Infinity : -Infinity;

        // Numeric comparison for callCount
        if (sortField === 'callCount') {
            aVal = Number(aVal) || 0;
            bVal = Number(bVal) || 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination calculations
    const totalPages = Math.ceil(sortedLeads.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, sortedLeads.length);
    const paginatedLeads = sortedLeads.slice(startIndex, endIndex);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(Number(e.target.value));
    };

    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxVisiblePages = 7;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            if (currentPage <= 4) {
                for (let i = 1; i <= 5; i++) {
                    pageNumbers.push(i);
                }
                pageNumbers.push('ellipsis');
                pageNumbers.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                pageNumbers.push(1);
                pageNumbers.push('ellipsis');
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    pageNumbers.push(i);
                }
            } else {
                pageNumbers.push(1);
                pageNumbers.push('ellipsis');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pageNumbers.push(i);
                }
                pageNumbers.push('ellipsis');
                pageNumbers.push(totalPages);
            }
        }

        return pageNumbers;
    };

    if (leads.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No leads found</h3>
                <p>Add your first lead to get started</p>
            </div>
        );
    }

    const PaginationControls = () => (
        <div className="pagination-controls">
            <div className="pagination-info">
                <span>
                    Showing {startIndex + 1}-{endIndex} of {leads.length} leads
                </span>
                <div className="items-per-page">
                    <label htmlFor="itemsPerPage">Items per page:</label>
                    <select
                        id="itemsPerPage"
                        value={itemsPerPage}
                        onChange={handleItemsPerPageChange}
                        className="items-per-page-select"
                    >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                    </select>
                </div>
            </div>
            <div className="pagination-buttons">
                <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    Previous
                </button>
                {getPageNumbers().map((pageNumber, index) => {
                    if (pageNumber === 'ellipsis') {
                        return (
                            <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                                ...
                            </span>
                        );
                    }
                    return (
                        <button
                            key={pageNumber}
                            className={`pagination-btn ${currentPage === pageNumber ? 'active' : ''}`}
                            onClick={() => handlePageChange(pageNumber)}
                        >
                            {pageNumber}
                        </button>
                    );
                })}
                <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    Next
                </button>
            </div>
        </div>
    );

    return (
        <div className="list-view-container">
            <BulkActionToolbar
                selectedCount={selectedLeads.size}
                totalCount={leads.length}
                onSelectAll={handleSelectAll}
                onClearSelection={handleClearSelection}
                onBulkAction={handleBulkAction}
                isServerSideMode={isServerSideMode}
                onOpenBulkModal={handleOpenBulkModal}
            />
            <PaginationControls />
            <table className="leads-table">
                <thead>
                    <tr>
                        <th className="checkbox-cell">
                            <input
                                type="checkbox"
                                checked={isAllPageSelected()}
                                ref={el => {
                                    if (el) el.indeterminate = isSomePageSelected();
                                }}
                                onChange={handleHeaderCheckboxChange}
                                title={isAllPageSelected() ? "Deselect page" : "Select page"}
                            />
                        </th>
                        <th>Status</th>
                        <th>Name</th>
                        <th>Company</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Location</th>
                        <th>Campaign</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th
                            className="sortable-header"
                            onClick={() => handleSort('callCount')}
                            title="Click to sort by call count"
                        >
                            Calls {getSortIcon('callCount')}
                        </th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedLeads.map((lead) => (
                        <tr key={lead.id} className={`lead-row ${selectedLeads.has(lead.id) ? 'selected' : ''}`}>
                            <td className="checkbox-cell">
                                <input
                                    type="checkbox"
                                    checked={selectedLeads.has(lead.id)}
                                    onChange={() => handleSelectLead(lead.id)}
                                />
                            </td>
                            <td className="status-dot-cell">
                                <span
                                    className="status-dot"
                                    style={{ backgroundColor: STATUS_COLORS[lead.status] || '#94a3b8' }}
                                    title={lead.status || 'new'}
                                ></span>
                            </td>
                            <td className="lead-name-cell">
                                <strong>{lead.name || 'No Name'}</strong>
                            </td>
                            <td>{lead.company || '-'}</td>
                            <td className="phone-cell">
                                {lead.phone ? (
                                    <>
                                        <span>{lead.phone}</span>
                                        <button
                                            className="btn-call-small"
                                            onClick={() => handleCall(lead.phone, lead.id)}
                                            title="Call"
                                        >
                                            📞
                                        </button>
                                    </>
                                ) : (
                                    'No phone'
                                )}
                            </td>
                            <td className="email-cell">{lead.email || 'No email'}</td>
                            <td>{lead.location || 'No location'}</td>
                            <td>
                                <select
                                    className="campaign-select-inline"
                                    value={lead.campaignId || ''}
                                    onChange={(e) => handleCampaignChange(lead.id, e.target.value)}
                                >
                                    <option value="">No Campaign</option>
                                    {campaigns.map(campaign => (
                                        <option key={campaign.id} value={campaign.id}>
                                            {campaign.name}
                                        </option>
                                    ))}
                                </select>
                            </td>
                            <td>
                                <span
                                    className="priority-badge"
                                    style={{ backgroundColor: PRIORITY_COLORS[lead.priority] || '#94a3b8' }}
                                >
                                    {lead.priority || 'N/A'}
                                </span>
                            </td>
                            <td>
                                <select
                                    className="status-select-inline"
                                    value={lead.status || 'new'}
                                    onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                    style={{ borderColor: STATUS_COLORS[lead.status] || '#94a3b8' }}
                                >
                                    {statuses.map(status => (
                                        <option
                                            key={status.id}
                                            value={status.name.toLowerCase().replace(/\s+/g, '_')}
                                        >
                                            {status.name}
                                        </option>
                                    ))}
                                </select>
                            </td>
                            <td className="call-count-cell">
                                <span className="call-count-badge">
                                    {lead.callCount || 0}
                                </span>
                            </td>
                            <td>{formatDate(lead.createdAt)}</td>
                            <td className="actions-cell">
                                <button
                                    className="btn-icon-small"
                                    onClick={() => onEditLead(lead)}
                                    title="Edit"
                                >
                                    ✏️
                                </button>
                                <button
                                    className="btn-icon-small"
                                    onClick={() => onDeleteLead(lead.id)}
                                    title="Delete"
                                >
                                    🗑️
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <PaginationControls />

            <BulkActionModal
                isOpen={bulkModalOpen}
                onClose={() => {
                    setBulkModalOpen(false);
                    setBulkAction(null);
                    setIsServerSideMode(false);
                }}
                action={bulkAction}
                selectedLeadIds={Array.from(selectedLeads)}
                filters={{}}
                isServerSideMode={isServerSideMode}
                matchingCount={leads.length}
                onSuccess={handleBulkSuccess}
                campaigns={campaigns}
                statuses={statuses}
                users={users}
            />
        </div>
    );
};

export default LeadListView;
