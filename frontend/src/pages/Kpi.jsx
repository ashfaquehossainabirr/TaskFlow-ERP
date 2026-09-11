import { useCallback, useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import KpiCard from '../components/KpiCard';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { canManageTasks } from '../utils/roles';
import { exactMoney, exactBDT } from '../utils/currency';
import api from '../api/axios';
import useDebounce from '../hooks/useDebounce';

function currentQuarter() {
  const now = new Date();
  return { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) + 1 };
}

export default function Kpi() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const isManager = canManageTasks(user.role);

  const [{ year, quarter }, setPeriod] = useState(currentQuarter());
  const [rows, setRows] = useState([]);
  const [myKpi, setMyKpi] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    if (isManager) {
      api
        .get('/kpi/summary', { params: { year, quarter } })
        .then((res) => setRows(res.data.rows))
        .catch((err) => setError(err.response?.data?.message || 'Failed to load KPI summary.'))
        .finally(() => setLoading(false));
    } else {
      Promise.all([
        api.get('/kpi/my', { params: { year, quarter } }),
        api.get('/kpi/my/history'),
      ])
        .then(([myRes, historyRes]) => {
          setMyKpi(myRes.data.kpi);
          setHistory(historyRes.data);
        })
        .catch((err) => setError(err.response?.data?.message || 'Failed to load your KPI.'))
        .finally(() => setLoading(false));
    }
  }, [isManager, year, quarter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMark = async (employeeId, status) => {
    await api.post(`/kpi/${employeeId}/${year}/${quarter}/mark`, { status });
    load();
  };

  const filteredRows = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      return (
        r.name?.toLowerCase().includes(term) ||
        r.email?.toLowerCase().includes(term) ||
        r.department?.toLowerCase().includes(term)
      );
    });
  }, [rows, debouncedSearch]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.totalBonus += r.bonusAmount || 0;
        if (r.excess > 0) acc.achieving += 1;
        if (r.status === 'paid') acc.paidBonus += r.bonusAmount || 0;
        return acc;
      },
      { totalBonus: 0, achieving: 0, paidBonus: 0 }
    );
  }, [rows]);

  const years = [currentQuarter().year, currentQuarter().year - 1];

  return (
    <PageShell
      title="KPI & Bonus"
      subtitle={
        isManager
          ? 'Quarterly minimum targets vs. delivered value, with performance bonus tracking.'
          : 'Your quarterly minimum target vs. delivered value.'
      }
      actions={
        <div className="kpi-period-picker">
          <select value={year} onChange={(e) => setPeriod({ year: Number(e.target.value), quarter })}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <div className="kpi-quarter-group">
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                type="button"
                className={`kpi-quarter-btn${q === quarter ? ' kpi-quarter-btn-active' : ''}`}
                onClick={() => setPeriod({ year, quarter: q })}
              >
                Q{q}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {loading && (
        <div style={{ padding: '48px 0' }}>
          <Spinner label="Loading KPI data…" />
        </div>
      )}

      {!loading && error && (
        <div
          style={{
            background: 'rgba(239, 100, 97, 0.1)',
            border: '1px solid rgba(239, 100, 97, 0.35)',
            color: 'var(--text-error)',
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && isManager && (
        <>
          <div className="kpi-totals-strip">
            <div className="kpi-total-item">
              <div className="kpi-total-value mono">{rows.length}</div>
              <div className="kpi-total-label">Employees with targets</div>
            </div>
            <div className="kpi-total-item">
              <div className="kpi-total-value mono" style={{ color: 'var(--status-delivered)' }}>
                {totals.achieving}
              </div>
              <div className="kpi-total-label">Passed target this quarter</div>
            </div>
            <div className="kpi-total-item">
              <div className="kpi-total-value mono" style={{ color: 'var(--text-warning)' }}>
                {exactBDT(totals.totalBonus)}
              </div>
              <div className="kpi-total-label">Bonus earned (all statuses)</div>
            </div>
            <div className="kpi-total-item">
              <div className="kpi-total-value mono" style={{ color: 'var(--status-delivered)' }}>
                {exactBDT(totals.paidBonus)}
              </div>
              <div className="kpi-total-label">Already paid</div>
            </div>
          </div>

          {rows.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or department…"
                style={{
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 8,
                  padding: '9px 12px',
                  fontSize: 13.5,
                  color: 'var(--text-primary)',
                  minWidth: 260,
                }}
              />
            </div>
          )}

          {rows.length === 0 ? (
            <div className="kpi-empty">
              {isAdmin
                ? 'No employees have a KPI target set yet. Set one from Team & Access.'
                : 'No one on your team has a KPI target set yet.'}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="kpi-empty">No employees match your search.</div>
          ) : (
            <div className="kpi-grid">
              {filteredRows.map((r) => (
                <KpiCard key={r.employeeId} kpi={r} isAdmin={isAdmin} onMark={handleMark} />
              ))}
            </div>
          )}
        </>
      )}

      {!loading && !error && !isManager && (
        <>
          {!myKpi ? (
            <div className="kpi-empty">No KPI target has been set for your account yet. Contact your admin.</div>
          ) : (
            <div className="kpi-my-wrap">
              <KpiCard kpi={myKpi} isAdmin={false} />
            </div>
          )}

          {history.length > 0 && (
            <div className="kpi-history">
              <div className="kpi-history-title">Bonus History</div>
              <div className="kpi-history-list">
                {history.map((h) => (
                  <div key={h._id} className="kpi-history-row">
                    <span className="kpi-history-period">
                      Q{h.quarter} {h.year}
                    </span>
                    <span className="kpi-history-amount mono">{exactBDT(h.bonusAmount || 0)}</span>
                    <span className={`kpi-history-status kpi-history-status-${h.status}`}>
                      {h.status === 'paid' ? `Paid ${h.paidOn ? new Date(h.paidOn).toLocaleDateString() : ''}` : 'Approved'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .kpi-period-picker {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .kpi-period-picker select {
          background: var(--bg-inset);
          border: 1px solid var(--border-hairline);
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 13px;
          color: var(--text-primary);
        }
        .kpi-quarter-group {
          display: flex;
          background: var(--bg-inset);
          border: 1px solid var(--border-hairline);
          border-radius: 8px;
          padding: 2px;
        }
        .kpi-quarter-btn {
          font-size: 12.5px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 6px;
          color: var(--text-secondary);
          background: transparent;
        }
        .kpi-quarter-btn-active {
          background: var(--accent-cyan);
          color: var(--text-on-accent);
        }
        .kpi-totals-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 12px;
          background: var(--bg-panel);
          border: 1px solid var(--border-hairline-soft);
          border-radius: var(--radius-lg);
          padding: 16px 18px;
          margin-bottom: 20px;
        }
        .kpi-total-value {
          font-size: 20px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .kpi-total-label {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .kpi-empty {
          border: 1px dashed var(--border-hairline);
          border-radius: var(--radius-lg);
          padding: 48px 24px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .kpi-my-wrap {
          max-width: 420px;
        }
        .kpi-history {
          margin-top: 24px;
          background: var(--bg-panel);
          border: 1px solid var(--border-hairline-soft);
          border-radius: var(--radius-lg);
          padding: 16px 18px;
        }
        .kpi-history-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 10px;
        }
        .kpi-history-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          border-top: 1px solid var(--border-hairline-soft);
          font-size: 13px;
        }
        .kpi-history-row:first-child {
          border-top: none;
        }
        .kpi-history-period {
          font-weight: 600;
          color: var(--text-primary);
          min-width: 70px;
        }
        .kpi-history-amount {
          color: var(--text-warning);
          font-weight: 700;
        }
        .kpi-history-status {
          margin-left: auto;
          font-size: 11.5px;
          color: var(--text-muted);
        }
        .kpi-history-status-paid {
          color: var(--status-delivered);
        }
        @media (max-width: 640px) {
          .kpi-period-picker {
            flex-wrap: wrap;
          }
        }
        @media (max-width: 480px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }
          .kpi-my-wrap {
            max-width: 100%;
          }
        }
      `}</style>
    </PageShell>
  );
}
