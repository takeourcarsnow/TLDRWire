import React from 'react';

interface Props {
  isLoading: boolean;
  error: string | null;
  dataCached?: boolean;
}

export default function NewsStatus({ isLoading, error, dataCached }: Props) {
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

    return <div className="error fade-in">{message}</div>;
  }

  if (dataCached) {
    return <div className="success fade-in">📱 Loaded from cache for faster response</div>;
  }

  return null;
}
