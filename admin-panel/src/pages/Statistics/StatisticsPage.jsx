import { useState, useEffect } from 'react';
import { TrendingUp, Users, Activity, MapPin, Calendar, RefreshCw } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import apiService from '../../services/api.service';

// Ranglar
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// Vaqt oralig'i
const RANGES = [
  { value: '7d', label: '7 kun' },
  { value: '30d', label: '30 kun' },
  { value: '90d', label: '3 oy' },
];

// Custom tooltip
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-bold text-white">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// Stat karta
function StatCard({ icon: Icon, label, value, change, color }) {
  const isPositive = change >= 0;
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg bg-opacity-20`} style={{ backgroundColor: color + '33' }}>
          <Icon size={18} style={{ color }} />
        </div>
        {change !== undefined && (
          <span className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-0.5">{value?.toLocaleString() || 0}</div>
      <div className="text-xs text-gray-500">{label}</div>
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
      // Fallback - demo ma'lumotlar
      setData(generateDemoData(range));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [range]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Statistika</h1>
          <p className="text-gray-400 text-sm mt-1">Foydalanuvchi faolligi va o'sish ko'rsatkichlari</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Vaqt oralig'i */}
          <div className="flex gap-1 bg-dark-700 border border-dark-600 rounded-lg p-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  range === r.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={fetchStats} className="flex items-center gap-2 btn-secondary text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Yangilash
          </button>
        </div>
      </div>

      {/* Summary kartalar */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Yangi foydalanuvchilar" value={data.summary.newUsers} change={data.summary.newUsersChange} color="#3B82F6" />
          <StatCard icon={Activity} label="Sessiyalar" value={data.summary.sessions} change={data.summary.sessionsChange} color="#10B981" />
          <StatCard icon={MapPin} label="Egallangan hududlar" value={data.summary.captures} change={data.summary.capturesChange} color="#F59E0B" />
          <StatCard icon={TrendingUp} label="Jami masofa (km)" value={Math.round((data.summary.totalDistance || 0) / 1000)} change={data.summary.distanceChange} color="#8B5CF6" />
        </div>
      )}

      {/* Foydalanuvchi o'sishi */}
      {data?.userGrowth && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={16} className="text-blue-400" />
            Foydalanuvchilar o'sishi
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.userGrowth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" name="Jami" stroke="#3B82F6" fill="url(#userGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="new" name="Yangi" stroke="#10B981" fill="none" strokeWidth={2} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Kunlik faollik */}
      {data?.dailyActivity && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={16} className="text-green-400" />
            Kunlik faollik
          </h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={data.dailyActivity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="sessions" name="Sessiyalar" fill="#10B981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="captures" name="Hududlar" fill="#F59E0B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Ikki ustun: Viloyat & Top foydalanuvchilar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Viloyat bo'yicha taqsimot */}
        {data?.regionDistribution && (
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Viloyat bo'yicha foydalanuvchilar</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={data.regionDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {data.regionDistribution.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {data.regionDistribution.slice(0, 6).map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-xs text-gray-400 capitalize">{item.name}</span>
                    </div>
                    <span className="text-xs text-white font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top faol foydalanuvchilar */}
        {data?.topUsers && (
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Top faol foydalanuvchilar</h3>
            <div className="space-y-3">
              {data.topUsers.slice(0, 6).map((user, idx) => (
                <div key={user.id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-5 text-center">{idx + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {user.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">{user.username}</div>
                    <div className="text-xs text-gray-500">{user.sessions} ta sessiya</div>
                  </div>
                  <div className="text-xs text-blue-400 font-medium">{user.territories} ta hudud</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Demo ma'lumot generatori (API ishlamasa)
function generateDemoData(range) {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const userGrowth = [];
  const dailyActivity = [];
  let total = 120;

  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = `${d.getMonth() + 1}/${d.getDate()}`;
    const newUsers = Math.floor(Math.random() * 15) + 2;
    total += newUsers;
    userGrowth.push({ date, total, new: newUsers });
    dailyActivity.push({
      date,
      sessions: Math.floor(Math.random() * 80) + 20,
      captures: Math.floor(Math.random() * 50) + 10,
    });
  }

  return {
    summary: {
      newUsers: 87, newUsersChange: 12,
      sessions: 1240, sessionsChange: 8,
      captures: 3560, capturesChange: 15,
      totalDistance: 4820000, distanceChange: 20,
    },
    userGrowth,
    dailyActivity,
    regionDistribution: [
      { name: 'tashkent', value: 145 },
      { name: 'samarkand', value: 78 },
      { name: 'fergana', value: 65 },
      { name: 'andijan', value: 54 },
      { name: 'bukhara', value: 38 },
      { name: 'namangan', value: 32 },
    ],
    topUsers: Array.from({ length: 6 }, (_, i) => ({
      id: i,
      username: ['ali_runner', 'bekzod99', 'sarvar_fit', 'jasur2024', 'dilnoza_u', 'timur_geo'][i],
      sessions: [142, 118, 96, 84, 71, 65][i],
      territories: [320, 280, 215, 190, 155, 140][i],
    })),
  };
}
