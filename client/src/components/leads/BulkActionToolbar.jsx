import React from 'react';
import './BulkActionToolbar.css';

const BulkActionToolbar = ({
    selectedCount,
    totalCount,
    onSelectAll,
    onClearSelection,
    onBulkAction,
    isServerSideMode,
    onOpenBulkModal
}) => {
    const BULK_THRESHOLD = 250;

    if (selectedCount === 0 && !isServerSideMode) {
        return null;
    }

    return (
        <div className="bulk-action-toolbar">
            <div className="bulk-selection-info">
                {isServerSideMode ? (
                    <span className="selection-count">
                        <strong>{totalCount.toLocaleString()}</strong> leads match current filters
                    </span>
                ) : (
                    <span className="selection-count">
                        <strong>{selectedCount}</strong> of {totalCount.toLocaleString()} selected
                    </span>
                )}

                {!isServerSideMode && selectedCount > 0 && selectedCount < totalCount && totalCount <= BULK_THRESHOLD && (
                    <button className="btn-link" onClick={onSelectAll}>
                        Select all {totalCount}
                    </button>
                )}

                {!isServerSideMode && selectedCount > 0 && (
                    <button className="btn-link" onClick={onClearSelection}>
                        Clear selection
                    </button>
                )}

                {totalCount > BULK_THRESHOLD && !isServerSideMode && (
                    <button className="btn-link bulk-all-btn" onClick={onOpenBulkModal}>
                        Bulk action on all {totalCount.toLocaleString()} leads
                    </button>
                )}
            </div>

            {(selectedCount > 0 || isServerSideMode) && (
                <div className="bulk-actions">
                    <select
                        className="bulk-action-select"
                        onChange={(e) => {
                            if (e.target.value) {
                                onBulkAction(e.target.value);
                                e.target.value = '';
                            }
                        }}
                        defaultValue=""
                    >
                        <option value="" disabled>Bulk Actions...</option>
                        <option value="move_campaign">Move to Campaign</option>
                        <option value="change_status">Change Status</option>
                        <option value="change_priority">Change Priority</option>
                        <option value="assign_user">Assign to User</option>
                        <option value="delete">Delete</option>
                    </select>
                </div>
            )}
        </div>
    );
};

export default BulkActionToolbar;
