import React from 'react';
import twemoji from 'twemoji';

interface Props { text: string; className?: string }

export default function TwEmoji({ text, className }: Props) {
  const html = React.useMemo(() => {
    // twemoji.parse has incomplete types; cast to any to get the returned HTML string
    const parsed = (twemoji as any).parse(String(text || ''), { folder: 'svg', ext: '.svg' });
    return String(parsed || '');
  }, [text]);
  const cls = ['twemoji', className].filter(Boolean).join(' ');
  return <span className={cls} dangerouslySetInnerHTML={{ __html: html }} />;
}
