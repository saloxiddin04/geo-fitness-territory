// Admin Dashboard sahifasi
import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Users, MapPin, Activity, Moon, Wifi, TrendingUp } from 'lucide-react';
import api from '../../services/api.service';
import { adminSocket } from '../../services/socket.service';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    fetchDashboard();
    adminSocket.connect();

    // Real-time online foydalanuvchilar
    adminSocket.on('admin:stats', data => {
      if (data.onlineCount !== undefined) setOnlineCount(data.onlineCount);
    });

    return () => adminSocket.off('admin:stats');
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setStats(res.data.data);
      setOnlineCount(res.data.data.onlineCount || 0);
    } catch (e) {
      console.error('Dashboard yuklash xatosi:', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Demo grafik ma'lumotlari (haqiqiyda backenddan keladi)
  const activityData = [
    { name: 'Dush', sessions: 45, users: 32 },
    { name: 'Sesh', sessions: 62, users: 48 },
    { name: 'Chor', sessions: 38, users: 29 },
    { name: 'Pay', sessions: 71, users: 55 },
    { name: 'Jum', sessions: 85, users: 67 },
    { name: 'Shan', sessions: 110, users: 89 },
    { name: 'Yak', sessions: 95, users: 72 },
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div style={{ color: 'var(--text-secondary)' }}>Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 'bold', margin: '0 0 4px' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
          Tizim holati va statistika
        </p>
      </div>

      {/* Asosiy statistikalar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard
          icon={<Users size={20} />}
          title="Jami foydalanuvchilar"
          value={stats?.totalUsers?.toLocaleString() || '0'}
          subtitle={`+${stats?.newUsersToday || 0} bugun`}
          color="#58A6FF"
        />
        <StatCard
          icon={<Wifi size={20} />}
          title="Online"
          value={onlineCount.toString()}
          subtitle="Hozir aktiv"
          color="#3FB950"
        />
        <StatCard
          icon={<Activity size={20} />}
          title="Bugungi yugurish"
          value={stats?.todaySessions?.toString() || '0'}
          subtitle="Sessiyalar"
          color="#F78166"
        />
        <StatCard
          icon={<MapPin size={20} />}
          title="Jami hududlar"
          value={stats?.totalTerritories?.toLocaleString() || '0'}
          subtitle="Egallangan"
          color="#BC8CFF"
        />
        <StatCard
          icon={<Moon size={20} />}
          title="Night Event"
          value={stats?.nightEventActive ? 'FAOL' : 'NOFAOL'}
          subtitle={stats?.nightEventActive ? '20:00 - 23:00' : 'Bugun 20:00 da'}
          color={stats?.nightEventActive ? '#D29922' : '#484F58'}
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          title="Umumiy masofa"
          value={`${((stats?.totalDistanceKm || 0)).toFixed(0)} km`}
          subtitle="Barcha vaqt"
          color="#FF9800"
        />
      </div>

      {/* Grafiklar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Haftalik aktivlik */}
        <div className="card">
          <h3 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>
            Haftalik aktivlik
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={11} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 6 }}
              />
              <Area type="monotone" dataKey="sessions" stroke="#3FB950" fill="rgba(63, 185, 80, 0.15)" strokeWidth={2} name="Sessiyalar" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Foydalanuvchi faolligi */}
        <div className="card">
          <h3 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>
            Foydalanuvchi faolligi
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={11} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 6 }}
              />
              <Line type="monotone" dataKey="users" stroke="#58A6FF" strokeWidth={2} dot={false} name="Foydalanuvchilar" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Night Event boshqaruv */}
      <NightEventControl stats={stats} onRefresh={fetchDashboard} />
    </div>
  );
};

// Stat kartochkasi
const StatCard = ({ icon, title, value, subtitle, color }) => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ color }}>{icon}</div>
      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{title}</span>
    </div>
    <div>
      <div style={{ color: 'var(--text-primary)', fontSize: 26, fontWeight: 'bold' }}>{value}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{subtitle}</div>
    </div>
  </div>
);

// Night Event boshqaruvi
const NightEventControl = ({ stats, onRefresh }) => {
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      if (stats?.nightEventActive) {
        await api.post('/admin/night-event/end');
      } else {
        await api.post('/admin/night-event/start');
      }
      onRefresh();
    } catch (e) {
      alert('Xato: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <Moon size={24} color={stats?.nightEventActive ? '#D29922' : '#484F58'} />
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Night Event</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          {stats?.nightEventActive ? 'Hozir faol - barcha balllar 1.5x' : 'Nofaol - har kuni 20:00-23:00'}
        </div>
      </div>
      <button
        className={`btn-primary ${stats?.nightEventActive ? 'btn-danger' : ''}`}
        onClick={toggle}
        disabled={loading}
      >
        {loading ? '...' : stats?.nightEventActive ? 'To\'xtatish' : 'Boshlash'}
      </button>
    </div>
  );
};

export default DashboardPage;
