import { useState, useEffect } from 'react';
import { sessionAPI } from '../services/api';
import { format, formatDistance } from 'date-fns';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ totalSessions: 0, totalEnergy: 0, totalCost: 0, avgDuration: 0 });

  useEffect(() => {
    loadSessions();
    loadActive();
  }, [page]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const res = await sessionAPI.getHistory({ page, limit: 10, status: 'completed' });
      setSessions(res.data || []);
      setTotalPages(res.pages || 1);

      // Calculate stats from all sessions
      if (res.data?.length) {
        const totalEnergy = res.data.reduce((s, sess) => s + (sess.energyConsumed || 0), 0);
        const totalCost = res.data.reduce((s, sess) => s + (sess.cost || 0), 0);
        const avgDuration = res.data.reduce((s, sess) => s + (sess.duration || 0), 0) / res.data.length;
        setStats({ totalSessions: res.total, totalEnergy: totalEnergy.toFixed(1), totalCost: totalCost.toFixed(0), avgDuration: Math.round(avgDuration) });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadActive = async () => {
    try {
      const res = await sessionAPI.getActive();
      setActiveSession(res.data);
    } catch (err) {}
  };

  const handleEndSession = async () => {
    try {
      await sessionAPI.end(activeSession._id, {});
      setActiveSession(null);
      loadSessions();
    } catch (err) {}
  };

  const getChargerIcon = (type) => {
    const map = { CCS: '⚡', CHAdeMO: '🔌', Type2: '🔵', 'Bharat AC': '🟡', 'Bharat DC': '🟠', Type1: '🟢' };
    return map[type] || '⚡';
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800 }}>🔋 My Sessions</h1>
          <p className="text-muted text-sm mt-1">Charging history and session tracking</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid mb-6">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(0,212,170,0.15)', color: 'var(--primary)' }}>⚡</div>
          <div className="stat-value">{stats.totalSessions}</div>
          <div className="stat-label">Total Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}>🔋</div>
          <div className="stat-value">{stats.totalEnergy}</div>
          <div className="stat-label">kWh Consumed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}>₹</div>
          <div className="stat-value">₹{stats.totalCost}</div>
          <div className="stat-label">Total Spent</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--info)' }}>⏱️</div>
          <div className="stat-value">{stats.avgDuration}m</div>
          <div className="stat-label">Avg Duration</div>
        </div>
      </div>

      {/* Active Session */}
      {activeSession && (
        <div className="card mb-6 animate-glow" style={{ borderColor: 'var(--primary)', background: 'rgba(0,212,170,0.04)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{ animation: 'pulse 1.5s ease-in-out infinite', fontSize: '2rem' }}>🔋</div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">Active Charging Session</h3>
                  <div className="live-badge"><div className="live-dot" />LIVE</div>
                </div>
                <p className="text-sm text-muted">
                  {activeSession.stationId?.name} •
                  {getChargerIcon(activeSession.chargerType)} {activeSession.chargerType} •
                  Started {format(new Date(activeSession.startTime), 'h:mm a')}
                </p>
                <p className="text-xs text-muted mt-1">
                  Duration: {formatDistance(new Date(activeSession.startTime), new Date())}
                </p>
              </div>
            </div>
            <button className="btn btn-danger" onClick={handleEndSession}>⏹️ End Session</button>
          </div>
        </div>
      )}

      {/* Session History Table */}
      <div className="table-container">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">Session History</h3>
          <span className="text-sm text-muted">{stats.totalSessions} sessions</span>
        </div>

        {loading ? (
          <div className="loading-container"><div className="loading-spinner" /></div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔋</div>
            <p className="empty-state-title">No sessions yet</p>
            <p className="empty-state-desc">Start your first charging session to see history here</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Station</th>
                <th>Date</th>
                <th>Charger</th>
                <th>Duration</th>
                <th>Energy</th>
                <th>Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((sess) => (
                <tr key={sess._id}>
                  <td>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {sess.stationId?.name || 'Unknown Station'}
                    </span>
                    <br />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {sess.stationId?.address?.city}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem' }}>
                      {format(new Date(sess.startTime), 'dd MMM yyyy')}
                    </span>
                    <br />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {format(new Date(sess.startTime), 'h:mm a')}
                    </span>
                  </td>
                  <td>
                    <span>{getChargerIcon(sess.chargerType)}</span>
                    <span style={{ fontSize: '0.8rem', marginLeft: 4 }}>{sess.chargerType}</span>
                  </td>
                  <td>{sess.duration} min</td>
                  <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{sess.energyConsumed} kWh</td>
                  <td style={{ color: 'var(--warning)', fontWeight: 600 }}>₹{sess.cost}</td>
                  <td>
                    <span className={`badge ${sess.status === 'completed' ? 'badge-success' : sess.status === 'active' ? 'badge-primary' : 'badge-warning'}`}>
                      {sess.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'center', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</button>
            <span className="text-sm text-muted" style={{ padding: '6px 12px' }}>Page {page} of {totalPages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
