import React from 'react';
import { ApiResponse } from '../hooks/useApi';

interface Props {
  data: ApiResponse | null;
}

export default function NewsMeta({ data }: Props) {
  if (!data?.meta) return null;

  const items = [
    { icon: '📍', label: 'Region', value: data.meta.region },
    { icon: '�️', label: 'Language', value: data.meta.language },
    { icon: '�📂', label: 'Category', value: data.meta.category },
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
}
