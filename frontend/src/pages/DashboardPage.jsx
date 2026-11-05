import { useState, useEffect } from 'react';
import { analyticsAPI, stationAPI, sessionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { connected } = useSocket();
  const [stats, setStats] = useState(null);
  const [nearbyStations, setNearbyStations] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [stationsRes, sessionRes] = await Promise.all([
        stationAPI.getAll({ limit: 6 }),
        user ? sessionAPI.getActive() : Promise.resolve({ data: null }),
      ]);

      setNearbyStations(stationsRes.data || []);
      setActiveSession(sessionRes.data);

      if (isAdmin) {
        const statsRes = await analyticsAPI.getDashboardStats();
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyColor = (rate) => {
    if (rate < 40) return 'var(--success)';
    if (rate < 75) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getStatusBadge = (status) => {
    const map = {
      active: 'badge-success',
      maintenance: 'badge-warning',
      offline: 'badge-danger',
      coming_soon: 'badge-info',
    };
    return map[status] || 'badge-info';
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800 }}>
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted text-sm mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`live-badge`}>
            <div className="live-dot" style={{ animationDuration: connected ? '1.5s' : '0s', background: connected ? 'var(--success)' : 'var(--danger)' }} />
            {connected ? 'Live Updates' : 'Reconnecting...'}
          </div>
        </div>
      </div>

      {/* Active Session Banner */}
      {activeSession && (
        <div className="card mb-6 animate-glow" style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.15), rgba(124,58,237,0.1))', borderColor: 'var(--primary)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{ fontSize: '2rem' }}>🔋</div>
              <div>
                <p className="font-bold">Active Charging Session</p>
                <p className="text-sm text-muted">
                  {activeSession.stationId?.name} • {activeSession.chargerType} •
                  Started {new Date(activeSession.startTime).toLocaleTimeString('en-IN')}
                </p>
              </div>
            </div>
            <Link to="/sessions" className="btn btn-primary btn-sm">View Session →</Link>
          </div>
        </div>
      )}

      {/* Admin Stats */}
      {isAdmin && stats && (
        <div className="stat-grid mb-6">
          <StatCard icon="⚡" label="Total Sessions" value={stats.totalSessions?.toLocaleString()} color="var(--primary)" gradient="linear-gradient(90deg,var(--primary),var(--accent))" />
          <StatCard icon="🔋" label="Active Now" value={stats.activeSessions} color="var(--success)" gradient="linear-gradient(90deg,var(--success),#059669)" />
          <StatCard icon="📅" label="Today's Sessions" value={stats.todaySessions} color="var(--info)" gradient="linear-gradient(90deg,var(--info),#1d4ed8)" />
          <StatCard icon="⚡" label="Energy Dispensed (kWh)" value={stats.totalEnergy?.toLocaleString()} color="var(--warning)" gradient="linear-gradient(90deg,var(--warning),#d97706)" />
          <StatCard icon="₹" label="Total Revenue" value={`₹${stats.totalRevenue?.toLocaleString()}`} color="var(--accent-light)" gradient="linear-gradient(90deg,var(--accent),var(--accent-light))" />
          <StatCard icon="⏱️" label="Avg Session (min)" value={stats.avgSessionDuration} color="var(--primary)" gradient="linear-gradient(90deg,var(--primary),#0891b2)" />
        </div>
      )}

      {/* Station Status Grid */}
      {isAdmin && stats?.stationStats && (
        <div className="card mb-6">
          <div className="card-header">
            <div>
              <h2 className="card-title">Station Status Overview</h2>
              <p className="card-subtitle">Fleet health at a glance</p>
            </div>
            <Link to="/admin/stations" className="btn btn-ghost btn-sm">Manage →</Link>
          </div>
          <div className="flex gap-4 flex-wrap">
            {stats.stationStats.map((s) => (
              <div key={s._id} style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', minWidth: 140 }}>
                <p className="text-xs text-muted text-uppercase font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s._id}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>{s.count}</p>
                <p className="text-xs text-muted">stations</p>
                <p className="text-xs" style={{ color: 'var(--primary)', marginTop: 4 }}>
                  {s.availableSlots}/{s.totalSlots} slots free
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stations List */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">⚡ EV Charging Stations</h2>
            <p className="card-subtitle">Overview of all stations</p>
          </div>
          <Link to="/map" className="btn btn-primary btn-sm">🗺️ Open Map</Link>
        </div>
        <div className="grid-auto">
          {nearbyStations.map((station) => (
            <Link to={`/stations/${station._id}`} key={station._id} style={{ textDecoration: 'none' }}>
              <div className="station-card">
                <div className="station-header">
                  <div>
                    <p className="station-name">{station.name}</p>
                    <p className="station-address">📍 {station.address?.city}, {station.address?.state}</p>
                  </div>
                  <span className={`badge ${getStatusBadge(station.status)}`}>{station.status}</span>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold" style={{ color: getOccupancyColor(station.currentOccupancyRate) }}>
                    {station.availableSlots}/{station.totalSlots} slots free
                  </span>
                  <span className="text-xs text-muted">⭐ {station.ratingsSummary?.average || '—'}</span>
                </div>

                <div className="occupancy-bar">
                  <div
                    className="occupancy-fill"
                    style={{
                      width: `${station.currentOccupancyRate || 0}%`,
                      background: getOccupancyColor(station.currentOccupancyRate),
                    }}
                  />
                </div>

                <div className="charger-tags mt-2">
                  {station.chargerTypes?.slice(0, 3).map((c, i) => (
                    <span key={i} className="charger-tag">{c.type} {c.powerKW}kW</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4 flex justify-center">
          <Link to="/map" className="btn btn-secondary">View All on Map →</Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid-3 mt-6">
        <Link to="/map" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🗺️</div>
            <h3 style={{ fontWeight: 700 }}>Find Stations</h3>
            <p className="text-sm text-muted mt-1">Interactive map with radius filter</p>
          </div>
        </Link>
        <Link to="/analytics" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📊</div>
            <h3 style={{ fontWeight: 700 }}>Analytics</h3>
            <p className="text-sm text-muted mt-1">Peak hours, trends, predictions</p>
          </div>
        </Link>
        <Link to="/sessions" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔋</div>
            <h3 style={{ fontWeight: 700 }}>My Sessions</h3>
            <p className="text-sm text-muted mt-1">Charging history and costs</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, gradient }) {
  return (
    <div className="stat-card" style={{ '--gradient': gradient }}>
      <div className="stat-icon" style={{ background: `${color}20`, color }}>
        {icon}
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
