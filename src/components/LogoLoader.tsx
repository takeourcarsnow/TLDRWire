import React from 'react';

type Props = {
  hidden?: boolean;
};

// Inline the SVG and use `currentColor` for fill so the logo color follows
// the document `color` (which we set via CSS variables). This prevents any
// flash caused by external image rendering and avoids relying on filters.
export default function LogoLoader({ hidden = false }: Props) {
  return (
    <div className={`logo-loader${hidden ? ' hidden' : ''}`} aria-hidden="true">
      <img
        className="logo-loader__img"
        src="/logo.png"
        width="192"
        height="192"
        alt="TLDRWire logo"
        role="img"
      />
    </div>
  );
}
