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
    <div className="btn-group" style={{ marginBottom: '16px', gap: '8px' }}>
      <div className="btn-group">
        <button className="secondary" type="button" title="Copy summary" onClick={onCopy} style={{ flex: 'none', minWidth: 0 }}>
          <Copy size={16} />
        </button>
        <button className="secondary" type="button" title="Share summary" onClick={onShare} style={{ flex: 'none', minWidth: 0 }}>
          <Share size={16} />
        </button>
        <button className="secondary" type="button" title="History" onClick={onHistory} style={{ flex: 'none', minWidth: 0 }}>
          <History size={16} />
        </button>
        <button className="secondary" type="button" title="Print summary" onClick={onPrint} style={{ flex: 'none', minWidth: 0 }}>
          <Printer size={16} />
        </button>
      </div>
    </div>
  );
}
