import React, { useEffect, useRef } from 'react';
import { ApiResponse } from '../hooks/useApi';

interface NewsOutputProps {
  isLoading: boolean;
  error: string | null;
  data: ApiResponse | null;
  lastRequest: any;
  compactMode: boolean;
}

// Region to Google country code mapping
const REGION_GL_MAP: { [key: string]: string } = {
  global: 'US',
  lithuania: 'LT',
  'united-states': 'US',
  'united-kingdom': 'GB',
  germany: 'DE',
  france: 'FR',
  india: 'IN',
  japan: 'JP',
  brazil: 'BR',
  australia: 'AU'
};

export function NewsOutput({ isLoading, error, data, lastRequest, compactMode }: NewsOutputProps) {
  const summaryRef = useRef<HTMLDivElement>(null);

  const renderSummary = (markdown: string) => {
    if (!summaryRef.current || !markdown) return;

    try {
      // Use marked and DOMPurify from global scope (loaded via script tags)
      const html = (window as any).DOMPurify.sanitize((window as any).marked.parse(markdown));
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const children = Array.from(temp.children);
      
      summaryRef.current.innerHTML = '';
      
      children.forEach((child, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'reveal-up';
        wrapper.style.animationDelay = `${Math.min(idx * 60, 360)}ms`;
        wrapper.appendChild(child);
        summaryRef.current!.appendChild(wrapper);
      });

      // Apply compact class if enabled
      if (compactMode) {
        summaryRef.current.classList.add('compact');
      } else {
        summaryRef.current.classList.remove('compact');
      }

      // Process links
      summaryRef.current.querySelectorAll('a').forEach((link) => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        
        try {
          const rawHref = link.getAttribute('href') || '';
          if (rawHref && !/^https?:/i.test(rawHref)) {
            return;
          }
          
          const href = rawHref || '#';
          let url = new URL(href, window.location.href);
          const host = (url.hostname || '').replace(/^www\./, '');
          const currentText = (link.textContent || '').trim();
          const looksLikeUrl = /^https?:\/\//i.test(currentText) || currentText === href;
          
          if (!currentText || looksLikeUrl || currentText.length > 42) {
            link.textContent = host || 'source';
          }
          
          link.title = `Open ${host || 'link'} in new tab`;

          // Handle Google News links
          const isGNews = /(^|\.)news\.google\.com$/i.test(url.hostname || '');
          if (isGNews) {
            // Try to resolve to publisher via url= param
            const raw = url.searchParams.get('url');
            if (raw) {
              try {
                const decoded = decodeURIComponent(raw);
                const candidate = new URL(decoded);
                url = candidate;
                const afterHost = (url.hostname || '').replace(/^www\./, '');
                if (afterHost && afterHost !== host) {
                  const txt = (link.textContent || '').trim();
                  if (!txt || txt === host || txt.length > 42) {
                    link.textContent = afterHost || 'source';
                  }
                }
              } catch {
                // Keep original Google News link
              }
            }
            link.setAttribute('href', url.toString());
          }
        } catch {
          const t = (link.textContent || '').trim();
          if (t.length > 42) link.textContent = t.slice(0, 40) + '…';
          link.title = 'Open link in new tab';
        }
      });
    } catch (error) {
      console.error('Error rendering markdown:', error);
      if (summaryRef.current) {
        summaryRef.current.textContent = markdown;
      }
    }
  };

  useEffect(() => {
    if (data?.summary) {
      renderSummary(data.summary);
    }
  }, [data?.summary, compactMode]);

  const copyToClipboard = async () => {
    const text = summaryRef.current?.innerText || '';
    if (!text.trim()) {
      alert('No summary to copy');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(text);
      // Show success message somehow
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Copy failed - try selecting text manually');
    }
  };

  const shareContent = async () => {
    const text = summaryRef.current?.innerText || '';
    if (!text.trim()) {
      alert('No summary to share');
      return;
    }
    
    const shareData = {
      title: `TLDRWire: ${lastRequest?.category || 'Top'} Stories`,
      text: text.slice(0, 500) + (text.length > 500 ? '...' : ''),
      url: window.location.href
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Share failed:', error);
        alert('Sharing failed');
      }
    }
  };

  const exportAsText = () => {
    const text = summaryRef.current?.innerText || '';
    if (!text.trim()) {
      alert('No summary to export');
      return;
    }
    
    const timestamp = new Date().toISOString();
  const content = `TLDRWire Summary\nGenerated: ${timestamp}\nRegion: ${lastRequest?.region || 'Unknown'}\nCategory: ${lastRequest?.category || 'Unknown'}\nStyle: ${lastRequest?.style || 'Unknown'}\n\n${text}\n\n---\nGenerated by TLDRWire (${window.location.href})`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const date = new Date().toISOString().split('T')[0];
    const region = lastRequest?.region?.replace(/\s+/g, '-').toLowerCase() || 'global';
    const category = lastRequest?.category?.replace(/\s+/g, '-').toLowerCase() || 'news';
  link.download = `tldrwire-${region}-${category}-${date}.txt`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printSummary = () => {
    window.print();
  };

  const renderMeta = () => {
    if (!data?.meta) return null;

    const items = [
      { icon: '📍', label: 'Region', value: data.meta.region },
      { icon: '📂', label: 'Category', value: data.meta.category },
      { icon: '✍️', label: 'Style', value: data.meta.style },
      { icon: '⏰', label: 'Window', value: `${data.meta.timeframeHours}h` },
      { icon: '📊', label: 'Articles', value: data.meta.usedArticles },
      data.meta.length ? { icon: '📏', label: 'Length', value: data.meta.length } : null,
      { icon: '🤖', label: 'Model', value: data.meta.model }
    ].filter(Boolean);

    return (
      <div className="meta">
        {items.map((item, idx) => (
          <span key={idx} className="meta-item">
            {item!.icon} {item!.value}
          </span>
        ))}
      </div>
    );
  };

  const renderStatus = () => {
    if (isLoading) {
      return (
        <div className="loader" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true"></span>
          <div className="message">
            <strong>Analyzing latest news…</strong>
            <span className="subtle">This usually takes a few seconds</span>
            <div className="progress" aria-hidden="true"></div>
          </div>
        </div>
      );
    }

    if (error) {
      let message = '❌ ';
      if (error.includes('GEMINI_API_KEY')) {
        message += 'Server configuration error. Please contact support.';
      } else if (error.toLowerCase().includes('timed out') || error.toLowerCase().includes('timeout')) {
        message += 'Request timed out. Please try again.';
      } else if (error.toLowerCase().includes('network') || error.toLowerCase().includes('fetch')) {
        message += 'Network error. Please check your connection and try again.';
      } else {
        message += `Error: ${error}`;
      }
      
      return (
        <div className="error fade-in">
          {message}
        </div>
      );
    }

    if (data?.cached) {
      return (
        <div className="success fade-in">
          📱 Loaded from cache for faster response
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {renderMeta()}
      <div id="status" role="alert" aria-live="assertive">
        {renderStatus()}
      </div>
      
      {!isLoading && !error && (
        <div className="btn-group" style={{ marginBottom: '16px', gap: '8px', justifyContent: 'space-between' }}>
          <div className="btn-group" style={{ flex: 1 }}>
            <button className="secondary" type="button" title="Copy summary" onClick={copyToClipboard}>
              📋 Copy
            </button>
            <button className="secondary" type="button" title="Share summary" onClick={shareContent}>
              🔗 Share
            </button>
            <button className="secondary" type="button" title="Export as text" onClick={exportAsText}>
              💾 Export
            </button>
            <button className="secondary" type="button" title="Print summary" onClick={printSummary}>
              🖨️ Print
            </button>
          </div>
        </div>
      )}
      
      <article 
        ref={summaryRef}
        className="summary" 
        aria-label="News summary"
        aria-busy={isLoading}
      >
        {isLoading && (
          <>
            <div className="skeleton" style={{ height: '20px', width: '55%', margin: '10px 0' }}></div>
            <div className="skeleton" style={{ height: '14px', width: '100%', margin: '8px 0' }}></div>
            <div className="skeleton" style={{ height: '14px', width: '96%', margin: '8px 0' }}></div>
            <div className="skeleton" style={{ height: '14px', width: '90%', margin: '8px 0 16px' }}></div>
            <div className="skeleton" style={{ height: '16px', width: '45%', margin: '8px 0' }}></div>
            <div className="skeleton" style={{ height: '14px', width: '98%', margin: '8px 0' }}></div>
            <div className="skeleton" style={{ height: '14px', width: '93%', margin: '8px 0' }}></div>
          </>
        )}
      </article>
    </>
  );
}