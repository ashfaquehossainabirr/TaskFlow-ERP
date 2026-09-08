import { useEffect, useMemo, useRef, useState } from 'react';
import { inputStyle } from './formStyles';

const displayName = (emp) => (emp ? `${emp.name}${emp.department ? ` — ${emp.department}` : ''}` : '');

export default function EmployeeSearchSelect({
  employees,
  value,
  onChange,
  placeholder = 'Search employees…',
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(() => employees.find((e) => e._id === value) || null, [employees, value]);

  useEffect(() => {
    if (!isOpen) {
      setQuery(selected ? displayName(selected) : '');
    }
  }, [selected, isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && displayName(selected).toLowerCase() === q)) return employees;
    return employees.filter((emp) => {
      const name = (emp.name || '').toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      return name.includes(q) || dept.includes(q);
    });
  }, [employees, query, selected]);

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

  const selectEmployee = (emp) => {
    onChange(emp?._id || '');
    setQuery(emp ? displayName(emp) : '');
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
      if (filtered[highlighted]) selectEmployee(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery(selected ? displayName(selected) : '');
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
          onClick={() => selectEmployee(null)}
          aria-label="Clear selected employee"
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
              No employees match "{query}"
            </div>
          ) : (
            filtered.map((emp, i) => (
              <div
                key={emp._id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectEmployee(emp);
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
                <span>{emp.name}</span>
                {emp.department && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{emp.department}</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
