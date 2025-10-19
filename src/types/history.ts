import { HistoryEntry } from '../hooks/useApi';

export interface HistoryListProps {
  history: HistoryEntry[];
  onApply: (payload: any) => void;
  onDelete: (id: number) => void;
  onClear: () => void;
  renderMarkdownToElement: (el: HTMLDivElement | null, markdown: string | undefined) => void;
}