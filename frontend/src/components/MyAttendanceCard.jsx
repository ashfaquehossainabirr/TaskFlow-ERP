import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import Spinner from './Spinner';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_COLORS, pillStyle } from '../erp/badges';

const todayStr = () => new Date().toISOString().slice(0, 10);
const currentMonthStr = () => todayStr().slice(0, 7);
const currentMonthLabel = () => new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

export default function MyAttendanceCard() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/attendance', { params: { employee: user._id, month: currentMonthStr() } })
      .then((res) => {
        if (!cancelled) setRecords(res.data);
      })
      .catch(() => {
        if (!cancelled) setRecords([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user._id]);

  const todayRecord = useMemo(
    () => records.find((r) => new Date(r.date).toISOString().slice(0, 10) === todayStr()),
    [records]
  );

  const summary = useMemo(() => {
    const counts = {};
    Object.keys(ATTENDANCE_STATUS_LABELS).forEach((s) => (counts[s] = 0));
    records.forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status] += 1;
    });
    return counts;
  }, [records]);

  const recent = useMemo(
    () => [...records].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6),
    [records]
  );

  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-hairline-soft)',
        borderRadius: 'var(--radius-lg)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarCheck size={17} style={{ color: 'var(--accent-cyan)' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, margin: 0 }}>
            My Attendance
          </h2>
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>{currentMonthLabel()}</span>
      </div>

      {loading ? (
        <div style={{ padding: '20px 0' }}>
          <Spinner size="sm" inline label="Loading attendance…" />
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              background: 'var(--bg-inset)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
            }}
          >
            <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 600 }}>Today</span>
            {todayRecord ? (
              <span style={pillStyle(ATTENDANCE_STATUS_COLORS[todayRecord.status])}>
                {ATTENDANCE_STATUS_LABELS[todayRecord.status]}
              </span>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Not marked yet</span>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(74px, 1fr))',
              gap: 8,
            }}
          >
            {Object.entries(ATTENDANCE_STATUS_LABELS).map(([key, label]) => (
              <div
                key={key}
                style={{
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border-hairline-soft)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px',
                }}
              >
                <div
                  style={{
                    fontSize: 9.5,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: 3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {label}
                </div>
                <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: ATTENDANCE_STATUS_COLORS[key] }}>
                  {summary[key]}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 8,
              }}
            >
              Recent days
            </div>
            {recent.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', padding: '6px 0' }}>
                No attendance marked yet this month.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recent.map((r) => (
                  <div
                    key={r._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      fontSize: 12.5,
                      padding: '7px 2px',
                      borderBottom: '1px solid var(--border-hairline-soft)',
                    }}
                  >
                    <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(r.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span style={pillStyle(ATTENDANCE_STATUS_COLORS[r.status])}>
                      {ATTENDANCE_STATUS_LABELS[r.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
