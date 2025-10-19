import { ThemeToggle } from './ThemeToggle';

interface HomeHeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function HomeHeader({ theme, onToggleTheme }: HomeHeaderProps) {
  return (
    <header>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      <div className="header-content">
        <div className="header-main">
          <h1>TLDRWire</h1>
          <span className="tag">Get the news, minus the noise</span>
        </div>
      </div>
    </header>
  );
}