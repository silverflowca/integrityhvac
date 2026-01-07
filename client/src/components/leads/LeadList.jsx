import React from 'react';
import LeadCard from './LeadCard';
import './LeadList.css';

const LeadList = ({ leads, onEditLead, onDeleteLead, onUpdateStatus, onCall }) => {
    if (leads.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No leads found</h3>
                <p>Add your first lead to get started</p>
            </div>
        );
    }

    return (
        <div className="lead-list">
            {leads.map((lead) => (
                <LeadCard
                    key={lead.id}
                    lead={lead}
                    onEdit={onEditLead}
                    onDelete={onDeleteLead}
                    onUpdateStatus={onUpdateStatus}
                    onCall={onCall}
                />
            ))}
        </div>
    );
};

export default LeadList;
