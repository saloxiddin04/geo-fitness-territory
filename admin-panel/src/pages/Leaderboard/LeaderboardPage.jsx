import { useState, useEffect } from 'react';
import { Trophy, Medal, RefreshCw, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import apiService from '../../services/api.service';

// Kategoriyalar
const CATEGORIES = [
  { value: 'territories', label: '🏴 Hududlar', unit: 'ta', color: '#3B82F6' },
  { value: 'distance', label: '🏃 Masofa', unit: 'km', color: '#10B981' },
  { value: 'explored', label: '🗺️ Kashf etilgan', unit: 'ta', color: '#F59E0B' },
  { value: 'xp', label: '⭐ XP', unit: '', color: '#8B5CF6' },
];

// Medal ranglari
function RankMedal({ rank }) {
  if (rank === 1) return <span className="text-yellow-400 font-bold text-lg">🥇</span>;
  if (rank === 2) return <span className="text-gray-300 font-bold text-lg">🥈</span>;
  if (rank === 3) return <span className="text-orange-400 font-bold text-lg">🥉</span>;
  return <span className="text-gray-500 text-sm font-mono w-6 text-center">{rank}</span>;
}

// Custom tooltip uchun recharts
function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-300 mb-1">{label}</p>
      <p className="text-white font-bold">{payload[0].value?.toLocaleString()} {unit}</p>
    </div>
  );
}

export default function LeaderboardPage() {
  const [category, setCategory] = useState('territories');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const activeCategory = CATEGORIES.find((c) => c.value === category);

  // Leaderboard ma'lumotlarini yuklash
  const fetchLeaderboard = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await apiService.get('/admin/leaderboard', { params: { category, limit: 20 } });
      setData(res.data.data.rankings || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [category]);

  // Chart uchun ma'lumot tayyorlash (top 10)
  const chartData = data.slice(0, 10).map((item) => ({
    name: item.username?.slice(0, 10) || '—',
    value: category === 'distance'
      ? Math.round((item.value || 0) / 1000)
      : (item.value || 0),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reyting (Leaderboard)</h1>
          <p className="text-gray-400 text-sm mt-1">Global reyting va kategoriyalar bo'yicha statistika</p>
        </div>
        <button
          onClick={() => fetchLeaderboard(true)}
          disabled={refreshing}
          className="flex items-center gap-2 btn-secondary"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Yangilash
        </button>
      </div>

      {/* Kategoriya tablar */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              category === cat.value
                ? 'bg-blue-600 text-white'
                : 'bg-dark-700 border border-dark-600 text-gray-400 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {!loading && chartData.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={18} className="text-blue-400" />
            <h3 className="font-semibold text-white">Top 10 — {activeCategory?.label}</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip
                content={<CustomTooltip unit={activeCategory?.unit} />}
                cursor={{ fill: 'rgba(59,130,246,0.08)' }}
              />
              <Bar dataKey="value" fill={activeCategory?.color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Jadval */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 border-b border-dark-600 flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Trophy size={16} className="text-yellow-400" />
            {activeCategory?.label} reytingi
          </h3>
          <span className="text-xs text-gray-500">Top 20</span>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="h-12 bg-dark-700 rounded animate-pulse" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Trophy size={32} className="mx-auto mb-2 text-gray-600" />
            Ma'lumot mavjud emas
          </div>
        ) : (
          <div className="divide-y divide-dark-700">
            {data.map((item, idx) => (
              <div
                key={item.userId || idx}
                className={`flex items-center gap-4 px-5 py-3 hover:bg-dark-700/50 transition-colors ${
                  idx < 3 ? 'bg-dark-700/20' : ''
                }`}
              >
                <div className="w-8 flex justify-center">
                  <RankMedal rank={idx + 1} />
                </div>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {item.username?.[0]?.toUpperCase() || '?'}
                </div>

                {/* Ism */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{item.username || '—'}</div>
                  <div className="text-xs text-gray-500 capitalize">{item.region || 'Noma\'lum viloyat'}</div>
                </div>

                {/* Qiymat */}
                <div className="text-right">
                  <div className="text-sm font-bold" style={{ color: activeCategory?.color }}>
                    {category === 'distance'
                      ? `${((item.value || 0) / 1000).toFixed(1)} km`
                      : `${(item.value || 0).toLocaleString()} ${activeCategory?.unit}`}
                  </div>
                  {item.change !== undefined && (
                    <div className={`text-xs ${item.change > 0 ? 'text-green-400' : item.change < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {item.change > 0 ? `↑${item.change}` : item.change < 0 ? `↓${Math.abs(item.change)}` : '—'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
