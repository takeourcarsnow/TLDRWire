import { useEffect } from 'react';

export function useKeyboardShortcuts(onGenerate: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        (async () => {
          try {
            await onGenerate();
          } catch (err) {
            console.warn('generateSummary failed via keyboard', err);
          }
        })();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onGenerate]);
}