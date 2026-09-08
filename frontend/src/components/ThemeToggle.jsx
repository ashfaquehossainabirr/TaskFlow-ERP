import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        style={{
          width: 34,
          height: 34,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-inset)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 8,
          color: 'var(--text-secondary)',
          padding: 0,
        }}
      >
        {isLight ? <SunIcon /> : <MoonIcon />}
      </button>
    );
  }
  
  return (
    <button
      onClick={toggleTheme}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        background: 'var(--bg-inset)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 8,
        color: 'var(--text-secondary)',
        padding: '8px 12px',
        fontSize: 12.5,
        fontWeight: 500,
      }}
    >
      {isLight ? <SunIcon /> : <MoonIcon />}
      {isLight ? 'Light mode' : 'Dark mode'}
    </button>
  );
}
function SunIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4.5" />
      <line x1="12" y1="1.5" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22.5" />
      <line x1="4.2" y1="4.2" x2="5.9" y2="5.9" />
      <line x1="18.1" y1="18.1" x2="19.8" y2="19.8" />
      <line x1="1.5" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22.5" y2="12" />
      <line x1="4.2" y1="19.8" x2="5.9" y2="18.1" />
      <line x1="18.1" y1="5.9" x2="19.8" y2="4.2" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
