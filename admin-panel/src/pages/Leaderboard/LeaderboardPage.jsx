import { useState, useEffect } from 'react';
import { Trophy, RefreshCw, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import apiService from '../../services/api.service';
import { pageTitle, pageSubtitle } from '../../components/ui/shared.jsx';

const CATEGORIES = [
  { value: 'territories', label: '🏴 Hududlar',     unit: 'ta',  color: '#3b82f6' },
  { value: 'distance',    label: '🏃 Masofa',        unit: 'km',  color: '#22c55e' },
  { value: 'explored',    label: '🗺️ Kashf etilgan', unit: 'ta',  color: '#f59e0b' },
  { value: 'xp',          label: '⭐ XP',             unit: '',    color: '#a855f7' },
];

function RankBadge({ rank }) {
  if (rank === 1) return <span style={{ fontSize: 20 }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize: 20 }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: 20 }}>🥉</span>;
  return <span style={{ color: 'var(--c-muted)', fontSize: 13, fontFamily: 'monospace', width: 24, textAlign: 'center', display: 'inline-block' }}>{rank}</span>;
}

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--c-panel)', border: '1px solid var(--c-border2)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: 'var(--c-text2)', margin: '0 0 4px' }}>{label}</p>
      <p style={{ color: 'var(--c-text)', fontWeight: 700, margin: 0 }}>{payload[0].value?.toLocaleString()} {unit}</p>
    </div>
  );
}

export default function LeaderboardPage() {
  const [category, setCategory] = useState('territories');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const active = CATEGORIES.find((c) => c.value === category);

  const fetchLeaderboard = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await apiService.get('/admin/leaderboard', { params: { category, limit: 20 } });
      setData(res.data.data.rankings || []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchLeaderboard(); }, [category]);

  const chartData = data.slice(0, 10).map((item) => ({
    name: item.username?.slice(0, 8) || '—',
    value: category === 'distance' ? Math.round((item.value || 0) / 1000) : (item.value || 0),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={pageTitle}>Reyting (Leaderboard)</h1>
          <p style={pageSubtitle}>Global reyting va kategoriyalar bo'yicha statistika</p>
        </div>
        <button onClick={() => fetchLeaderboard(true)} disabled={refreshing} className="btn-secondary">
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }} />
          Yangilash
        </button>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            style={{
              padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', border: '1px solid',
              background: category === cat.value ? cat.color : 'var(--c-panel)',
              color: category === cat.value ? '#fff' : 'var(--c-text2)',
              borderColor: category === cat.value ? cat.color : 'var(--c-border2)',
              transition: 'all 0.15s',
              boxShadow: category === cat.value ? `0 0 12px ${cat.color}44` : 'none',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      {!loading && chartData.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <BarChart2 size={16} style={{ color: active?.color }} />
            <span style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: 14 }}>Top 10 — {active?.label}</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--c-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--c-muted)' }} />
              <Tooltip content={<ChartTooltip unit={active?.unit} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="value" fill={active?.color} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={15} style={{ color: 'var(--c-yellow)' }} />
            <span style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: 14 }}>{active?.label} reytingi</span>
          </div>
          <span style={{ color: 'var(--c-muted)', fontSize: 12 }}>Top 20</span>
        </div>

        {loading ? (
          <div style={{ padding: 20 }}>
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse" style={{ height: 48, borderRadius: 8, marginBottom: 8 }} />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--c-muted)' }}>
            <Trophy size={30} style={{ display: 'block', margin: '0 auto 10px' }} />
            Ma'lumot mavjud emas
          </div>
        ) : (
          <div>
            {data.map((item, idx) => (
              <div
                key={item.userId || idx}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--c-border)',
                  background: idx < 3 ? `${active?.color}08` : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={(e) => e.currentTarget.style.background = idx < 3 ? `${active?.color}08` : 'transparent'}
              >
                <div style={{ width: 28, display: 'flex', justifyContent: 'center' }}>
                  <RankBadge rank={idx + 1} />
                </div>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${active?.color}88, ${active?.color}44)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
                }}>
                  {item.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.username || '—'}
                  </div>
                  <div style={{ color: 'var(--c-muted)', fontSize: 11, textTransform: 'capitalize' }}>
                    {item.region || "Noma'lum viloyat"}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: active?.color, fontWeight: 700, fontSize: 15 }}>
                    {category === 'distance'
                      ? `${((item.value || 0) / 1000).toFixed(1)} km`
                      : `${(item.value || 0).toLocaleString()} ${active?.unit}`}
                  </div>
                  {item.change !== undefined && (
                    <div style={{ fontSize: 11, color: item.change > 0 ? 'var(--c-green)' : item.change < 0 ? 'var(--c-red)' : 'var(--c-muted)' }}>
                      {item.change > 0 ? `↑${item.change}` : item.change < 0 ? `↓${Math.abs(item.change)}` : '—'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
