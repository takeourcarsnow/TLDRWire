import React from 'react';
import { ApiResponse } from '../hooks/useApi';
import TwEmoji from './TwEmoji';
import { MapPin, Globe, Folder, PenTool, Clock, BarChart, Ruler } from 'lucide-react';

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
    { icon: <MapPin size={14} />, label: 'Region', value: sanitize(data.meta.region) },
    { icon: <Globe size={14} />, label: 'Language', value: lang },
    { icon: <Folder size={14} />, label: 'Category', value: sanitize(data.meta.category) },
    { icon: <PenTool size={14} />, label: 'Style', value: sanitize(data.meta.style) },
    { icon: <Clock size={14} />, label: 'Window', value: `${sanitize(data.meta.timeframeHours)}h` },
    { icon: <BarChart size={14} />, label: 'Articles', value: sanitize(data.meta.usedArticles) },
    data.meta.length ? { icon: <Ruler size={14} />, label: 'Length', value: sanitize(data.meta.length) } : null,
    // model intentionally hidden from meta topbar
  ].filter(Boolean).filter(item => item!.value && item!.value.trim());

  if (items.length === 0) return null;

  return (
    <div className="meta">
      <div className="meta-strip">
        <div className="meta-strip-inner" role="list">
          {items.concat(items).map((item, idx) => (
            <span key={idx} className="meta-item" role="listitem">
              {item!.icon} {item!.value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
