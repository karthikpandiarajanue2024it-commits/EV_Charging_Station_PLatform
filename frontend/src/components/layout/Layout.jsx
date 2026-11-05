import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        {/* Top navbar on mobile */}
        <nav className="navbar">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ display: 'none' }}
            id="sidebar-toggle"
          >
            ☰
          </button>
          <div className="navbar-brand">
            <div className="brand-icon">⚡</div>
            EVCharge IQ
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              India's EV Intelligence Platform
            </span>
          </div>
        </nav>
        <main style={{ flex: 1 }}>
          <Outlet />
        </main>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
          },
          success: { iconTheme: { primary: 'var(--success)', secondary: 'white' } },
          error: { iconTheme: { primary: 'var(--danger)', secondary: 'white' } },
        }}
      />
    </div>
  );
}
