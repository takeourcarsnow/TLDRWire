import React from 'react';
import { Copy, Share, History, Printer } from 'lucide-react';

interface Props {
  isHidden: boolean;
  onCopy: () => Promise<void> | void;
  onShare: () => Promise<void> | void;
  onHistory: () => void;
  onPrint: () => void;
}

export default function NewsControls({ isHidden, onCopy, onShare, onHistory, onPrint }: Props) {
  if (isHidden) return null;

  return (
    <div className="btn-group" style={{ marginBottom: '16px', gap: '8px', justifyContent: 'space-between' }}>
      <div className="btn-group" style={{ flex: 1 }}>
        <button className="secondary" type="button" title="Copy summary" onClick={onCopy}>
          <Copy size={16} /> Copy
        </button>
        <button className="secondary" type="button" title="Share summary" onClick={onShare}>
          <Share size={16} /> Share
        </button>
        <button className="secondary" type="button" title="History" onClick={onHistory}>
          <History size={16} /> History
        </button>
        <button className="secondary" type="button" title="Print summary" onClick={onPrint}>
          <Printer size={16} /> Print
        </button>
      </div>
    </div>
  );
}
