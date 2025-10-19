import React from 'react';
import { Search } from 'lucide-react';

interface HistorySearchProps {
  query: string;
  onQueryChange: (query: string) => void;
}

function HistorySearch({ query, onQueryChange }: HistorySearchProps) {
  return (
    <div className="history-search-wrapper">
      <div className="history-search-input-wrapper">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search history (region, category, style, text)"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="history-search-input"
        />
      </div>
    </div>
  );
}

export default HistorySearch;