import React from 'react';
import './LeadFilters.css';

const LeadFilters = ({ filters, onFilterChange, onSortChange, onGroupChange, leadCount }) => {
    return (
        <div className="lead-filters">
            <div className="filter-section">
                <div className="filter-group">
                    <label className="filter-label">Status</label>
                    <select
                        className="filter-select"
                        value={filters.status}
                        onChange={(e) => onFilterChange('status', e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="quoted">Quoted</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
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
                    </select>
                </div>

                <div className="filter-stats">
                    <span className="lead-count">{leadCount} leads</span>
                </div>

                {(filters.status !== 'all' || filters.priority !== 'all') && (
                    <button
                        className="btn-clear-filters"
                        onClick={() => {
                            onFilterChange('status', 'all');
                            onFilterChange('priority', 'all');
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
