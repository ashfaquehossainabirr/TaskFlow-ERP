import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ActiveTimerBar from './ActiveTimerBar';
import ThemeToggle from './ThemeToggle';
import Modal from './Modal';
import { canManageTasks } from '../utils/roles';
import {
  IconDashboard,
  IconFolder,
  IconCheckSquare,
  IconColumns,
  IconCalendar,
  IconCalendarCheck,
  IconAlarm,
  IconNotebook,
  IconUsers,
  IconBarChart,
  IconChevronLeft,
  IconLogOut,
  IconX,
  IconTarget,
  IconBriefcase,
  IconReceipt,
  IconWallet,
  IconClipboardCheck,
  IconBanknote,
  IconTrophy,
} from './icons/SidebarIcons';

const COLLAPSE_KEY = 'tf-sidebar-collapsed';

const linkStyle = ({ isActive }) => ({
  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
  background: isActive ? 'var(--bg-panel-raised)' : 'transparent',
  border: isActive ? '1px solid var(--border-hairline)' : '1px solid transparent',
});

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const isManager = canManageTasks(user?.role);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    onClose && onClose();
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const navSections = [
    {
      items: [
        { to: '/', end: true, label: 'Overview', Icon: IconDashboard },
        { to: '/projects', label: 'Projects', Icon: IconFolder },
        { to: '/tasks', label: isManager ? 'All Tasks' : 'My Tasks', Icon: IconCheckSquare },
        { to: '/kanban', label: 'Kanban Board', Icon: IconColumns },
        { to: '/calendar', label: 'Calendar', Icon: IconCalendar },
        { to: '/deadlines', label: 'Deadline Watch', Icon: IconAlarm },
        { to: '/notes', label: 'My Notes', Icon: IconNotebook },
        { to: '/my-attendance', label: 'My Attendance', Icon: IconCalendarCheck },
        { to: '/kpi', label: 'KPI & Bonus', Icon: IconTrophy },
      ],
    },
    ...(isManager
      ? [
          {
            heading: 'CRM',
            items: [
              { to: '/leads', label: 'Leads', Icon: IconTarget },
              { to: '/clients', label: 'Clients', Icon: IconBriefcase },
            ],
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            heading: 'Finance',
            items: [
              { to: '/invoices', label: 'Invoices', Icon: IconReceipt },
              { to: '/expenses', label: 'Expenses', Icon: IconWallet },
            ],
          },
        ]
      : []),
    ...(isManager
      ? [
          {
            heading: 'HR',
            items: [
              ...(isAdmin ? [{ to: '/users', label: 'Team & Access', Icon: IconUsers }] : []),
              { to: '/attendance', label: 'Team Attendance', Icon: IconClipboardCheck },
              ...(isAdmin ? [{ to: '/payroll', label: 'Payroll', Icon: IconBanknote }] : []),
              { to: '/employee-stats', label: isAdmin ? 'Employee Stats' : 'My Team', Icon: IconBarChart },
            ],
          },
        ]
      : isAdmin
        ? [
            {
              heading: 'HR',
              items: [{ to: '/users', label: 'Team & Access', Icon: IconUsers }],
            },
          ]
        : []),
  ];

  const initials = (user?.name || '?')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}${collapsed ? ' sidebar-collapsed' : ''}`}>
        <div className="sidebar-head">
          <div className="sidebar-brand">
            <div className="sidebar-logo">T</div>
            <span className="sidebar-brand-name">TaskFlow</span>
          </div>
          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            data-tooltip={collapsed ? 'Expand' : 'Collapse'}
          >
            <IconChevronLeft
              size={13}
              style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }}
            />
          </button>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            <IconX size={17} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section, idx) => (
            <div className="nav-section" key={section.heading || `main-${idx}`}>
              {section.heading && !collapsed && <div className="nav-section-heading">{section.heading}</div>}
              {section.items.map(({ to, end, label, Icon }) => (
                <NavLink key={to} to={to} end={end} style={linkStyle} className="nav-link" data-tooltip={label}>
                  <span className="nav-icon">
                    <Icon size={18} />
                  </span>
                  <span className="nav-label">{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="footer-extras">
            <ActiveTimerBar />
            <div style={{ marginBottom: 10 }}>
              <ThemeToggle compact={collapsed} />
            </div>
          </div>

          <div className="sidebar-user" data-tooltip={`${user?.name || ''} · ${user?.role || ''}`}>
            <div className="user-avatar">{initials}</div>
            <div className="user-meta">
              <span className="user-name">{user?.name}</span>
              <span
                className="mono user-role"
                style={{
                  color:
                    user?.role === 'admin'
                      ? 'var(--accent-cyan)'
                      : user?.role === 'manager'
                        ? 'var(--status-hold)'
                        : 'var(--text-muted)',
                }}
              >
                {user?.role}
              </span>
            </div>
          </div>

          <button className="signout-btn" onClick={() => setShowLogoutConfirm(true)} data-tooltip="Sign out">
            <IconLogOut size={16} />
            <span className="nav-label">Sign out</span>
          </button>
        </div>
      </aside>

      {showLogoutConfirm && (
        <Modal title="Sign out?" onClose={() => setShowLogoutConfirm(false)} width={360}>
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginTop: 0,
              marginBottom: 20,
            }}
          >
            You'll need to log back in with your email and password to continue.
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <button
              onClick={() => setShowLogoutConfirm(false)}
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 8,
                padding: '9px 16px',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={logout}
              style={{
                background: 'var(--status-cancelled)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '9px 16px',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        .sidebar {
          --sidebar-w: 232px;
          --sidebar-w-collapsed: 76px;
          width: var(--sidebar-w);
          flex-shrink: 0;
          background: var(--bg-panel);
          border-right: 1px solid var(--border-hairline-soft);
          box-shadow: 3px 0 18px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          padding: 20px 14px;
          height: 100vh;
          height: 100dvh;
          position: sticky;
          top: 0;
          overflow: visible;
          transition: width 0.22s ease;
        }
        .sidebar.sidebar-collapsed {
          width: var(--sidebar-w-collapsed);
        }

        /* --- collapse toggle: sits in the header, right-aligned when expanded, stacked below the logo when collapsed --- */
        .sidebar-collapse-toggle {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--bg-inset);
          border: 1px solid var(--border-hairline);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
        }
        .sidebar-collapse-toggle:hover {
          color: var(--accent-cyan);
          border-color: var(--accent-cyan-dim);
          background: var(--bg-panel-raised);
          transform: scale(1.08);
        }
        .sidebar-collapse-toggle:active {
          transform: scale(0.96);
        }
        .sidebar-collapse-toggle:focus-visible {
          box-shadow: 0 0 0 2px var(--accent-cyan);
        }

        /* --- header / brand --- */
        .sidebar-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 8px 26px;
          flex-shrink: 0;
        }
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }
        .sidebar-logo {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          flex-shrink: 0;
          background: linear-gradient(135deg, var(--accent-cyan), var(--status-progress));
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 13px;
          color: var(--text-on-accent);
        }
        .sidebar-brand-name {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 17px;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
        }
        .sidebar-collapsed .sidebar-head {
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 12px;
          padding: 4px 0 18px;
        }
        .sidebar-collapsed .sidebar-brand-name {
          display: none;
        }

        /* --- nav --- */
        .sidebar-nav {
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding-right: 2px;
          scrollbar-width: thin;
          scrollbar-color: var(--border-hairline) transparent;
        }
        .sidebar-nav::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .sidebar-nav::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-nav::-webkit-scrollbar-thumb {
          background: var(--border-hairline);
          border-radius: 10px;
        }
        .sidebar-nav::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }
        .nav-section {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .nav-section + .nav-section {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--border-hairline-soft);
        }
        .nav-section-heading {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          padding: 4px 12px 6px;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
        }
        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .nav-label {
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar-collapsed .nav-link {
          justify-content: center;
          padding: 10px;
        }
        .sidebar-collapsed .nav-label {
          display: none;
        }

        /* --- footer --- */
        .sidebar-footer {
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid var(--border-hairline-soft);
          flex-shrink: 0;
        }
        .sidebar-collapsed .footer-extras {
          display: none;
        }
        .sidebar-user {
          padding: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .user-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-inset);
          border: 1px solid var(--border-hairline);
          color: var(--text-secondary);
          font-size: 11.5px;
          font-weight: 700;
          font-family: var(--font-mono);
        }
        .user-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .user-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-role {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .sidebar-collapsed .sidebar-user {
          justify-content: center;
          padding: 8px 0;
        }
        .sidebar-collapsed .user-meta {
          display: none;
        }
        .signout-btn {
          width: 100%;
          margin-top: 8px;
          padding: 9px 12px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid var(--border-hairline);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .sidebar-collapsed .signout-btn {
          padding: 9px;
        }

        /* --- tooltips shown only while collapsed --- */
        .sidebar-collapsed [data-tooltip] {
          position: relative;
        }
        .sidebar-collapsed [data-tooltip]::after {
          content: attr(data-tooltip);
          position: absolute;
          left: calc(100% + 12px);
          top: 50%;
          transform: translateY(-50%) translateX(-6px);
          background: var(--bg-panel-raised);
          color: var(--text-primary);
          border: 1px solid var(--border-hairline);
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease, transform 0.15s ease;
          z-index: 260;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
        }
        .sidebar-collapsed [data-tooltip]:hover::after,
        .sidebar-collapsed [data-tooltip]:focus-visible::after {
          opacity: 1;
          transform: translateY(-50%) translateX(0);
        }

        /* --- mobile / off-canvas overlay --- */
        .sidebar-close-btn {
          display: none;
          background: transparent;
          border: none;
          color: var(--text-muted);
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 4px 8px;
        }
        .sidebar-overlay {
          display: none;
        }
        @media (max-width: 900px) {
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            width: var(--sidebar-w) !important;
            transform: translateX(-100%);
            transition: transform 0.25s ease, box-shadow 0.25s ease;
            z-index: 210;
            box-shadow: none;
            overflow: hidden !important;
          }
          .sidebar-open {
            transform: translateX(0);
            box-shadow: 6px 0 28px rgba(0, 0, 0, 0.28);
          }
          .sidebar-collapse-toggle {
            display: none;
          }
          .sidebar-collapsed [data-tooltip]::after {
            display: none;
          }
          .sidebar-collapsed .sidebar-brand-name,
          .sidebar-collapsed .nav-label {
            display: inline;
          }
          .sidebar-collapsed .footer-extras {
            display: block;
          }
          .sidebar-collapsed .user-meta {
            display: flex;
          }
          .sidebar-collapsed .sidebar-head {
            flex-direction: row;
            justify-content: space-between;
            padding-left: 8px;
            padding-right: 8px;
            padding-bottom: 26px;
          }
          .sidebar-collapsed .nav-link {
            justify-content: flex-start;
            padding: 10px 14px;
          }
          .sidebar-collapsed .sidebar-user {
            justify-content: flex-start;
            padding: 8px;
          }
          .sidebar-collapsed .signout-btn {
            justify-content: center;
            padding: 9px 12px;
          }
          .sidebar-close-btn {
            display: inline-flex;
          }
          .sidebar-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: var(--overlay-scrim);
            z-index: 200;
          }
        }
        @media (max-width: 480px) {
          .sidebar {
            width: min(var(--sidebar-w), 82vw) !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .sidebar,
          .sidebar-collapse-toggle { transition: none; }
        }
      `}</style>
    </>
  );
}
