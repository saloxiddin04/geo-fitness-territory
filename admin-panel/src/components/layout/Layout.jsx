import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  LayoutDashboard, Users, MapPin, Activity, Bell,
  Trophy, Moon, Settings, FileText, BarChart2,
  Shield, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { logout } from '../../store/slices/adminAuthSlice';

const NAV = [
  { path: '/',              icon: LayoutDashboard, label: 'Dashboard',        color: '#3b82f6' },
  { path: '/users',         icon: Users,           label: 'Foydalanuvchilar', color: '#22c55e' },
  { path: '/territories',   icon: MapPin,          label: 'Hududlar',         color: '#f59e0b' },
  { path: '/sessions',      icon: Activity,        label: 'Sessiyalar',       color: '#a855f7' },
  { path: '/leaderboard',   icon: Trophy,          label: 'Reyting',          color: '#eab308' },
  { path: '/notifications', icon: Bell,            label: 'Bildirishnomalar', color: '#ec4899' },
  { path: '/night-event',   icon: Moon,            label: 'Night Event',      color: '#6366f1' },
  { path: '/statistics',    icon: BarChart2,       label: 'Statistika',       color: '#14b8a6' },
  { path: '/admins',        icon: Shield,          label: 'Adminlar',         color: '#ef4444' },
  { path: '/logs',          icon: FileText,        label: 'Loglar',           color: '#94a3b8' },
  { path: '/settings',      icon: Settings,        label: 'Sozlamalar',       color: '#64748b' },
];

function RealtimeClock() {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ color: 'var(--c-muted)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
      {time.toLocaleTimeString('uz-UZ')}
    </span>
  );
}

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { admin } = useSelector((s) => s.adminAuth);

  const currentNav = NAV.find((n) => n.path === location.pathname);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--c-bg)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? 64 : 220,
        background: 'var(--c-surface)',
        borderRight: '1px solid var(--c-border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.22s cubic-bezier(.4,0,.2,1)',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10,
      }}>

        {/* Logo */}
        <div style={{
          padding: collapsed ? '18px 0' : '18px 16px',
          borderBottom: '1px solid var(--c-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          minHeight: 60,
        }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 12px rgba(59,130,246,0.35)',
          }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>GF</span>
          </div>
          {!collapsed && (
            <div>
              <div style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Geo Fitness</div>
              <div style={{ color: 'var(--c-muted)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Admin Panel</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: collapsed ? '10px 0' : '9px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 9,
                  marginBottom: 2,
                  textDecoration: 'none',
                  color: isActive ? '#fff' : 'var(--c-text2)',
                  background: isActive ? `linear-gradient(90deg, ${item.color}22, ${item.color}11)` : 'transparent',
                  borderLeft: isActive ? `3px solid ${item.color}` : '3px solid transparent',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 13,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.color = 'var(--c-text)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--c-text2)';
                  }
                }}
              >
                <Icon
                  size={17}
                  style={{ color: isActive ? item.color : undefined, flexShrink: 0 }}
                />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Admin profile */}
        <div style={{
          padding: collapsed ? '12px 0' : '12px',
          borderTop: '1px solid var(--c-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: collapsed ? 'center' : 'stretch',
        }}>
          {!collapsed && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              background: 'var(--c-panel)',
              borderRadius: 8,
              border: '1px solid var(--c-border)',
            }}>
              <div style={{
                width: 30, height: 30,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {admin?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  color: 'var(--c-text)',
                  fontSize: 12,
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {admin?.username || 'Admin'}
                </div>
                <div style={{ color: 'var(--c-muted)', fontSize: 10 }}>
                  {admin?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Chiqish"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 8,
              width: '100%',
              padding: collapsed ? '10px' : '9px 12px',
              borderRadius: 8,
              background: 'transparent',
              border: '1px solid transparent',
              cursor: 'pointer',
              color: 'var(--c-muted)',
              fontSize: 13,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--c-red-dim)';
              e.currentTarget.style.color = 'var(--c-red)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--c-muted)';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            <LogOut size={15} style={{ flexShrink: 0 }} />
            {!collapsed && 'Chiqish'}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: 'absolute',
            right: -12,
            top: 74,
            width: 24, height: 24,
            background: 'var(--c-panel)',
            border: '1px solid var(--c-border2)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--c-text2)',
            zIndex: 20,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--c-blue)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--c-panel)';
            e.currentTarget.style.color = 'var(--c-text2)';
          }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Header */}
        <header style={{
          height: 56,
          background: 'var(--c-surface)',
          borderBottom: '1px solid var(--c-border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 12,
          flexShrink: 0,
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--c-muted)', fontSize: 13 }}>Panel</span>
            {currentNav && (
              <>
                <span style={{ color: 'var(--c-border2)', fontSize: 13 }}>/</span>
                <span style={{ color: 'var(--c-text)', fontSize: 13, fontWeight: 600 }}>
                  {currentNav.label}
                </span>
              </>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Status dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--c-muted)' }}>
            <span style={{
              width: 7, height: 7,
              background: '#22c55e',
              borderRadius: '50%',
              boxShadow: '0 0 6px #22c55e',
              display: 'inline-block',
            }} />
            Online
          </div>

          <div style={{
            width: 1,
            height: 20,
            background: 'var(--c-border)',
            margin: '0 8px',
          }} />

          <RealtimeClock />
        </header>

        {/* Page content */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
          background: 'var(--c-bg)',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
