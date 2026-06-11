import { useState, useEffect } from 'react';
import { TrendingUp, Users, Activity, MapPin, RefreshCw } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import apiService from '../../services/api.service';
import { pageTitle, pageSubtitle } from '../../components/ui/shared.jsx';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];
const RANGES = [
  { value: '7d', label: '7 kun' },
  { value: '30d', label: '30 kun' },
  { value: '90d', label: '3 oy' },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--c-panel)', border: '1px solid var(--c-border2)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: 'var(--c-text2)', marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--c-text2)' }}>{p.name}:</span>
          <span style={{ color: 'var(--c-text)', fontWeight: 700 }}>{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, change, color }) {
  const isPos = change >= 0;
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ padding: 10, borderRadius: 10, background: color + '22', display: 'flex' }}>
          <Icon size={18} style={{ color }} />
        </div>
        {change !== undefined && (
          <span style={{ fontSize: 12, fontWeight: 600, color: isPos ? 'var(--c-green)' : 'var(--c-red)' }}>
            {isPos ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--c-text)', lineHeight: 1 }}>{value?.toLocaleString() || 0}</div>
      <div style={{ color: 'var(--c-muted)', fontSize: 12, marginTop: 5 }}>{label}</div>
    </div>
  );
}

export default function StatisticsPage() {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/admin/statistics', { params: { range } });
      setData(res.data.data);
    } catch {
      setData(generateDemoData(range));
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, [range]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={pageTitle}>Statistika</h1>
          <p style={pageSubtitle}>Foydalanuvchi faolligi va o'sish ko'rsatkichlari</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--c-panel)', border: '1px solid var(--c-border2)', borderRadius: 9, padding: 4 }}>
            {RANGES.map((r) => (
              <button
                key={r.value} onClick={() => setRange(r.value)}
                style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', border: 'none',
                  background: range === r.value ? 'var(--c-blue)' : 'transparent',
                  color: range === r.value ? '#fff' : 'var(--c-text2)',
                  transition: 'all 0.15s',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={fetchStats} className="btn-secondary">
            <RefreshCw size={14} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            Yangilash
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {data?.summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
          <StatCard icon={Users} label="Yangi foydalanuvchilar" value={data.summary.newUsers} change={data.summary.newUsersChange} color="#3b82f6" />
          <StatCard icon={Activity} label="Sessiyalar" value={data.summary.sessions} change={data.summary.sessionsChange} color="#22c55e" />
          <StatCard icon={MapPin} label="Egallangan hududlar" value={data.summary.captures} change={data.summary.capturesChange} color="#f59e0b" />
          <StatCard icon={TrendingUp} label="Jami masofa (km)" value={Math.round((data.summary.totalDistance || 0) / 1000)} change={data.summary.distanceChange} color="#a855f7" />
        </div>
      )}

      {/* User growth */}
      {data?.userGrowth && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Users size={16} style={{ color: 'var(--c-blue)' }} />
            <span style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: 14 }}>Foydalanuvchilar o'sishi</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.userGrowth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--c-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--c-muted)' }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="total" name="Jami" stroke="#3b82f6" fill="url(#userGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="new" name="Yangi" stroke="#22c55e" fill="none" strokeWidth={2} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Daily activity */}
      {data?.dailyActivity && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Activity size={16} style={{ color: 'var(--c-green)' }} />
            <span style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: 14 }}>Kunlik faollik</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.dailyActivity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--c-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--c-muted)' }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="sessions" name="Sessiyalar" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="captures" name="Hududlar" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Two-column: regions + top users */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {data?.regionDistribution && (
          <div className="card">
            <div style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Viloyat bo'yicha foydalanuvchilar</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ResponsiveContainer width="50%" height={150}>
                <PieChart>
                  <Pie data={data.regionDistribution} cx="50%" cy="50%" innerRadius={36} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {data.regionDistribution.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.regionDistribution.slice(0, 6).map((item, idx) => (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: COLORS[idx % COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--c-text2)', textTransform: 'capitalize' }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--c-text)', fontWeight: 600 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {data?.topUsers && (
          <div className="card">
            <div style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Top faol foydalanuvchilar</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.topUsers.slice(0, 6).map((user, idx) => (
                <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--c-muted)', width: 18, textAlign: 'center' }}>{idx + 1}</span>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {user.username?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--c-text)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</div>
                    <div style={{ color: 'var(--c-muted)', fontSize: 11 }}>{user.sessions} ta sessiya</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--c-blue)', fontWeight: 600 }}>{user.territories} ta</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function generateDemoData(range) {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const userGrowth = [];
  const dailyActivity = [];
  let total = 120;
  for (let i = days; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const date = `${d.getMonth() + 1}/${d.getDate()}`;
    const newU = Math.floor(Math.random() * 12) + 2;
    total += newU;
    userGrowth.push({ date, total, new: newU });
    dailyActivity.push({ date, sessions: Math.floor(Math.random() * 70) + 20, captures: Math.floor(Math.random() * 40) + 10 });
  }
  return {
    summary: { newUsers: 87, newUsersChange: 12, sessions: 1240, sessionsChange: 8, captures: 3560, capturesChange: 15, totalDistance: 4820000, distanceChange: 20 },
    userGrowth, dailyActivity,
    regionDistribution: [
      { name: 'tashkent', value: 145 }, { name: 'samarkand', value: 78 },
      { name: 'fergana', value: 65 }, { name: 'andijan', value: 54 },
      { name: 'bukhara', value: 38 }, { name: 'namangan', value: 32 },
    ],
    topUsers: Array.from({ length: 6 }, (_, i) => ({
      id: i,
      username: ['ali_runner', 'bekzod99', 'sarvar_fit', 'jasur2024', 'dilnoza_u', 'timur_geo'][i],
      sessions: [142, 118, 96, 84, 71, 65][i],
      territories: [320, 280, 215, 190, 155, 140][i],
    })),
  };
}
