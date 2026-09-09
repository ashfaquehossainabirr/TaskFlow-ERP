import { useEffect, useMemo, useRef, useState } from 'react';
import { inputStyle } from './formStyles';

/**
 * Generic searchable single-select combobox.
 *
 * Type-to-filter dropdown that replaces a plain <select> for lists where
 * scanning a long dropdown is painful (clients, projects, employees…).
 *
 * Props:
 * - items: array of records to choose from
 * - value: selected record's id (or '' / null for none)
 * - onChange(id): called with the selected record's id, or '' when cleared
 * - getId(item): returns the record's id — defaults to item._id
 * - getLabel(item): returns the primary text shown for a record
 * - getSubLabel(item): optional secondary text (right-aligned in the list, muted)
 * - placeholder: input placeholder
 * - emptyOptionLabel: label used when nothing matches the query
 * - noneLabel: text shown when the field is cleared and unfocused (e.g. "Unassigned")
 */
export default function SearchSelect({
  items,
  value,
  onChange,
  getId = (item) => item._id,
  getLabel,
  getSubLabel,
  placeholder = 'Search…',
  emptyOptionLabel = 'No matches',
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(
    () => items.find((item) => getId(item) === value) || null,
    [items, value, getId]
  );

  useEffect(() => {
    if (!isOpen) {
      setQuery(selected ? getLabel(selected) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && getLabel(selected).toLowerCase() === q)) return items;
    return items.filter((item) => {
      const label = (getLabel(item) || '').toLowerCase();
      const sub = (getSubLabel?.(item) || '').toLowerCase();
      return label.includes(q) || sub.includes(q);
    });
  }, [items, query, selected, getLabel, getSubLabel]);

  useEffect(() => {
    if (highlighted >= filtered.length) setHighlighted(0);
  }, [filtered, highlighted]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openList = () => {
    setIsOpen(true);
    setHighlighted(0);
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const selectItem = (item) => {
    onChange(item ? getId(item) : '');
    setQuery(item ? getLabel(item) : '');
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlighted]) selectItem(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery(selected ? getLabel(selected) : '');
    }
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        style={inputStyle}
        value={query}
        placeholder={placeholder}
        onFocus={openList}
        onClick={openList}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
      />
      {selected && !isOpen && (
        <button
          type="button"
          onClick={() => selectItem(null)}
          aria-label="Clear selection"
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 16,
            cursor: 'pointer',
            lineHeight: 1,
            padding: 2,
          }}
        >
          ×
        </button>
      )}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: 200,
            overflowY: 'auto',
            background: 'var(--bg-panel-raised)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 8,
            boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
            zIndex: 50,
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 13.5, color: 'var(--text-muted)' }}>
              {emptyOptionLabel} "{query}"
            </div>
          ) : (
            filtered.map((item, i) => {
              const id = getId(item);
              const sub = getSubLabel?.(item);
              return (
                <div
                  key={id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectItem(item);
                  }}
                  onMouseEnter={() => setHighlighted(i)}
                  style={{
                    padding: '9px 12px',
                    fontSize: 13.5,
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    background: i === highlighted ? 'var(--bg-inset)' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <span>{getLabel(item)}</span>
                  {sub && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{sub}</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
