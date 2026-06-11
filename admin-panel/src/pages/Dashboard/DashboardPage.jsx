import { useEffect, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Users, MapPin, Activity, Moon, Sun, Wifi, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../../services/api.service';
import { adminSocket } from '../../services/socket.service';

// Custom recharts tooltip
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// Stat karta
function StatCard({ icon: Icon, label, value, sub, color, loading }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-lg" style={{ background: color + '22' }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 bg-dark-700 rounded animate-pulse mb-1" />
      ) : (
        <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
      )}
      <div className="text-xs text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}

// Demo grafik (haqiqiy ma'lumot bo'lmasa)
const DEMO_ACTIVITY = [
  { name: 'Dush', sessions: 45, users: 32 },
  { name: 'Sesh', sessions: 62, users: 48 },
  { name: 'Chor', sessions: 38, users: 29 },
  { name: 'Pay', sessions: 71, users: 55 },
  { name: 'Jum', sessions: 85, users: 67 },
  { name: 'Shan', sessions: 110, users: 89 },
  { name: 'Yak', sessions: 95, users: 72 },
];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);
  const [nightLoading, setNightLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setStats(res.data.data);
      setOnlineCount(res.data.data.onlineCount ?? res.data.data.onlineUsers ?? 0);
    } catch (e) {
      console.error('Dashboard yuklash xatosi:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    adminSocket.connect();
    adminSocket.on('admin:stats', (data) => {
      if (data.onlineCount !== undefined) setOnlineCount(data.onlineCount);
    });
    return () => adminSocket.off('admin:stats');
  }, []);

  const handleNightToggle = async () => {
    setNightLoading(true);
    try {
      if (stats?.nightEventActive) {
        await api.post('/admin/night-event/stop');
        showToast('Night Event to\'xtatildi');
      } else {
        await api.post('/admin/night-event/start');
        showToast('🌙 Night Event boshlandi!');
      }
      await fetchDashboard();
    } catch (e) {
      showToast(e.response?.data?.message || 'Xatolik yuz berdi', 'error');
    } finally {
      setNightLoading(false);
    }
  };

  const isNight = stats?.nightEventActive;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Tizim holati va real-time statistika</p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 btn-secondary"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Yangilash
        </button>
      </div>

      {/* Asosiy statistikalar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={Users}
          label="Jami foydalanuvchilar"
          value={stats?.totalUsers?.toLocaleString() ?? '—'}
          sub={stats?.newUsersToday !== undefined ? `+${stats.newUsersToday} bugun` : ''}
          color="#3B82F6"
          loading={loading}
        />
        <StatCard
          icon={Wifi}
          label="Online hozir"
          value={onlineCount.toString()}
          sub="Faol foydalanuvchilar"
          color="#10B981"
          loading={loading}
        />
        <StatCard
          icon={Activity}
          label="Bugungi sessiyalar"
          value={stats?.todaySessions?.toString() ?? '—'}
          sub="Tugatilgan yugurish"
          color="#F59E0B"
          loading={loading}
        />
        <StatCard
          icon={MapPin}
          label="Egallangan hududlar"
          value={stats?.totalTerritories?.toLocaleString() ?? '—'}
          sub="Hozirgi holat"
          color="#8B5CF6"
          loading={loading}
        />
        <StatCard
          icon={AlertTriangle}
          label="Shubhali sessiyalar"
          value={stats?.suspiciousCount?.toString() ?? '—'}
          sub="Jami"
          color="#EF4444"
          loading={loading}
        />
        <StatCard
          icon={isNight ? Moon : Sun}
          label="Night Event"
          value={isNight ? 'FAOL' : 'NOFAOL'}
          sub={isNight ? 'Hozir aktiv' : 'Har kuni 20:00'}
          color={isNight ? '#D29922' : '#6B7280'}
          loading={loading}
        />
      </div>

      {/* Night Event boshqaruv paneli */}
      <div className={`card border-2 transition-all ${isNight ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-dark-600'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isNight ? 'bg-yellow-500/20' : 'bg-dark-700'}`}>
              {isNight
                ? <Moon size={22} className="text-yellow-400" />
                : <Sun size={22} className="text-gray-400" />}
            </div>
            <div>
              <div className="font-semibold text-white">
                {isNight ? '🌙 Night Event Faol' : '☀️ Oddiy Rejim'}
              </div>
              <div className="text-sm text-gray-400">
                {isNight
                  ? 'Barcha XP balllar multiplikatsiya bilan berilmoqda'
                  : 'Night Event nofaol — har kuni 20:00–23:00 avtomatik'}
              </div>
            </div>
          </div>
          <button
            onClick={handleNightToggle}
            disabled={nightLoading || loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              isNight
                ? 'bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400'
                : 'bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-400'
            }`}
          >
            {nightLoading ? 'Jarayonda...' : isNight ? 'To\'xtatish' : '🌙 Boshlash'}
          </button>
        </div>
      </div>

      {/* Grafiklar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Haftalik sessiyalar</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={DEMO_ACTIVITY} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="sessions" name="Sessiyalar" stroke="#10B981" fill="url(#sessGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-white mb-4">Foydalanuvchi faolligi</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={DEMO_ACTIVITY} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="users" name="Foydalanuvchilar" stroke="#3B82F6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-medium shadow-xl z-50 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
