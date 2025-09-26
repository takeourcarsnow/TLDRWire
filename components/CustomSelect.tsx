import React from 'react';
import TwEmoji from './TwEmoji';

interface Option {
  value: string;
  label: string;
  icon?: string;
}

interface Props {
  id?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
}

export default function CustomSelect({ id, value, options, onChange, className }: Props) {
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState<number>(() => Math.max(0, options.findIndex(o => o.value === value)));
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLUListElement | null>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  React.useEffect(() => {
    const idx = options.findIndex(o => o.value === value);
    setHighlight(idx >= 0 ? idx : 0);
  }, [value, options]);

  const toggle = () => setOpen(o => !o);

  const onKeyDown: React.KeyboardEventHandler = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight(h => Math.min(options.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setHighlight(h => Math.max(0, h - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      const opt = options[highlight];
      if (opt) onChange(opt.value);
      setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleOptionClick = (idx: number) => {
    const opt = options[idx];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  };

  const selected = options.find(o => o.value === value) || options[0];

  const listId = id ? `${id}-list` : `custom-select-list-${Math.random().toString(36).slice(2,8)}`;
  const activeId = `${listId}-option-${highlight}`;

  return (
    <div ref={rootRef} className={`custom-select ${className || ''}`} onKeyDown={onKeyDown} tabIndex={0} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-activedescendant={open ? activeId : undefined}>
      <button type="button" aria-expanded={open} aria-controls={id ? `${id}-list` : undefined} className="custom-select-button" onClick={toggle}>
        {selected?.icon ? <TwEmoji text={selected.icon} /> : null}
        <span className="custom-select-label">{selected?.label}</span>
        <span className="custom-select-caret">▾</span>
      </button>
      {open && (
        <ul id={listId} role="listbox" ref={listRef} className="custom-select-list">
          {options.map((opt, i) => {
            const optionId = `${listId}-option-${i}`;
            return (
              <li
                key={opt.value}
                id={optionId}
                role="option"
                aria-selected={opt.value === value}
                className={`custom-select-option ${i === highlight ? 'highlight' : ''}`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => handleOptionClick(i)}
              >
                {opt.icon ? <TwEmoji text={opt.icon} /> : null}
                <span className="custom-select-option-label">{opt.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
