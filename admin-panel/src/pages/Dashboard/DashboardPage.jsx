import { useEffect, useState } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, MapPin, Activity, Moon, Sun, Wifi, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../../services/api.service';
import { adminSocket } from '../../services/socket.service';
import { Toast, pageTitle, pageSubtitle } from '../../components/ui/shared.jsx';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--c-panel)', border: '1px solid var(--c-border2)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: 'var(--c-text2)', marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: 'var(--c-text2)' }}>{p.name}:</span>
          <span style={{ color: 'var(--c-text)', fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, loading }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ padding: 10, borderRadius: 10, background: color + '22', display: 'flex' }}>
          <Icon size={17} style={{ color }} />
        </div>
      </div>
      {loading ? (
        <div className="animate-pulse" style={{ height: 28, borderRadius: 6, marginBottom: 4 }} />
      ) : (
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-text)', lineHeight: 1, marginBottom: 4 }}>{value}</div>
      )}
      <div style={{ color: 'var(--c-muted)', fontSize: 12 }}>{label}</div>
      {sub && <div style={{ color: 'var(--c-muted)', fontSize: 11, marginTop: 2, opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

const DEMO_ACTIVITY = [
  { name: 'Dush', sessions: 45, users: 32 }, { name: 'Sesh', sessions: 62, users: 48 },
  { name: 'Chor', sessions: 38, users: 29 }, { name: 'Pay', sessions: 71, users: 55 },
  { name: 'Jum', sessions: 85, users: 67 }, { name: 'Shan', sessions: 110, users: 89 },
  { name: 'Yak', sessions: 95, users: 72 },
];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);
  const [nightLoading, setNightLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setStats(res.data.data);
      setOnlineCount(res.data.data.onlineCount ?? res.data.data.onlineUsers ?? 0);
    } catch (e) { console.error('Dashboard yuklash xatosi:', e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDashboard();
    adminSocket.connect();
    adminSocket.on('admin:stats', (data) => { if (data.onlineCount !== undefined) setOnlineCount(data.onlineCount); });
    return () => adminSocket.off('admin:stats');
  }, []);

  const handleNightToggle = async () => {
    setNightLoading(true);
    try {
      if (stats?.nightEventActive) {
        await api.post('/admin/night-event/stop');
        showToast("Night Event to'xtatildi");
      } else {
        await api.post('/admin/night-event/start');
        showToast('🌙 Night Event boshlandi!');
      }
      await fetchDashboard();
    } catch (e) { showToast(e.response?.data?.message || 'Xatolik yuz berdi', 'error'); }
    finally { setNightLoading(false); }
  };

  const isNight = stats?.nightEventActive;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={pageTitle}>Dashboard</h1>
          <p style={pageSubtitle}>Tizim holati va real-time statistika</p>
        </div>
        <button onClick={fetchDashboard} className="btn-secondary">
          <RefreshCw size={14} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} /> Yangilash
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <StatCard icon={Users} label="Jami foydalanuvchilar" value={stats?.totalUsers?.toLocaleString() ?? '—'} sub={stats?.newUsersToday !== undefined ? `+${stats.newUsersToday} bugun` : ''} color="#3b82f6" loading={loading} />
        <StatCard icon={Wifi} label="Online hozir" value={onlineCount.toString()} sub="Faol foydalanuvchilar" color="#22c55e" loading={loading} />
        <StatCard icon={Activity} label="Bugungi sessiyalar" value={stats?.todaySessions?.toString() ?? '—'} sub="Tugatilgan yugurish" color="#f59e0b" loading={loading} />
        <StatCard icon={MapPin} label="Egallangan hududlar" value={stats?.totalTerritories?.toLocaleString() ?? '—'} sub="Hozirgi holat" color="#a855f7" loading={loading} />
        <StatCard icon={AlertTriangle} label="Shubhali sessiyalar" value={stats?.suspiciousCount?.toString() ?? '—'} sub="Jami" color="#ef4444" loading={loading} />
        <StatCard icon={isNight ? Moon : Sun} label="Night Event" value={isNight ? 'FAOL' : 'NOFAOL'} sub={isNight ? 'Hozir aktiv' : 'Har kuni 20:00'} color={isNight ? '#f59e0b' : '#6b7280'} loading={loading} />
      </div>

      {/* Night event control panel */}
      <div className="card" style={{ border: `2px solid ${isNight ? 'rgba(245,158,11,0.35)' : 'var(--c-border)'}`, background: isNight ? 'rgba(245,158,11,0.04)' : 'var(--c-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ padding: 12, borderRadius: 12, background: isNight ? 'rgba(245,158,11,0.15)' : 'var(--c-panel)', display: 'flex' }}>
              {isNight ? <Moon size={22} style={{ color: 'var(--c-yellow)' }} /> : <Sun size={22} style={{ color: 'var(--c-muted)' }} />}
            </div>
            <div>
              <div style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: 15, marginBottom: 3 }}>
                {isNight ? '🌙 Night Event Faol' : '☀️ Oddiy Rejim'}
              </div>
              <div style={{ color: 'var(--c-muted)', fontSize: 13 }}>
                {isNight ? 'Barcha XP balllar multiplikatsiya bilan berilmoqda' : 'Night Event nofaol — har kuni 20:00–23:00 avtomatik'}
              </div>
            </div>
          </div>
          <button
            onClick={handleNightToggle} disabled={nightLoading || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 500,
              border: '1px solid', cursor: (nightLoading || loading) ? 'not-allowed' : 'pointer',
              opacity: (nightLoading || loading) ? 0.5 : 1, transition: 'all 0.15s',
              background: isNight ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
              color: isNight ? 'var(--c-red)' : 'var(--c-yellow)',
              borderColor: isNight ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)',
            }}
          >
            {nightLoading ? 'Jarayonda...' : isNight ? "To'xtatish" : '🌙 Boshlash'}
          </button>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <div className="card">
          <div style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Haftalik sessiyalar</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={DEMO_ACTIVITY} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--c-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--c-muted)' }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="sessions" name="Sessiyalar" stroke="#22c55e" fill="url(#sessGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Foydalanuvchi faolligi</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={DEMO_ACTIVITY} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--c-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--c-muted)' }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="users" name="Foydalanuvchilar" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
