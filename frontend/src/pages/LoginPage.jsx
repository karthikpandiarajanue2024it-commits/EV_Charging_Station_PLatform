import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await login(form.email, form.password);
      toast.success('Welcome back! ⚡');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    if (role === 'admin') setForm({ email: 'admin@evcharging.in', password: 'Admin@123' });
    else setForm({ email: 'arjun@test.in', password: 'User@123' });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(0,212,170,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '10%',
        width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 440 }} className="animate-slide-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            borderRadius: 18, margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, boxShadow: '0 8px 32px rgba(0,212,170,0.3)',
          }}>⚡</div>
          <h1 style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            EVCharge IQ
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            India's Intelligent EV Charging Platform
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>Sign In</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 24 }}>
            Enter your credentials to access the platform
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-group">
                <span className="input-icon">✉️</span>
                <input
                  id="login-email"
                  className="form-input"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-group">
                <span className="input-icon">🔑</span>
                <input
                  id="login-password"
                  className="form-input"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              className={`btn btn-primary btn-full btn-lg mt-2 ${loading ? 'btn-loading' : ''}`}
              disabled={loading}
            >
              {!loading && '⚡ Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{ marginTop: 20, padding: 14, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Demo Accounts
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => fillDemo('admin')}>
                🛡️ Admin
              </button>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => fillDemo('user')}>
                👤 User
              </button>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
