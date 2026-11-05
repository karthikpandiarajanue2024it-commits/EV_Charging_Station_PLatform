import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { stationAPI, sessionAPI, faultAPI, analyticsAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function StationDetailPage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { socket, joinStation, leaveStation } = useSocket();

  const [station, setStation] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setTab] = useState('overview');
  const [showFaultModal, setShowFaultModal] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [startingSession, setStartingSession] = useState(false);
  const [selectedCharger, setSelectedCharger] = useState('');

  // Fault form state
  const [faultForm, setFaultForm] = useState({ type: 'charger_not_working', severity: 'medium', description: '', chargerType: '' });

  useEffect(() => {
    loadStation();
    // Join socket room for live updates
    joinStation(id);
    return () => leaveStation(id);
  }, [id]);

  // Listen to real-time socket events
  useEffect(() => {
    if (!socket) return;

    const onSlotUpdate = (data) => {
      if (data.stationId === id) {
        setStation(prev => prev ? { ...prev, availableSlots: data.availableSlots, currentOccupancyRate: data.currentOccupancyRate } : prev);
        toast('⚡ Slot availability updated', { icon: '🔄' });
      }
    };

    const onFaultAlert = (data) => {
      if (data.stationId === id) {
        toast.error(`⚠️ New fault reported: ${data.type} (${data.severity})`);
        loadFaults();
      }
    };

    socket.on('slot_updated', onSlotUpdate);
    socket.on('fault_alert', onFaultAlert);
    return () => {
      socket.off('slot_updated', onSlotUpdate);
      socket.off('fault_alert', onFaultAlert);
    };
  }, [socket, id]);

  const loadStation = async () => {
    try {
      setLoading(true);
      const [stationRes, predRes, faultsRes] = await Promise.all([
        stationAPI.getById(id),
        sessionAPI.predictWait(id),
        faultAPI.getByStation(id, { status: 'open' }),
      ]);
      setStation(stationRes.data);
      setPrediction(predRes.data);
      setFaults(faultsRes.data || []);

      if (isAuthenticated) {
        const sessRes = await sessionAPI.getActive();
        setActiveSession(sessRes.data);
      }
    } catch (err) {
      toast.error('Station not found');
    } finally {
      setLoading(false);
    }
  };

  const loadFaults = async () => {
    try {
      const res = await faultAPI.getByStation(id, { status: 'open' });
      setFaults(res.data || []);
    } catch (err) {}
  };

  const handleStartSession = async () => {
    if (!selectedCharger) return toast.error('Select a charger type');
    if (activeSession) return toast.error('You already have an active session');
    try {
      setStartingSession(true);
      const res = await sessionAPI.start({ stationId: id, chargerType: selectedCharger });
      setActiveSession(res.data);
      toast.success('🔋 Charging session started!');
      loadStation();
    } catch (err) {
      toast.error(err.message || 'Failed to start session');
    } finally {
      setStartingSession(false);
    }
  };

  const handleEndSession = async () => {
    try {
      await sessionAPI.end(activeSession._id, {});
      toast.success('✅ Session ended successfully!');
      setActiveSession(null);
      loadStation();
    } catch (err) {
      toast.error(err.message || 'Failed to end session');
    }
  };

  const handleReportFault = async (e) => {
    e.preventDefault();
    try {
      await faultAPI.report({ stationId: id, ...faultForm });
      toast.success('Fault reported. Thank you!');
      setShowFaultModal(false);
      loadFaults();
    } catch (err) {
      toast.error(err.message || 'Failed to report fault');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading station details...</p>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">🔌</div>
          <p className="empty-state-title">Station not found</p>
          <Link to="/map" className="btn btn-primary mt-4">Back to Map</Link>
        </div>
      </div>
    );
  }

  const occupancyColor = station.currentOccupancyRate < 40 ? 'var(--success)' :
    station.currentOccupancyRate < 75 ? 'var(--warning)' : 'var(--danger)';

  const [lng, lat] = station.location?.coordinates || [0, 0];

  return (
    <div className="page-container animate-fade-in">
      {/* Back Link */}
      <Link to="/map" className="flex items-center gap-2 text-sm text-muted mb-4" style={{ textDecoration: 'none' }}>
        ← Back to Map
      </Link>

      {/* Header */}
      <div className="card mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: 800 }}>⚡ {station.name}</h1>
              <span className={`badge ${station.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                {station.status}
              </span>
              {station.isVerified && <span className="badge badge-primary">✓ Verified</span>}
            </div>
            <p className="text-muted text-sm mt-1">📍 {station.address?.street}, {station.address?.city}, {station.address?.state} - {station.address?.pincode}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              🏢 Operated by {station.operator?.name || 'Unknown'}
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
            >
              🗺️ Navigate
            </a>
            {isAuthenticated && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowFaultModal(true)}>
                ⚠️ Report Fault
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Left panel */}
        <div>
          {/* Real-time slot status */}
          <div className="card mb-4" style={{ borderColor: occupancyColor + '40' }}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="card-title">Real-Time Availability</h2>
              <div className="live-badge">
                <div className="live-dot" />
                Live
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 16 }}>
              <div>
                <span style={{ fontFamily: 'Outfit', fontSize: '3rem', fontWeight: 800, color: occupancyColor, lineHeight: 1 }}>
                  {station.availableSlots}
                </span>
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/{station.totalSlots} free</span>
              </div>
              <div style={{ flex: 1 }}>
                <div className="occupancy-bar" style={{ height: 10 }}>
                  <div className="occupancy-fill" style={{ width: `${station.currentOccupancyRate}%`, background: occupancyColor }} />
                </div>
                <p className="text-xs text-muted mt-1">{station.currentOccupancyRate}% occupied</p>
              </div>
            </div>

            {/* Individual slot dots */}
            <div className="slot-dots">
              {Array.from({ length: station.totalSlots }).map((_, i) => (
                <div key={i} className={`slot-dot ${i < (station.totalSlots - station.availableSlots) ? 'occupied' : 'available'}`} />
              ))}
            </div>
          </div>

          {/* Prediction */}
          {prediction && (
            <div className="card mb-4" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(0,212,170,0.05))' }}>
              <h2 className="card-title mb-3">🤖 AI Prediction</h2>
              <div className="grid-2 gap-3">
                <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ fontSize: '2rem', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--primary)' }}>
                    {prediction.predictedWaitMinutes}m
                  </p>
                  <p className="text-xs text-muted">Predicted Wait</p>
                  <span className={`badge ${prediction.confidence === 'high' ? 'badge-success' : prediction.confidence === 'medium' ? 'badge-warning' : 'badge-danger'} mt-1`}>
                    {prediction.confidence} confidence
                  </span>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                  <p className="text-xs text-muted font-bold mb-2">🕐 Best Charging Times</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {prediction.bestChargingHours?.slice(0, 4).map((h, i) => (
                      <span key={i} className={`badge ${h.busyness === 'low' ? 'badge-success' : h.busyness === 'medium' ? 'badge-warning' : 'badge-danger'}`}>
                        {h.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Charger Types */}
          <div className="card mb-4">
            <h2 className="card-title mb-3">⚡ Charger Types</h2>
            {station.chargerTypes?.map((c, i) => (
              <div key={i} style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm">{c.type}</span>
                    <span className="text-muted text-xs ml-2">{c.powerKW} kW</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: c.available > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {c.available}/{c.count} free
                    </span>
                    <span className="badge badge-primary">₹{c.pricePerKWh}/kWh</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Amenities */}
          {station.amenities?.length > 0 && (
            <div className="card mb-4">
              <h2 className="card-title mb-3">🏪 Amenities</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {station.amenities.map((a) => {
                  const icons = { parking: '🅿️', restroom: '🚻', cafe: '☕', wifi: '📶', cctv: '📹', mall: '🛍️', petrol_station: '⛽' };
                  return (
                    <span key={a} className="badge badge-info">
                      {icons[a] || '✓'} {a.replace('_', ' ')}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div>
          {/* Start Charging */}
          {isAuthenticated && (
            <div className="card mb-4" style={{ border: '1px solid var(--primary)', background: 'rgba(0,212,170,0.04)' }}>
              <h2 className="card-title mb-3">🔋 Start Charging</h2>
              {activeSession && activeSession.stationId?._id === id ? (
                <div>
                  <p className="text-sm mb-3">Active session in progress...</p>
                  <p className="text-xs text-muted mb-3">
                    Started: {new Date(activeSession.startTime).toLocaleTimeString('en-IN')} •
                    Charger: {activeSession.chargerType}
                  </p>
                  <button className="btn btn-danger btn-full" onClick={handleEndSession}>
                    ⏹️ End Session
                  </button>
                </div>
              ) : (
                <div>
                  <div className="form-group">
                    <label className="form-label">Select Charger Type</label>
                    <select
                      className="form-select"
                      value={selectedCharger}
                      onChange={(e) => setSelectedCharger(e.target.value)}
                    >
                      <option value="">Choose charger...</option>
                      {station.chargerTypes?.filter((c) => c.available > 0).map((c, i) => (
                        <option key={i} value={c.type}>
                          {c.type} ({c.powerKW} kW) — ₹{c.pricePerKWh}/kWh
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className={`btn btn-primary btn-full ${startingSession ? 'btn-loading' : ''}`}
                    onClick={handleStartSession}
                    disabled={station.availableSlots === 0 || startingSession || !!activeSession}
                  >
                    {station.availableSlots === 0 ? '🚫 No Slots Available' : '⚡ Start Charging'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Rating */}
          <div className="card mb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="card-title">⭐ Rating</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800, color: 'var(--warning)' }}>
                  {station.ratingsSummary?.average || '—'}
                </span>
                <div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} style={{ color: s <= Math.round(station.ratingsSummary?.average || 0) ? 'var(--warning)' : 'var(--border)' }}>★</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted">{station.ratingsSummary?.count || 0} reviews</p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Faults */}
          <div className="card mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="card-title">⚠️ Active Faults</h2>
              <span className="badge badge-danger">{faults.length}</span>
            </div>
            {faults.length === 0 ? (
              <div className="empty-state" style={{ padding: '16px' }}>
                <p style={{ fontSize: '1.5rem' }}>✅</p>
                <p className="text-sm text-muted">No active faults</p>
              </div>
            ) : (
              faults.map((fault) => (
                <div key={fault._id} style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.05)', borderLeft: '3px solid var(--danger)', borderRadius: 8, marginBottom: 8 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold">{fault.type.replace(/_/g, ' ')}</span>
                    <span className={`badge badge-${fault.severity === 'critical' ? 'danger' : fault.severity === 'high' ? 'warning' : 'info'}`}>
                      {fault.severity}
                    </span>
                  </div>
                  <p className="text-xs text-muted">{fault.description?.slice(0, 80)}...</p>
                  <p className="text-xs text-muted mt-1">👍 {fault.upvotes} people agree</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Fault Report Modal */}
      {showFaultModal && (
        <div className="modal-overlay" onClick={() => setShowFaultModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">⚠️ Report a Fault</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowFaultModal(false)}>✕</button>
            </div>
            <form onSubmit={handleReportFault}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Fault Type</label>
                  <select className="form-select" value={faultForm.type} onChange={(e) => setFaultForm({ ...faultForm, type: e.target.value })}>
                    <option value="charger_not_working">Charger Not Working</option>
                    <option value="cable_damaged">Cable Damaged</option>
                    <option value="payment_issue">Payment Issue</option>
                    <option value="display_not_working">Display Not Working</option>
                    <option value="physical_damage">Physical Damage</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Severity</label>
                  <select className="form-select" value={faultForm.severity} onChange={(e) => setFaultForm({ ...faultForm, severity: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    required
                    minLength={10}
                    placeholder="Describe the issue in detail..."
                    value={faultForm.description}
                    onChange={(e) => setFaultForm({ ...faultForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowFaultModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
