import React from 'react';

function HistoryEmptyState() {
  return (
    <div className="history-empty-state">
      <div className="empty-icon">📝</div>
      <h3>No matching history</h3>
      <p>Generate a TLDR to save an entry.</p>
    </div>
  );
}

export default HistoryEmptyState;