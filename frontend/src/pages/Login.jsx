import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const dest = location.state?.from?.pathname || '/';
      navigate(dest, {
        replace: true,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="login-wrapper">
      <div className="login-left">
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(79,216,224,0.12), transparent 45%), radial-gradient(circle at 80% 80%, rgba(74,158,255,0.1), transparent 45%)',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--status-progress))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: 'var(--text-on-accent)',
            }}
          >
            T
          </div>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 19,
            }}
          >
            TaskFlow
          </span>
        </div>

        <div
          style={{
            position: 'relative',
            maxWidth: 440,
          }}
        >
          <p
            className="mono"
            style={{
              color: 'var(--accent-cyan)',
              fontSize: 12.5,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            Ops console for shipping teams
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 38,
              lineHeight: 1.15,
              fontWeight: 700,
              margin: '0 0 16px',
              letterSpacing: '-0.01em',
            }}
          >
            Every task, every deadline, on one board.
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            Admins assign work and track delivery across the team. Employees see exactly what's due, and
            what's about to run out of runway.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 10,
              marginTop: 32,
            }}
          >
            {[
              {
                label: 'To Do',
                color: 'var(--status-todo)',
              },
              {
                label: 'In Progress',
                color: 'var(--status-progress)',
              },
              {
                label: 'On Hold',
                color: 'var(--status-hold)',
              },
              {
                label: 'Delivered',
                color: 'var(--status-delivered)',
              },
              {
                label: 'Cancelled',
                color: 'var(--status-cancelled)',
              },
            ].map((s) => (
              <span
                key={s.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11.5,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: s.color,
                  }}
                />
                {s.label}
              </span>
            ))}
          </div>
        </div>

        <div
          className="mono"
          style={{
            fontSize: 11.5,
            color: 'var(--text-muted)',
            position: 'relative',
          }}
        >
          Deadline Watch flags anything due in 3 days or less.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
          }}
        >
          <ThemeToggle compact />
        </div>
        <div className="mobile-logo">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--status-progress))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: 'var(--text-on-accent)',
            }}
          >
            T
          </div>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 19,
            }}
          >
            TaskFlow
          </span>
        </div>
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            maxWidth: 360,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Sign in
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 14,
              marginBottom: 28,
            }}
          >
            Use the account provided by your admin.
          </p>

          {error && (
            <div
              style={{
                background: 'rgba(239, 100, 97, 0.1)',
                border: '1px solid rgba(239, 100, 97, 0.35)',
                color: 'var(--text-error)',
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 18,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              marginBottom: 16,
            }}
          >
            <label
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              style={inputStyle}
            />
          </div>

          <div
            style={{
              marginBottom: 24,
            }}
          >
            <label
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--accent-cyan)',
              color: 'var(--text-on-accent)',
              fontWeight: 700,
              fontSize: 14.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading && (
              <span
                className="tf-btn-spinner"
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  border: '2px solid rgba(0,0,0,0.25)',
                  borderTopColor: 'var(--text-on-accent)',
                  display: 'inline-block',
                  animation: 'tf-spin 0.7s linear infinite',
                }}
              />
            )}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <style>{`
            @keyframes tf-spin { to { transform: rotate(360deg); } }
          `}</style>
        </form>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .login-left { display: none; }
        }
      `}</style>
    </div>
  );
}
const inputStyle = {
  width: '100%',
  background: 'var(--bg-inset)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 8,
  padding: '11px 13px',
  fontSize: 14,
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
};
