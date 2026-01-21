import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../../services/api';
import './CampaignDetail.css';

const PAGE_SIZE_OPTIONS = [50, 100, 200];
const VIRTUAL_ROW_HEIGHT = 56; // Height of each lead row in pixels
const UNASSIGNED_CAMPAIGN_ID = '__unassigned__';

const CampaignDetail = ({ campaign, users, isAdmin, onUserAssignment, onClose, onRefresh }) => {
    const isUnassignedCampaign = campaign?.id === UNASSIGNED_CAMPAIGN_ID;
    const [activeTab, setActiveTab] = useState('users');
    const [leads, setLeads] = useState([]);
    const [allLeads, setAllLeads] = useState([]);
    const [loadingLeads, setLoadingLeads] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [selectedLeadIds, setSelectedLeadIds] = useState([]);
    const [showAssignLeads, setShowAssignLeads] = useState(false);
    const [saving, setSaving] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [totalLeads, setTotalLeads] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Bulk assign leads to user state
    const [selectedLeadsForAssign, setSelectedLeadsForAssign] = useState(new Set());
    const [assignToUser, setAssignToUser] = useState('');

    // Virtual scrolling state
    const scrollContainerRef = useRef(null);
    const [scrollTop, setScrollTop] = useState(0);

    useEffect(() => {
        if (campaign) {
            setSelectedUserIds(campaign.assignedUsers?.map(u => u.id) || []);
            setCurrentPage(1);
            setSelectedLeadsForAssign(new Set());
            // Default to leads tab for unassigned campaign (no users tab)
            if (campaign.id === UNASSIGNED_CAMPAIGN_ID) {
                setActiveTab('leads');
            }
        }
    }, [campaign?.id]);

    // Fetch leads when campaign, page, or page size changes
    useEffect(() => {
        if (campaign && activeTab === 'leads' && !showAssignLeads) {
            fetchCampaignLeads(currentPage);
        }
    }, [campaign?.id, currentPage, itemsPerPage, activeTab, showAssignLeads]);

    // Handle page size change - reset to page 1
    const handlePageSizeChange = (newSize) => {
        setItemsPerPage(newSize);
        setCurrentPage(1);
        setSelectedLeadsForAssign(new Set());
    };

    const fetchCampaignLeads = async (page = 1) => {
        try {
            setLoadingLeads(true);
            // Use different API for unassigned leads
            const response = isUnassignedCampaign
                ? await api.getUnassignedLeads(page, itemsPerPage)
                : await api.getCampaignLeads(campaign.id, page, itemsPerPage);
            setLeads(response.leads || []);
            setTotalLeads(response.pagination?.total || 0);
            setTotalPages(response.pagination?.totalPages || 0);
        } catch (err) {
            console.error('Error fetching campaign leads:', err);
        } finally {
            setLoadingLeads(false);
        }
    };

    const fetchAllLeadsForAssign = async () => {
        try {
            setLoadingLeads(true);
            const response = await api.getLeads();
            const allLeadsData = response.leads || [];
            setAllLeads(allLeadsData);
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
            setCurrentPage(1);
            await fetchCampaignLeads(1);
            onRefresh();
        } catch (err) {
            console.error('Error assigning leads:', err);
            alert('Failed to assign leads');
        } finally {
            setSaving(false);
        }
    };

    // Optimistic UI update for removing a lead
    const handleRemoveLeadFromCampaign = async (leadId) => {
        // Optimistic update - remove immediately from UI
        const previousLeads = leads;
        setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
        setTotalLeads(prev => Math.max(0, prev - 1));

        try {
            await api.bulkAssignLeadsToCampaign([leadId], null);
            // Background refresh for counts (don't await)
            onRefresh?.();
        } catch (err) {
            console.error('Error removing lead:', err);
            // Rollback on error
            setLeads(previousLeads);
            setTotalLeads(prev => prev + 1);
            alert('Failed to remove lead from campaign');
        }
    };

    // Toggle lead selection for bulk assign to user - optimized with useCallback
    const handleLeadSelectForAssign = useCallback((leadId) => {
        setSelectedLeadsForAssign(prev => {
            const newSet = new Set(prev);
            if (newSet.has(leadId)) {
                newSet.delete(leadId);
            } else {
                newSet.add(leadId);
            }
            return newSet;
        });
    }, []);

    // Select/deselect all leads on current page - optimized
    const handleSelectAllForAssign = useCallback((checked) => {
        if (checked) {
            setSelectedLeadsForAssign(new Set(leads.map(l => l.id)));
        } else {
            setSelectedLeadsForAssign(new Set());
        }
    }, [leads]);

    // Bulk assign selected leads to user with optimistic update
    const handleBulkAssignToUser = async () => {
        if (selectedLeadsForAssign.size === 0) {
            alert('Please select at least one lead');
            return;
        }

        const leadIds = Array.from(selectedLeadsForAssign);
        const previousLeads = leads;

        // Optimistic update
        setLeads(prevLeads => prevLeads.map(lead => {
            if (selectedLeadsForAssign.has(lead.id)) {
                return {
                    ...lead,
                    assignedTo: assignToUser || null,
                    assignedUser: assignToUser ? users.find(u => u.id === assignToUser) : null
                };
            }
            return lead;
        }));
        setSelectedLeadsForAssign(new Set());
        const savedAssignToUser = assignToUser;
        setAssignToUser('');

        try {
            setSaving(true);
            await api.bulkAction({
                action: 'assign_user',
                leadIds: leadIds,
                targetValue: savedAssignToUser || null
            });
            // Background refresh (don't await)
            onRefresh?.();
        } catch (err) {
            console.error('Error assigning leads to user:', err);
            // Rollback
            setLeads(previousLeads);
            setSelectedLeadsForAssign(new Set(leadIds));
            setAssignToUser(savedAssignToUser);
            alert('Failed to assign leads to user');
        } finally {
            setSaving(false);
        }
    };

    // Get users assigned to this campaign for the dropdown
    const campaignUsers = useMemo(() =>
        users.filter(u => campaign.assignedUsers?.some(au => au.id === u.id)),
        [users, campaign.assignedUsers]
    );

    const unassignedLeads = useMemo(() =>
        allLeads.filter(lead => !lead.campaignId),
        [allLeads]
    );

    // Handle scroll for virtual scrolling
    const handleScroll = useCallback((e) => {
        setScrollTop(e.target.scrollTop);
    }, []);

    // Calculate visible items for virtual scrolling
    const visibleLeads = useMemo(() => {
        if (!scrollContainerRef.current || leads.length <= 20) {
            return { items: leads, startIndex: 0, paddingTop: 0, paddingBottom: 0 };
        }

        const containerHeight = scrollContainerRef.current.clientHeight || 400;
        const totalHeight = leads.length * VIRTUAL_ROW_HEIGHT;
        const startIndex = Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT);
        const visibleCount = Math.ceil(containerHeight / VIRTUAL_ROW_HEIGHT) + 2;
        const endIndex = Math.min(startIndex + visibleCount, leads.length);

        return {
            items: leads.slice(startIndex, endIndex),
            startIndex,
            paddingTop: startIndex * VIRTUAL_ROW_HEIGHT,
            paddingBottom: Math.max(0, (leads.length - endIndex) * VIRTUAL_ROW_HEIGHT)
        };
    }, [leads, scrollTop]);

    // Show add leads view
    const handleShowAddLeads = () => {
        setShowAssignLeads(true);
        fetchAllLeadsForAssign();
    };

    // Pagination controls
    const PaginationControls = ({ showPageSize = false }) => {
        return (
            <div className="pagination-controls">
                {showPageSize && (
                    <div className="page-size-selector">
                        <label htmlFor="pageSize">Show:</label>
                        <select
                            id="pageSize"
                            value={itemsPerPage}
                            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                            className="page-size-select"
                        >
                            {PAGE_SIZE_OPTIONS.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
                )}
                {totalPages > 1 && (
                    <>
                        <button
                            className="btn btn-small"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                        >
                            &laquo;
                        </button>
                        <button
                            className="btn btn-small"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            &lsaquo;
                        </button>
                    </>
                )}
                <span className="page-info">
                    Page {currentPage} of {totalPages || 1} ({totalLeads} leads)
                </span>
                {totalPages > 1 && (
                    <>
                        <button
                            className="btn btn-small"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            &rsaquo;
                        </button>
                        <button
                            className="btn btn-small"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                        >
                            &raquo;
                        </button>
                    </>
                )}
            </div>
        );
    };

    // Memoized lead row component
    const LeadRow = React.memo(({ lead, isSelected, onSelect, onRemove, assignedUserName }) => (
        <div className={`lead-item ${isSelected ? 'selected' : ''}`}>
            {isAdmin && (
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(lead.id)}
                />
            )}
            <div className="lead-info">
                <span className="lead-name">{lead.name}</span>
                <span className="lead-phone">{lead.phone}</span>
                {lead.company && (
                    <span className="lead-company">{lead.company}</span>
                )}
            </div>
            <div className="lead-meta">
                {assignedUserName && (
                    <span className="assigned-user">{assignedUserName}</span>
                )}
                <span className={`status-badge status-${lead.status}`}>
                    {lead.status}
                </span>
                {isAdmin && (
                    <button
                        className="btn btn-small btn-danger"
                        onClick={() => onRemove(lead.id)}
                        disabled={saving}
                        title="Remove from campaign"
                    >
                        &times;
                    </button>
                )}
            </div>
        </div>
    ));

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
                {!isUnassignedCampaign && (
                    <button
                        className={`tab ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        Users ({campaign.assignedUsers?.length || 0})
                    </button>
                )}
                <button
                    className={`tab ${activeTab === 'leads' ? 'active' : ''}`}
                    onClick={() => setActiveTab('leads')}
                >
                    Leads ({totalLeads || campaign.leadCount || 0})
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'users' && (
                    <div className="users-tab">
                        <div className="users-header">
                            <p className="tab-description">
                                Assign users to this campaign. Assigned users can work on leads in this campaign.
                            </p>
                            {isAdmin && (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSaveUserAssignments}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save User Assignments'}
                                </button>
                            )}
                        </div>
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
                                            onClick={handleShowAddLeads}
                                        >
                                            + Add Leads
                                        </button>
                                    )}
                                </div>

                                {/* Bulk assign to user toolbar */}
                                {isAdmin && leads.length > 0 && (
                                    <div className="bulk-assign-toolbar">
                                        <label className="select-all-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedLeadsForAssign.size === leads.length && leads.length > 0}
                                                onChange={(e) => handleSelectAllForAssign(e.target.checked)}
                                            />
                                            <span>Select Page ({leads.length})</span>
                                        </label>
                                        {selectedLeadsForAssign.size > 0 && (
                                            <div className="bulk-assign-controls">
                                                <span className="selected-count">{selectedLeadsForAssign.size} selected</span>
                                                <select
                                                    value={assignToUser}
                                                    onChange={(e) => setAssignToUser(e.target.value)}
                                                    className="user-select"
                                                >
                                                    <option value="">Unassigned</option>
                                                    {campaignUsers.length > 0 ? (
                                                        campaignUsers.map(u => (
                                                            <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                                        ))
                                                    ) : (
                                                        users.map(u => (
                                                            <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                                        ))
                                                    )}
                                                </select>
                                                <button
                                                    className="btn btn-primary btn-small"
                                                    onClick={handleBulkAssignToUser}
                                                    disabled={saving}
                                                >
                                                    {saving ? 'Assigning...' : 'Assign'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <PaginationControls showPageSize={true} />

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
                                    <div
                                        className="lead-list virtual-scroll"
                                        ref={scrollContainerRef}
                                        onScroll={handleScroll}
                                    >
                                        <div style={{ paddingTop: visibleLeads.paddingTop }}>
                                            {visibleLeads.items.map(lead => {
                                                const assignedUser = lead.assignedUser || users.find(u => u.id === lead.assignedTo);
                                                const assignedUserName = assignedUser?.name || assignedUser?.email?.split('@')[0];
                                                return (
                                                    <LeadRow
                                                        key={lead.id}
                                                        lead={lead}
                                                        isSelected={selectedLeadsForAssign.has(lead.id)}
                                                        onSelect={handleLeadSelectForAssign}
                                                        onRemove={handleRemoveLeadFromCampaign}
                                                        assignedUserName={assignedUserName}
                                                    />
                                                );
                                            })}
                                        </div>
                                        <div style={{ height: visibleLeads.paddingBottom }} />
                                    </div>
                                )}

                                <PaginationControls />
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
                                {loadingLeads ? (
                                    <div className="loading-state">
                                        <div className="spinner"></div>
                                        <p>Loading leads...</p>
                                    </div>
                                ) : unassignedLeads.length === 0 ? (
                                    <div className="empty-state">
                                        <p>All leads are already assigned to campaigns</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="select-all-bar">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLeadIds.length === unassignedLeads.length && unassignedLeads.length > 0}
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
                                            {unassignedLeads.slice(0, 100).map(lead => (
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
                                            {unassignedLeads.length > 100 && (
                                                <div className="more-leads-notice">
                                                    Showing first 100 of {unassignedLeads.length} unassigned leads.
                                                    Use filters on the Leads page for more control.
                                                </div>
                                            )}
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
