import { useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import EmployeeStatCard from '../components/EmployeeStatCard';
import EmployeeTasksModal from '../components/EmployeeTasksModal';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import useDebounce from '../hooks/useDebounce';

export default function EmployeeStats() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    setLoading(true);
    api
      .get('/tasks/stats/by-employee')
      .then((res) => setEmployees(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load employee stats.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredEmployees = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((emp) => {
      return (
        emp.name?.toLowerCase().includes(term) ||
        emp.email?.toLowerCase().includes(term) ||
        emp.department?.toLowerCase().includes(term)
      );
    });
  }, [employees, debouncedSearch]);
  
  return (
    <PageShell
      title={isAdmin ? 'Employee Stats' : 'My Team'}
      subtitle={
        isAdmin
          ? 'Task load and status breakdown for every employee.'
          : 'Task load and status breakdown for your team.'
      }
    >
      {!loading && !error && employees.length > 0 && (
        <div
          style={{
            marginBottom: 16,
          }}
        >
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

      {loading && (
        <div style={{ padding: '48px 0' }}>
          <Spinner label="Loading team stats…" />
        </div>
      )}

      {error && (
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

      {!loading && !error && employees.length === 0 && (
        <div
          style={{
            border: '1px dashed var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 14,
          }}
        >
          {isAdmin
            ? 'No employee accounts yet. Create one from Team & Access.'
            : 'No employees report to you yet.'}
        </div>
      )}

      {!loading && !error && employees.length > 0 && filteredEmployees.length === 0 && (
        <div
          style={{
            border: '1px dashed var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 14,
          }}
        >
          No employees match your search.
        </div>
      )}

      {!loading && !error && filteredEmployees.length > 0 && (
        <div className="employee-stats-grid">
          {filteredEmployees.map((emp) => (
            <EmployeeStatCard key={emp._id} employee={emp} onClick={() => setSelectedEmployee(emp)} />
          ))}
        </div>
      )}

      {selectedEmployee && (
        <EmployeeTasksModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
      )}

      <style>{`
        .employee-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        @media (max-width: 480px) {
          .employee-stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </PageShell>
  );
}
