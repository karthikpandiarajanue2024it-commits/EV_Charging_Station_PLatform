import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const navItems = [
  { to: '/dashboard', icon: '⚡', label: 'Dashboard' },
  { to: '/map', icon: '🗺️', label: 'Map View' },
  { to: '/sessions', icon: '🔋', label: 'My Sessions' },
];

const adminItems = [
  { to: '/admin', icon: '🛡️', label: 'Admin Panel' },
  { to: '/admin/stations', icon: '🏗️', label: 'Stations' },
  { to: '/admin/faults', icon: '⚠️', label: 'Faults' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {isOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 99, background: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        />
      )}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">⚡</div>
          <span>EVCharge IQ</span>
        </div>

        {/* Connection Status */}
        <div style={{ padding: '8px 16px' }}>
          <div className={`live-badge`} style={{ opacity: connected ? 1 : 0.4 }}>
            <div className="live-dot" style={{ background: connected ? 'var(--success)' : 'var(--danger)' }} />
            {connected ? 'Live' : 'Offline'}
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <p className="nav-section-label">Navigation</p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <NavLink
            to="/analytics"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="nav-icon">📊</span>
            Analytics
          </NavLink>

          {isAdmin && (
            <>
              <p className="nav-section-label">Admin</p>
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User Profile */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name || 'Guest'}</div>
              <div className="user-role">{user?.role || 'user'}</div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-full mt-2"
            style={{ fontSize: '0.8rem', padding: '8px' }}
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </div>
      </aside>
    </>
  );
}
