import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './LeadListView.css';

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

const LeadListView = ({ leads, onEditLead, onDeleteLead, onUpdateStatus, onCall }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [statuses, setStatuses] = useState([]);

    // Fetch statuses on mount
    useEffect(() => {
        fetchStatuses();
    }, []);

    // Reset to page 1 when leads or itemsPerPage changes
    useEffect(() => {
        setCurrentPage(1);
    }, [leads.length, itemsPerPage]);

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

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleStatusChange = (leadId, newStatus) => {
        onUpdateStatus(leadId, newStatus);
    };

    const handleCall = (phoneNumber, leadId) => {
        if (phoneNumber) {
            onCall(phoneNumber, leadId);
        }
    };

    // Pagination calculations
    const totalPages = Math.ceil(leads.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, leads.length);
    const paginatedLeads = leads.slice(startIndex, endIndex);

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
            <PaginationControls />
            <table className="leads-table">
                <thead>
                    <tr>
                        <th>Status</th>
                        <th>Name</th>
                        <th>Company</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Location</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedLeads.map((lead) => (
                        <tr key={lead.id} className="lead-row">
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
        </div>
    );
};

export default LeadListView;
