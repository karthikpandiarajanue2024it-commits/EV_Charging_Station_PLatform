import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { stationAPI, sessionAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';

export default function ChargeSlotPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const stationId = searchParams.get('station');
  const slotId = searchParams.get('slot');

  const [station, setStation] = useState(null);
  const [slot, setSlot] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const { socket } = useSocket();

  const loadData = async () => {
    try {
      setLoading(true);
      const [stationRes, sessionRes] = await Promise.all([
        stationAPI.getById(stationId),
        sessionAPI.getActive()
      ]);

      const st = stationRes.data;
      setStation(st);

      // Find the specific slot
      const foundSlot = st.slots?.find(s => s.slot_id === slotId);
      if (!foundSlot) {
        toast.error('Slot not found at this station');
      } else {
        setSlot(foundSlot);
      }

      if (sessionRes.data) {
        setActiveSession(sessionRes.data);
      }
    } catch (err) {
      toast.error('Failed to load station data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!stationId || !slotId) {
      toast.error('Invalid QR Code. Missing station or slot parameter.');
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [stationId, slotId]);

  useEffect(() => {
    if (!socket || !stationId) return;
    
    // Listen for live updates to the slot we are viewing
    socket.emit('join_station', stationId);

    const handleSlotUpdate = (data) => {
      if (data.stationId === stationId && data.slots) {
        const updatedSlot = data.slots.find(s => s.slot_id === slotId);
        if (updatedSlot) setSlot(updatedSlot);
      }
    };

    socket.on('slot_updated', handleSlotUpdate);

    return () => {
      socket.off('slot_updated', handleSlotUpdate);
      socket.emit('leave_station', stationId);
    };
  }, [socket, stationId, slotId]);



  const handleStartCharging = async () => {
    try {
      setActionLoading(true);
      const res = await sessionAPI.start({
        stationId,
        slotId, // Pass the slot ID now!
        chargerType: slot.charger_type,
        vehicleSOCStart: 20 // Dummy value
      });
      
      toast.success('Charging Session Started!');
      setActiveSession(res.data);
      
      // Update local slot state to reflect it's now occupied by us
      setSlot(prev => ({ ...prev, status: 'occupied', current_session_id: res.data._id }));
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to start session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopCharging = async () => {
    if (!activeSession) return;
    try {
      setActionLoading(true);
      const res = await sessionAPI.end(activeSession._id, { vehicleSOCEnd: 85 });
      
      toast.success(`Session ended. Cost: ₹${res.data.cost}`);
      setActiveSession(null);
      
      // Update local slot state
      setSlot(prev => ({ ...prev, status: 'free', current_session_id: null }));
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to end session');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!station || !slot) {
    return (
      <div className="page-container">
        <div className="card text-center" style={{ padding: '60px 20px', maxWidth: 500, margin: '40px auto' }}>
          <h2 style={{ marginBottom: 10 }}>Station or Slot not found.</h2>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
        </div>
      </div>
    );
  }

  // Determine State
  const isOccupiedByMe = activeSession?.slotId === slot.slot_id && activeSession?.stationId?._id === station._id;
  const isBusy = slot.status === 'occupied' && !isOccupiedByMe;
  const isFree = slot.status === 'free';
  const hasOtherSession = activeSession && !isOccupiedByMe;

  return (
    <div className="page-container animate-slide-in">
      <div style={{ maxWidth: 500, margin: '40px auto' }}>
        
        <div className="card" style={{ padding: '30px 24px', textAlign: 'center', boxShadow: isOccupiedByMe ? 'var(--shadow-glow)' : 'var(--shadow-card)', borderColor: isOccupiedByMe ? 'var(--primary)' : 'var(--border)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ 
              width: 80, height: 80, borderRadius: '50%', 
              background: isOccupiedByMe ? 'var(--success)' : (isFree ? 'var(--bg-elevated)' : 'var(--danger)'),
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem',
              border: `2px solid ${isOccupiedByMe ? 'rgba(255,255,255,0.4)' : 'var(--border)'}`
            }}>
              {isOccupiedByMe ? '⚡' : '🔌'}
            </div>
          </div>

          <p className="text-muted text-sm font-bold uppercase tracking-wider mb-2">{station.name}</p>
          <h1 style={{ fontFamily: 'Outfit', fontSize: '2.5rem', fontWeight: 800, marginBottom: 10 }}>
            {slot.slot_id}
          </h1>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, margin: '16px 0 30px' }}>
            <span className="badge badge-primary">{slot.charger_type}</span>
            <span className={`badge ${isOccupiedByMe ? 'badge-success' : (isFree ? 'badge-warning' : 'badge-danger')}`}>
              {isOccupiedByMe ? 'Charging...' : (isFree ? 'Available' : 'Occupied')}
            </span>
          </div>

          {/* Actions */}
          {hasOtherSession && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: 12, borderRadius: 8, marginBottom: 20 }}>
              <p className="text-sm font-bold" style={{ color: 'var(--danger)' }}>You already have an active session running at a different slot/station.</p>
            </div>
          )}

          {isFree && !hasOtherSession && (
            <button 
              className={`btn btn-primary btn-full btn-lg ${actionLoading ? 'btn-loading' : ''}`} 
              onClick={handleStartCharging}
              disabled={actionLoading}
            >
              🚀 Start Charging
            </button>
          )}

          {isOccupiedByMe && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', padding: '20px', borderRadius: 8, marginBottom: 20 }}>
              <p className="text-lg font-bold" style={{ color: 'var(--success)', marginBottom: 8 }}>Energy is Flowing!</p>
              <p className="text-sm text-muted mb-4">Your vehicle is currently being charged at this slot.</p>
              
              <button 
                className={`btn btn-danger btn-full ${actionLoading ? 'btn-loading' : ''}`} 
                onClick={handleStopCharging}
                disabled={actionLoading}
              >
                ⏹️ Stop Charging
              </button>
            </div>
          )}

          {isBusy && (
            <button className="btn btn-secondary btn-full btn-lg" disabled>
              ⚠️ Slot is Currently Occupied
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
