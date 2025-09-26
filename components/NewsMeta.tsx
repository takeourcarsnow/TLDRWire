import React from 'react';
import { ApiResponse } from '../hooks/useApi';
import TwEmoji from './TwEmoji';

interface Props {
  data: ApiResponse | null;
}

export default function NewsMeta({ data }: Props) {
  if (!data?.meta) return null;

  const sanitize = (s: any) => {
    try {
      return String(s || '').replace(/\uFFFD/g, '').trim();
    } catch (e) { return String(s || ''); }
  };

  const lang = sanitize(data.meta.language) || '';
  const items = [
    { icon: <TwEmoji text={'📍'} />, label: 'Region', value: sanitize(data.meta.region) },
    { icon: <TwEmoji text={'🌐'} />, label: 'Language', value: lang },
    { icon: '📂', label: 'Category', value: sanitize(data.meta.category) },
    { icon: '✍️', label: 'Style', value: sanitize(data.meta.style) },
    { icon: '⏰', label: 'Window', value: `${sanitize(data.meta.timeframeHours)}h` },
    { icon: '📊', label: 'Articles', value: sanitize(data.meta.usedArticles) },
    data.meta.length ? { icon: '📏', label: 'Length', value: sanitize(data.meta.length) } : null,
    // model intentionally hidden from meta topbar
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
