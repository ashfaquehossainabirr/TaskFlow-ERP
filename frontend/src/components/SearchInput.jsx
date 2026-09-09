import { useEffect, useState } from 'react';

// A text input that reports changes to the parent only after the user has
// stopped typing for `delay` ms. The input itself stays instantly responsive
// (no lag while typing) — only the value handed back via onChange is debounced,
// so expensive work like filtering a table doesn't re-run on every keystroke.
export default function SearchInput({
  value = '',
  onChange,
  placeholder = 'Search…',
  delay = 300,
  maxWidth = 420,
  style,
}) {
  const [text, setText] = useState(value);

  // Keep in sync if the parent resets the value externally (e.g. a "clear filters" action).
  useEffect(() => {
    setText(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (text !== value) onChange(text);
    }, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delay]);

  return (
    <div style={{ position: 'relative', maxWidth, width: '100%', ...style }}>
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={{
          position: 'absolute',
          left: 11,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'var(--bg-inset)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 8,
          padding: '9px 32px 9px 32px',
          fontSize: 13.5,
          color: 'var(--text-primary)',
        }}
      />
      {text && (
        <button
          type="button"
          onClick={() => setText('')}
          aria-label="Clear search"
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 15,
            lineHeight: 1,
            cursor: 'pointer',
            padding: 2,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
