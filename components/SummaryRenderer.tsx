import React, { useEffect, useRef, useCallback } from 'react';
import { renderMarkdownToElement } from '../utils/rendering';


interface Props {
  summary?: string | null;
  isLoading: boolean;
  summaryRef: React.RefObject<HTMLDivElement>;
}

export default function SummaryRenderer({ summary, isLoading, summaryRef }: Props) {
  const internalRef = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const usedRef: React.RefObject<HTMLDivElement> = (summaryRef || internalRef) as React.RefObject<HTMLDivElement>;
    if (!usedRef.current || !summary) return;
    renderMarkdownToElement(usedRef.current, summary);
  }, [summary, summaryRef]);

  return (
    <article
      ref={summaryRef}
      className="summary"
      aria-label="News summary"
    >
      {!isLoading && !summary && (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: 'var(--muted)',
          fontSize: '16px'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '16px', opacity: 0.6 }}>📰</div>
          <p style={{ margin: '0', fontWeight: '500' }}>No summary yet</p>
          <p style={{ margin: '8px 0 0', fontSize: '14px', opacity: 0.8 }}>
            Generate a news summary to see results here
          </p>
        </div>
      )}
    </article>
  );
}
