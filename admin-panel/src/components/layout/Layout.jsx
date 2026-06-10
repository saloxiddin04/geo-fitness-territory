// Admin panel Layout - sidebar va header
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  LayoutDashboard, Users, MapPin, Activity, Bell,
  Trophy, Moon, Settings, FileText, BarChart2,
  Shield, LogOut, Menu, X, ChevronRight,
} from 'lucide-react';
import { logout } from '../../store/slices/adminAuthSlice';

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/users', icon: Users, label: 'Foydalanuvchilar' },
  { path: '/territories', icon: MapPin, label: 'Hududlar' },
  { path: '/sessions', icon: Activity, label: 'Sessiyalar' },
  { path: '/leaderboard', icon: Trophy, label: 'Reyting' },
  { path: '/notifications', icon: Bell, label: 'Bildirishnomalar' },
  { path: '/night-event', icon: Moon, label: 'Night Event' },
  { path: '/statistics', icon: BarChart2, label: 'Statistika' },
  { path: '/admins', icon: Shield, label: 'Adminlar' },
  { path: '/logs', icon: FileText, label: 'Loglar' },
  { path: '/settings', icon: Settings, label: 'Sozlamalar' },
];

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { admin } = useSelector(state => state.adminAuth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 240 : 64,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--accent-green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: '#000', fontSize: 14, fontWeight: 'bold' }}>GF</span>
          </div>
          {sidebarOpen && (
            <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: 15, whiteSpace: 'nowrap' }}>
              Geo Fitness Admin
            </span>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  borderRadius: 6,
                  marginBottom: 2,
                  textDecoration: 'none',
                  color: isActive ? 'var(--accent-green)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(63, 185, 80, 0.1)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 14,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {sidebarOpen && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Admin info + logout */}
        <div style={{ padding: 12, borderTop: '1px solid var(--border-color)' }}>
          {sidebarOpen && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>
                {admin?.username || 'Admin'}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                {admin?.role || 'SUPER_ADMIN'}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '8px 10px', borderRadius: 6,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--accent-red)', fontSize: 14,
            }}
          >
            <LogOut size={16} />
            {sidebarOpen && 'Chiqish'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{
          padding: '0 20px',
          height: 56,
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--bg-secondary)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'transparent', border: 'none',
              cursor: 'pointer', color: 'var(--text-secondary)', padding: 4,
            }}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {NAV_ITEMS.find(n => n.path === location.pathname)?.label || 'Panel'}
          </span>

          <div style={{ flex: 1 }} />

          {/* Real-time vaqt */}
          <RealtimeClock />
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {children}
        </main>
      </div>
    </div>
  );
};

// Real-time soat
const RealtimeClock = () => {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
      {time.toLocaleString('uz-UZ')}
    </span>
  );
};

export default Layout;
