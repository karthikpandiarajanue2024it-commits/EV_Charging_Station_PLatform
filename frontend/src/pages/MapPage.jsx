import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { stationAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

// Fix Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createMarkerIcon = (availableSlots, totalSlots, status) => {
  if (status === 'offline') {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-pin marker-offline"><span class="marker-icon">❌</span></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });
  }
  const ratio = availableSlots / (totalSlots || 1);
  let cls = 'marker-available';
  let icon = '⚡';
  if (ratio === 0) { cls = 'marker-full'; icon = '🔴'; }
  else if (ratio < 0.4) { cls = 'marker-partial'; icon = '🟡'; }

  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="marker-pin ${cls}"><span class="marker-icon">${icon}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

function SetViewOnSearch({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView(coords, 13, { animate: true });
  }, [coords, map]);
  return null;
}

const RADIUS_OPTIONS = [1000, 3000, 5000, 10000, 20000];
const CITY_CENTERS = {
  Chennai: [13.0827, 80.2707],
  Bangalore: [12.9716, 77.5946],
  Mumbai: [19.0760, 72.8777],
  Delhi: [28.7041, 77.1025],
  Hyderabad: [17.3850, 78.4867],
};

export default function MapPage() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userPos, setUserPos] = useState(null);
  const [mapCenter, setMapCenter] = useState([13.0827, 80.2707]);
  const [radius, setRadius] = useState(5000);
  const [chargerFilter, setChargerFilter] = useState('');
  const [showRadius, setShowRadius] = useState(true);
  const { socket } = useSocket();

  // Fetch stations on load (all stations for map view)
  useEffect(() => {
    fetchAllStations();
    locateUser();
  }, []);

  // Real-time slot updates via Socket.io
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      setStations((prev) =>
        prev.map((s) =>
          s._id === data.stationId
            ? { ...s, availableSlots: data.availableSlots, currentOccupancyRate: data.currentOccupancyRate }
            : s
        )
      );
    };
    socket.on('map_update', handler);
    return () => socket.off('map_update', handler);
  }, [socket]);

  const fetchAllStations = async () => {
    try {
      setLoading(true);
      const res = await stationAPI.getAll({ limit: 100 });
      setStations(res.data || []);
    } catch (err) {
      toast.error('Failed to load stations');
    } finally {
      setLoading(false);
    }
  };

  const searchNearby = async () => {
    if (!userPos) {
      toast.error('Please allow location access first');
      return;
    }
    try {
      setLoading(true);
      const res = await stationAPI.getNearby({
        longitude: userPos[1],
        latitude: userPos[0],
        radius,
        chargerType: chargerFilter || undefined,
      });
      setStations(res.data || []);
      toast.success(`Found ${res.count} stations within ${radius / 1000}km`);
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const locateUser = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(coords);
        setMapCenter(coords);
        toast.success('Location found!');
      },
      () => toast.error('Location access denied. Using Chennai as default.')
    );
  };

  const handleCitySelect = (city) => {
    const coords = CITY_CENTERS[city];
    if (coords) setMapCenter(coords);
  };

  const filteredStations = chargerFilter
    ? stations.filter((s) => s.chargerTypes?.some((c) => c.type === chargerFilter))
    : stations;

  return (
    <div className="page-container animate-fade-in" style={{ padding: '16px' }}>
      {/* Controls */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          className="form-select"
          style={{ width: 'auto' }}
          onChange={(e) => handleCitySelect(e.target.value)}
        >
          <option value="">Select City</option>
          {Object.keys(CITY_CENTERS).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
        >
          {RADIUS_OPTIONS.map((r) => (
            <option key={r} value={r}>{r / 1000}km radius</option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={chargerFilter}
          onChange={(e) => setChargerFilter(e.target.value)}
        >
          <option value="">All Charger Types</option>
          {['Type1', 'Type2', 'CCS', 'CHAdeMO', 'Bharat AC', 'Bharat DC'].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <button className="btn btn-primary btn-sm" onClick={searchNearby} disabled={loading}>
          📍 Nearby ({radius / 1000}km)
        </button>

        <button className="btn btn-secondary btn-sm" onClick={locateUser}>
          🎯 My Location
        </button>

        <button
          className={`btn btn-ghost btn-sm ${showRadius ? 'active' : ''}`}
          onClick={() => setShowRadius(!showRadius)}
        >
          ⭕ Radius
        </button>

        <button className="btn btn-secondary btn-sm" onClick={fetchAllStations} disabled={loading}>
          🔄 All Stations
        </button>

        {loading && <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />}

        <span className="text-sm text-muted">
          {filteredStations.length} station{filteredStations.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { color: 'var(--success)', label: 'Available' },
          { color: 'var(--warning)', label: 'Partial (<40%)' },
          { color: 'var(--danger)', label: 'Full' },
          { color: 'var(--text-muted)', label: 'Offline' },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color }} />
            {l.label}
          </div>
        ))}
        <div className="live-badge" style={{ marginLeft: 'auto' }}>
          <div className="live-dot" />
          Real-time updates
        </div>
      </div>

      {/* Map */}
      <div className="map-container">
        <MapContainer
          center={mapCenter}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <SetViewOnSearch coords={mapCenter} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
          />

          {/* User location marker */}
          {userPos && (
            <>
              <Marker position={userPos} icon={L.divIcon({
                className: 'custom-marker',
                html: '<div style="width:16px;height:16px;background:var(--info);border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(59,130,246,0.8)"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              })}>
                <Popup><strong>📍 Your Location</strong></Popup>
              </Marker>
              {showRadius && (
                <Circle
                  center={userPos}
                  radius={radius}
                  pathOptions={{ color: 'var(--primary)', fillColor: 'var(--primary)', fillOpacity: 0.05, weight: 1.5, dashArray: '6' }}
                />
              )}
            </>
          )}

          {/* Station markers */}
          {filteredStations.map((station) => {
            const [lng, lat] = station.location?.coordinates || [0, 0];
            return (
              <Marker
                key={station._id}
                position={[lat, lng]}
                icon={createMarkerIcon(station.availableSlots, station.totalSlots, station.status)}
              >
                <Popup minWidth={240}>
                  <div style={{ fontFamily: 'Inter, sans-serif' }}>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      ⚡ {station.name}
                    </strong>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0' }}>
                      📍 {station.address?.city}, {station.address?.state}
                    </p>
                    {station.googleRating > 0 && (
                      <p style={{ fontSize: '0.75rem', color: '#fbbf24', margin: '4px 0', fontWeight: 600 }}>
                        ⭐ {station.googleRating} / 5 (Google Maps)
                      </p>
                    )}
                    <div style={{ margin: '8px 0', padding: '8px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                      <strong style={{
                        fontSize: '0.85rem',
                        color: station.availableSlots > 0 ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {station.availableSlots > 0 ? `${station.availableSlots} slots available` : 'All slots occupied'}
                      </strong>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Occupancy: {station.currentOccupancyRate || 0}%
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {station.chargerTypes?.map((c, i) => (
                        <span key={i} style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-secondary)' }}>
                          {c.type} {c.powerKW}kW
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ flex: 1, padding: '6px 10px', background: 'var(--primary)', color: '#0a0f1e', borderRadius: 8, textDecoration: 'none', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', display: 'block' }}
                      >
                        🗺️ Navigate
                      </a>
                      <Link
                        to={`/stations/${station._id}`}
                        style={{ flex: 1, padding: '6px 10px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderRadius: 8, textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center', border: '1px solid var(--border)', display: 'block' }}
                      >
                        Details →
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
