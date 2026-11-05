import { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend, Filler
);

const chartDefaults = {
  color: 'rgba(241, 245, 249, 0.7)',
  plugins: {
    legend: { labels: { color: 'rgba(241, 245, 249, 0.7)', font: { family: 'Inter', size: 12 } } },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
      grid: { color: 'rgba(255,255,255,0.04)' },
    },
    y: {
      ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
      grid: { color: 'rgba(255,255,255,0.04)' },
    },
  },
};

export default function AnalyticsPage() {
  const [peakHours, setPeakHours] = useState([]);
  const [usageTrends, setUsageTrends] = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  const [weather, setWeather] = useState([]);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [peakRes, trendRes, occRes, weatherRes] = await Promise.all([
        analyticsAPI.getPeakHours({ days: period }),
        analyticsAPI.getUsageTrends({ days: period }),
        analyticsAPI.getOccupancyRate({ days: 7 }),
        analyticsAPI.getWeatherImpact(),
      ]);
      setPeakHours(peakRes.data || []);
      setUsageTrends(trendRes.data || []);
      setOccupancy(occRes.data || []);
      setWeather(weatherRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Peak Hours Bar Chart
  const peakHoursData = {
    labels: peakHours.map((h) => `${String(h.hour).padStart(2, '0')}:00`),
    datasets: [
      {
        label: 'Sessions',
        data: peakHours.map((h) => h.sessionCount),
        backgroundColor: peakHours.map((h) =>
          h.sessionCount === Math.max(...peakHours.map((x) => x.sessionCount))
            ? 'rgba(0, 212, 170, 0.9)'
            : 'rgba(0, 212, 170, 0.35)'
        ),
        borderColor: 'rgba(0, 212, 170, 0.8)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  // Usage Trends Line Chart
  const trendData = {
    labels: usageTrends.map((d) => d.date),
    datasets: [
      {
        label: 'Sessions',
        data: usageTrends.map((d) => d.totalSessions),
        borderColor: 'rgba(0, 212, 170, 1)',
        backgroundColor: 'rgba(0, 212, 170, 0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(0, 212, 170, 0.9)',
        pointRadius: 3,
      },
      {
        label: 'Energy (kWh)',
        data: usageTrends.map((d) => Math.round(d.totalEnergy)),
        borderColor: 'rgba(124, 58, 237, 0.9)',
        backgroundColor: 'rgba(124, 58, 237, 0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(124, 58, 237, 0.9)',
        pointRadius: 3,
      },
    ],
  };

  // Occupancy Doughnut Chart
  const topOccupancy = occupancy.slice(0, 6);
  const occupancyData = {
    labels: topOccupancy.map((s) => s.stationName?.slice(0, 20) || 'Station'),
    datasets: [
      {
        data: topOccupancy.map((s) => s.occupancyRate),
        backgroundColor: [
          'rgba(0,212,170,0.8)', 'rgba(124,58,237,0.8)', 'rgba(245,158,11,0.8)',
          'rgba(239,68,68,0.8)', 'rgba(59,130,246,0.8)', 'rgba(16,185,129,0.8)',
        ],
        borderColor: 'rgba(31, 41, 55, 0.9)',
        borderWidth: 2,
      },
    ],
  };

  // Weather Impact Bar Chart
  const weatherData = {
    labels: weather.map((w) => w.weather),
    datasets: [
      {
        label: 'Avg Duration (min)',
        data: weather.map((w) => w.avgDuration),
        backgroundColor: 'rgba(245, 158, 11, 0.7)',
        borderColor: 'rgba(245, 158, 11, 0.9)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Total Sessions',
        data: weather.map((w) => w.totalSessions),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 0.9)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const peakHour = peakHours.reduce((max, h) => h.sessionCount > max.sessionCount ? h : max, { sessionCount: 0, hour: '--' });
  const totalSessions = usageTrends.reduce((sum, d) => sum + d.totalSessions, 0);
  const totalEnergy = usageTrends.reduce((sum, d) => sum + d.totalEnergy, 0);
  const avgDuration = usageTrends.length
    ? Math.round(usageTrends.reduce((sum, d) => sum + d.avgDuration, 0) / usageTrends.length)
    : 0;

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800 }}>📊 Analytics</h1>
          <p className="text-muted text-sm mt-1">Usage patterns, demand forecasting & insights</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 60].map((p) => (
            <button
              key={p}
              className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPeriod(p)}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /><p>Loading analytics...</p></div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="stat-grid mb-6">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(0,212,170,0.15)', color: 'var(--primary)' }}>⚡</div>
              <div className="stat-value">{totalSessions.toLocaleString()}</div>
              <div className="stat-label">Total Sessions</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--accent-light)' }}>🔋</div>
              <div className="stat-value">{Math.round(totalEnergy).toLocaleString()}</div>
              <div className="stat-label">kWh Dispensed</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}>🕐</div>
              <div className="stat-value">{avgDuration}m</div>
              <div className="stat-label">Avg Session Duration</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)' }}>📈</div>
              <div className="stat-value">{String(peakHour.hour).padStart(2, '0')}:00</div>
              <div className="stat-label">Peak Hour</div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid-2 mb-6">
            <div className="chart-wrapper">
              <div className="card-header">
                <div>
                  <h3 className="card-title">⏰ Peak Hours Heatmap</h3>
                  <p className="card-subtitle">Sessions by hour of day (last {period} days)</p>
                </div>
              </div>
              <div className="chart-container">
                <Bar
                  data={peakHoursData}
                  options={{
                    ...chartDefaults,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      ...chartDefaults.plugins,
                      legend: { display: false },
                    },
                  }}
                />
              </div>
            </div>

            <div className="chart-wrapper">
              <div className="card-header">
                <h3 className="card-title">🥧 Station Occupancy Rate</h3>
                <p className="card-subtitle">Top stations by usage</p>
              </div>
              <div className="chart-container">
                <Doughnut
                  data={occupancyData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      ...chartDefaults.plugins,
                      legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 } },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Usage Trends */}
          <div className="chart-wrapper mb-6">
            <div className="card-header">
              <h3 className="card-title">📈 Day-wise Usage Trends</h3>
              <p className="card-subtitle">Sessions and energy over the last {period} days</p>
            </div>
            <div className="chart-container" style={{ height: 300 }}>
              <Line
                data={trendData}
                options={{
                  ...chartDefaults,
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </div>
          </div>

          {/* Weather Impact */}
          <div className="chart-wrapper mb-6">
            <div className="card-header">
              <h3 className="card-title">🌤️ Weather Impact on Charging</h3>
              <p className="card-subtitle">How weather affects EV charging behavior</p>
            </div>
            <div className="chart-container" style={{ height: 250 }}>
              <Bar
                data={weatherData}
                options={{
                  ...chartDefaults,
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    ...chartDefaults.plugins,
                  },
                }}
              />
            </div>
          </div>

          {/* Occupancy Table */}
          <div className="table-container">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 className="card-title">🏗️ Station Performance Table</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Station</th>
                  <th>City</th>
                  <th>Total Sessions</th>
                  <th>Avg Duration</th>
                  <th>Occupancy Rate</th>
                </tr>
              </thead>
              <tbody>
                {occupancy.map((s, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{s.stationName}</td>
                    <td>{s.city}</td>
                    <td>{s.totalSessions}</td>
                    <td>{Math.round(s.avgDuration || 0)} min</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: 3 }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${Math.min(s.occupancyRate, 100)}%`,
                            background: s.occupancyRate < 40 ? 'var(--success)' : s.occupancyRate < 70 ? 'var(--warning)' : 'var(--danger)',
                          }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{s.occupancyRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
