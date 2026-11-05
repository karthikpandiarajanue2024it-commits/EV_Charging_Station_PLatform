import { useState, useEffect } from 'react';
import { stationAPI, faultAPI, sessionAPI, analyticsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';

const CHARGER_TYPES = ['Type1', 'Type2', 'CCS', 'CHAdeMO', 'GB/T', 'Bharat AC', 'Bharat DC'];
const CITIES = ['Chennai', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Kolkata'];
const CITY_COORDS = {
  Chennai: [80.2707, 13.0827], Bangalore: [77.5946, 12.9716], Mumbai: [72.8777, 19.0760],
  Delhi: [77.1025, 28.7041], Hyderabad: [78.4867, 17.3850], Pune: [73.8567, 18.5204], Kolkata: [88.3639, 22.5726],
};

const emptyStationForm = {
  name: '', city: 'Chennai', street: '', pincode: '',
  status: 'active', is24x7: true,
  chargerTypes: [{ type: 'Type2', powerKW: 22, count: 4, pricePerKWh: 12 }],
};

export default function AdminPage() {
  const [activeTab, setTab] = useState('dashboard');
  const [stations, setStations] = useState([]);
  const [faults, setFaults] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStationModal, setShowStationModal] = useState(false);
  const [editStation, setEditStation] = useState(null);
  const [stationForm, setStationForm] = useState(emptyStationForm);
  const [qrStation, setQrStation] = useState(null);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (activeTab === 'faults') loadFaults();
    else if (activeTab === 'sessions') loadSessions();
  }, [activeTab]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [stRes, statsRes] = await Promise.all([
        stationAPI.getAll({ limit: 100 }),
        analyticsAPI.getDashboardStats(),
      ]);
      setStations(stRes.data || []);
      setStats(statsRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadFaults = async () => {
    try {
      const res = await faultAPI.getAllAdmin({ limit: 50 });
      setFaults(res.data || []);
    } catch (err) {}
  };

  const loadSessions = async () => {
    try {
      const res = await sessionAPI.getAllAdmin({ limit: 50 });
      setAllSessions(res.data || []);
    } catch (err) {}
  };

  const handleSaveStation = async (e) => {
    e.preventDefault();
    try {
      const cityCoord = CITY_COORDS[stationForm.city] || [80.2707, 13.0827];
      // Add slight random offset so stations don't stack exactly
      const randomOffset = () => (Math.random() - 0.5) * 0.05;
      const payload = {
        name: stationForm.name,
        location: { type: 'Point', coordinates: [cityCoord[0] + randomOffset(), cityCoord[1] + randomOffset()] },
        address: { city: stationForm.city, street: stationForm.street, pincode: stationForm.pincode },
        status: stationForm.status,
        chargerTypes: stationForm.chargerTypes.map(c => ({ ...c, available: parseInt(c.count) })),
        totalSlots: stationForm.chargerTypes.reduce((s, c) => s + parseInt(c.count || 0), 0),
        availableSlots: stationForm.chargerTypes.reduce((s, c) => s + parseInt(c.count || 0), 0),
        operatingHours: { is24x7: stationForm.is24x7 },
      };

      if (editStation) {
        await stationAPI.update(editStation._id, payload);
        toast.success('Station updated');
      } else {
        await stationAPI.create(payload);
        toast.success('Station created');
      }
      setShowStationModal(false);
      setEditStation(null);
      setStationForm(emptyStationForm);
      loadAll();
    } catch (err) {
      toast.error(err.message || 'Failed to save station');
    }
  };

  const handleDeleteStation = async (id) => {
    if (!window.confirm('Delete this station?')) return;
    try {
      await stationAPI.delete(id);
      toast.success('Station deleted');
      loadAll();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleResolveFault = async (faultId) => {
    try {
      await faultAPI.resolve(faultId, { resolutionNote: 'Resolved by admin' });
      toast.success('Fault resolved');
      loadFaults();
    } catch (err) {
      toast.error('Failed to resolve fault');
    }
  };

  const openEditModal = (station) => {
    setEditStation(station);
    setStationForm({
      name: station.name,
      city: station.address?.city || 'Chennai',
      street: station.address?.street || '',
      pincode: station.address?.pincode || '',
      status: station.status,
      is24x7: station.operatingHours?.is24x7 ?? true,
      chargerTypes: station.chargerTypes || [],
    });
    setShowStationModal(true);
  };

  const exportCSV = () => {
    const rows = [
      ['Station', 'City', 'Status', 'Total Slots', 'Available', 'Rating'],
      ...stations.map(s => [s.name, s.address?.city, s.status, s.totalSlots, s.availableSlots, s.ratingsSummary?.average]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stations_report.csv';
    a.click();
    toast.success('CSV exported!');
  };

  const TABS = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'stations', label: '🏗️ Stations' },
    { key: 'faults', label: '⚠️ Faults' },
    { key: 'sessions', label: '🔋 Sessions' },
  ];

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800 }}>🛡️ Admin Panel</h1>
          <p className="text-muted text-sm mt-1">Manage stations, resolve faults, monitor platform</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={exportCSV}>📥 Export CSV</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', padding: 4, borderRadius: 'var(--radius-md)', width: 'fit-content', border: '1px solid var(--border)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`btn btn-sm ${activeTab === t.key ? 'btn-primary' : 'btn-ghost'}`}
            style={{ border: 'none' }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && stats && (
        <>
          <div className="stat-grid mb-6">
            {[
              { icon: '⚡', label: 'Total Sessions', value: stats.totalSessions?.toLocaleString(), color: 'var(--primary)' },
              { icon: '🔋', label: 'Active Sessions', value: stats.activeSessions, color: 'var(--success)' },
              { icon: '📅', label: "Today's Sessions", value: stats.todaySessions, color: 'var(--info)' },
              { icon: '⚡', label: 'Energy (kWh)', value: stats.totalEnergy?.toLocaleString(), color: 'var(--warning)' },
              { icon: '₹', label: 'Revenue', value: `₹${stats.totalRevenue?.toLocaleString()}`, color: 'var(--accent-light)' },
              { icon: '⏱️', label: 'Avg Duration', value: `${stats.avgSessionDuration}m`, color: 'var(--primary)' },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-icon" style={{ background: `${s.color}20`, color: s.color }}>{s.icon}</div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 className="card-title mb-4">Station Fleet Status</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {stats.stationStats?.map((s) => (
                <div key={s._id} style={{ padding: '12px 20px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', minWidth: 150, textAlign: 'center' }}>
                  <p className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s._id}</p>
                  <p style={{ fontFamily: 'Outfit', fontSize: '2rem', fontWeight: 800 }}>{s.count}</p>
                  <p className="text-xs" style={{ color: 'var(--primary)' }}>{s.availableSlots}/{s.totalSlots} slots free</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Stations Tab */}
      {activeTab === 'stations' && (
        <>
          <div className="flex justify-between mb-4">
            <h2 style={{ fontWeight: 700 }}>All Stations ({stations.length})</h2>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditStation(null); setStationForm(emptyStationForm); setShowStationModal(true); }}>
              + Add Station
            </button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>City</th><th>Status</th><th>Slots</th><th>Chargers</th><th>Rating</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {stations.map((station) => (
                  <tr key={station._id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{station.name}</td>
                    <td>{station.address?.city}</td>
                    <td><span className={`badge ${station.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{station.status}</span></td>
                    <td>{station.availableSlots}/{station.totalSlots}</td>
                    <td style={{ fontSize: '0.75rem' }}>{station.chargerTypes?.map(c => c.type).join(', ')}</td>
                    <td>⭐ {station.ratingsSummary?.average || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setQrStation(station)}>📱 QRs</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(station)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteStation(station._id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Faults Tab */}
      {activeTab === 'faults' && (
        <>
          <div className="flex justify-between mb-4">
            <h2 style={{ fontWeight: 700 }}>Fault Reports ({faults.length})</h2>
            <button className="btn btn-secondary btn-sm" onClick={loadFaults}>🔄 Refresh</button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Station</th><th>Type</th><th>Severity</th><th>Reporter</th><th>Status</th><th>Date</th><th>Action</th></tr>
              </thead>
              <tbody>
                {faults.map((fault) => (
                  <tr key={fault._id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fault.stationId?.name}</td>
                    <td style={{ fontSize: '0.8rem' }}>{fault.type?.replace(/_/g, ' ')}</td>
                    <td>
                      <span className={`badge ${fault.severity === 'critical' ? 'badge-danger' : fault.severity === 'high' ? 'badge-warning' : 'badge-info'}`}>
                        {fault.severity}
                      </span>
                    </td>
                    <td>{fault.reportedBy?.name}</td>
                    <td><span className={`badge ${fault.status === 'open' ? 'badge-danger' : fault.status === 'resolved' ? 'badge-success' : 'badge-warning'}`}>{fault.status}</span></td>
                    <td style={{ fontSize: '0.75rem' }}>{format(new Date(fault.createdAt), 'dd MMM yy')}</td>
                    <td>
                      {fault.status === 'open' && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleResolveFault(fault._id)}>✅ Resolve</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <>
          <div className="flex justify-between mb-4">
            <h2 style={{ fontWeight: 700 }}>All Sessions</h2>
            <button className="btn btn-secondary btn-sm" onClick={loadSessions}>🔄 Refresh</button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>User</th><th>Station</th><th>Charger</th><th>Duration</th><th>Energy</th><th>Cost</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {allSessions.map((sess) => (
                  <tr key={sess._id}>
                    <td>{sess.userId?.name}</td>
                    <td>{sess.stationId?.name}</td>
                    <td className="text-xs">{sess.chargerType}</td>
                    <td>{sess.duration}m</td>
                    <td>{sess.energyConsumed} kWh</td>
                    <td>₹{sess.cost}</td>
                    <td><span className={`badge ${sess.status === 'completed' ? 'badge-success' : 'badge-primary'}`}>{sess.status}</span></td>
                    <td className="text-xs">{format(new Date(sess.startTime), 'dd MMM, h:mm a')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Station Modal */}
      {showStationModal && (
        <div className="modal-overlay" onClick={() => setShowStationModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editStation ? '✏️ Edit Station' : '➕ Add Station'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowStationModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveStation}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Station Name *</label>
                    <input className="form-input" required value={stationForm.name} onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })} placeholder="e.g. Phoenix Mall EV Hub" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <select className="form-select" value={stationForm.city} onChange={(e) => setStationForm({ ...stationForm, city: e.target.value })}>
                      {CITIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Street Address</label>
                    <input className="form-input" value={stationForm.street} onChange={(e) => setStationForm({ ...stationForm, street: e.target.value })} placeholder="Street address" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={stationForm.status} onChange={(e) => setStationForm({ ...stationForm, status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>
                </div>

                <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>⚡ Charger Types</h4>
                {stationForm.chargerTypes.map((charger, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                    <div>
                      {i === 0 && <label className="form-label">Type</label>}
                      <select className="form-select" value={charger.type} onChange={(e) => {
                        const updated = [...stationForm.chargerTypes];
                        updated[i] = { ...updated[i], type: e.target.value };
                        setStationForm({ ...stationForm, chargerTypes: updated });
                      }}>
                        {CHARGER_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      {i === 0 && <label className="form-label">kW</label>}
                      <input className="form-input" type="number" value={charger.powerKW} onChange={(e) => {
                        const updated = [...stationForm.chargerTypes];
                        updated[i] = { ...updated[i], powerKW: Number(e.target.value) };
                        setStationForm({ ...stationForm, chargerTypes: updated });
                      }} />
                    </div>
                    <div>
                      {i === 0 && <label className="form-label">Count</label>}
                      <input className="form-input" type="number" min="1" value={charger.count} onChange={(e) => {
                        const updated = [...stationForm.chargerTypes];
                        updated[i] = { ...updated[i], count: Number(e.target.value) };
                        setStationForm({ ...stationForm, chargerTypes: updated });
                      }} />
                    </div>
                    <div>
                      {i === 0 && <label className="form-label">₹/kWh</label>}
                      <input className="form-input" type="number" value={charger.pricePerKWh} onChange={(e) => {
                        const updated = [...stationForm.chargerTypes];
                        updated[i] = { ...updated[i], pricePerKWh: Number(e.target.value) };
                        setStationForm({ ...stationForm, chargerTypes: updated });
                      }} />
                    </div>
                    <button type="button" className="btn btn-danger btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => {
                      setStationForm({ ...stationForm, chargerTypes: stationForm.chargerTypes.filter((_, idx) => idx !== i) });
                    }}>✕</button>
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStationForm({ ...stationForm, chargerTypes: [...stationForm.chargerTypes, { type: 'Type2', powerKW: 22, count: 2, pricePerKWh: 12 }] })}>
                  + Add Charger Type
                </button>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowStationModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editStation ? 'Update Station' : 'Create Station'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Codes Modal */}
      {qrStation && (
        <div className="modal-overlay" onClick={() => setQrStation(null)}>
          <div className="modal" style={{ maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📱 Slot QR Codes - {qrStation.name}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setQrStation(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-muted text-sm mb-4">
                Print these QR codes and place them on the physical charging slots. Users can scan them to instantly start charging at the specific slot.
              </p>
              {window.location.hostname === 'localhost' && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: 12, borderRadius: 8, marginBottom: 20 }}>
                  <p className="text-sm font-bold" style={{ color: 'var(--danger)' }}>
                    ⚠️ Warning: You are accessing this page via localhost.
                  </p>
                  <p className="text-xs text-muted mt-1">
                    QR codes generated now will point to localhost and won't work on other devices (like phones). 
                    To generate scannable QR codes, please access this admin panel using your computer's Network IP address (e.g., http://192.168.x.x:5173).
                  </p>
                </div>
              )}
              {qrStation.slots && qrStation.slots.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                  {qrStation.slots.map((slot) => {
                    const chargeUrl = `${window.location.origin}/charge?station=${qrStation._id}&slot=${slot.slot_id}`;
                    return (
                      <div key={slot._id || slot.slot_id} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 16px' }}>
                        <h4 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 4 }}>{slot.slot_id}</h4>
                        <span className="badge badge-primary mb-4">{slot.charger_type}</span>
                        <div style={{ background: 'white', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                          <QRCodeSVG value={chargeUrl} size={140} level="H" includeMargin={false} />
                        </div>
                        <a href={chargeUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', wordBreak: 'break-all' }}>
                          Test Link
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                  <p className="text-warning mb-2">⚠️ No slots configured for this station yet.</p>
                  <p className="text-sm text-muted">Update the station to automatically generate slots based on the charger counts.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
