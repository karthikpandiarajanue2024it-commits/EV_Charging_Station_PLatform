import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const CHARGER_TYPES = ['Type1', 'Type2', 'CCS', 'CHAdeMO', 'GB/T', 'Bharat AC', 'Bharat DC'];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    vehicleModel: '', batteryCapacity: '', chargerType: 'CCS',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        vehicleInfo: form.vehicleModel ? {
          model: form.vehicleModel,
          batteryCapacity: parseFloat(form.batteryCapacity) || undefined,
          chargerType: form.chargerType,
        } : undefined,
      });
      toast.success('Account created! Welcome to EVCharge IQ 🚗');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
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
      <div style={{
        position: 'absolute', top: '15%', right: '10%',
        width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', left: '5%',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(0,212,170,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 480 }} className="animate-slide-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            borderRadius: 16, margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, boxShadow: '0 6px 24px rgba(0,212,170,0.3)',
          }}>⚡</div>
          <h1 style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: 800 }}>Create Account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
            Join India's EV Intelligence Network
          </p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  required
                  placeholder="Arjun Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  className="form-input"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                className="form-input"
                type="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
              <input
                className="form-input"
                type="password"
                required
                minLength={6}
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {/* Vehicle Info */}
            <div style={{ margin: '16px 0', padding: 14, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                🚗 Vehicle Info (Optional)
              </p>
              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">EV Model</label>
                  <input
                    className="form-input"
                    placeholder="Tata Nexon EV"
                    value={form.vehicleModel}
                    onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Battery (kWh)</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.1"
                    placeholder="40.5"
                    value={form.batteryCapacity}
                    onChange={(e) => setForm({ ...form, batteryCapacity: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group mt-3" style={{ marginBottom: 0 }}>
                <label className="form-label">Charger Type</label>
                <select
                  className="form-select"
                  value={form.chargerType}
                  onChange={(e) => setForm({ ...form, chargerType: e.target.value })}
                >
                  {CHARGER_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className={`btn btn-primary btn-full btn-lg ${loading ? 'btn-loading' : ''}`}
              disabled={loading}
            >
              {!loading && '🚀 Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
