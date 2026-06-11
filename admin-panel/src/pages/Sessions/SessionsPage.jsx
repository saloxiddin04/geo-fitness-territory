import { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle, Clock, Search, Eye, RefreshCw } from 'lucide-react';
import apiService from '../../services/api.service';
import { Toast, Modal, SkeletonTable, TABLE_HEADER_STYLE, TD, pageTitle, pageSubtitle, searchInput } from '../../components/ui/shared.jsx';

function StatusBadge({ session }) {
  if (session.isSuspicious) return <span className="badge badge-danger">⚠ Shubhali</span>;
  if (session.status === 'active') return <span className="badge badge-warning">Faol</span>;
  if (session.status === 'completed') return <span className="badge badge-success">Tugallangan</span>;
  return <span className="badge" style={{ color: 'var(--c-muted)', background: 'var(--c-panel)' }}>Bekor</span>;
}

function formatDuration(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function SessionModal({ session, onClose }) {
  if (!session) return null;
  const rows = [
    { label: 'Foydalanuvchi', value: session.username || '—' },
    { label: 'Masofa', value: session.distance ? `${(session.distance / 1000).toFixed(2)} km` : '—' },
    { label: 'Davomiylik', value: formatDuration(session.duration) },
    { label: "O'rtacha tezlik", value: session.avgSpeed ? `${session.avgSpeed.toFixed(1)} km/h` : '—' },
    { label: 'Max tezlik', value: session.maxSpeed ? `${session.maxSpeed.toFixed(1)} km/h` : '—' },
    { label: 'Kaloriya', value: session.calories ? `${session.calories} kcal` : '—' },
    { label: 'XP', value: `+${session.xpEarned || 0}` },
    { label: 'Hududlar', value: session.territoriesCaptured || 0 },
    { label: 'Boshlangan', value: session.startTime ? new Date(session.startTime).toLocaleString('uz-UZ') : '—' },
    { label: 'Tugallangan', value: session.endTime ? new Date(session.endTime).toLocaleString('uz-UZ') : '—' },
  ];

  return (
    <Modal title="Sessiya tafsilotlari" onClose={onClose} danger={session.isSuspicious} maxWidth={480}>
      <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ background: 'var(--c-panel)', borderRadius: 8, padding: 12 }}>
            <div style={{ color: 'var(--c-muted)', fontSize: 11, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: 'var(--c-text)', fontSize: 13, fontWeight: 600 }}>{r.value}</div>
          </div>
        ))}
      </div>
      {session.isSuspicious && session.suspiciousReason && (
        <div style={{ margin: '0 20px 20px', background: 'var(--c-red-dim)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: 12 }}>
          <div style={{ color: 'var(--c-red)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>⚠ Shubhali sabab:</div>
          <div style={{ color: 'var(--c-text2)', fontSize: 13 }}>{session.suspiciousReason}</div>
        </div>
      )}
    </Modal>
  );
}

const FILTERS = [
  { value: 'all', label: 'Barchasi' },
  { value: 'suspicious', label: '⚠ Shubhali' },
  { value: 'active', label: 'Faol' },
  { value: 'completed', label: 'Tugallangan' },
];

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);

  const limit = 15;

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (filter !== 'all') params.status = filter;
      const res = await apiService.get('/admin/sessions', { params });
      setSessions(res.data.data.sessions || []);
      setTotal(res.data.data.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, search, filter]);

  const fetchStats = async () => {
    try {
      const res = await apiService.get('/admin/sessions/stats');
      setStats(res.data.data);
    } catch {}
  };

  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  useEffect(() => { fetchStats(); }, []);

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={pageTitle}>Yugurish sessiyalari</h1>
        <p style={pageSubtitle}>Barcha foydalanuvchi sessiyalari va shubhali faoliyatlar</p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'Jami sessiyalar', value: stats.total?.toLocaleString() || 0, color: 'var(--c-text)' },
            { label: 'Bugun', value: stats.today || 0, color: 'var(--c-blue)' },
            { label: 'Hozir faol', value: stats.active || 0, color: 'var(--c-green)' },
            { label: 'Shubhali', value: stats.suspicious || 0, color: 'var(--c-red)' },
          ].map((s) => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ color: 'var(--c-text2)', fontSize: 12, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-muted)' }} />
            <input
              style={{ ...searchInput, paddingLeft: 32 }}
              placeholder="Foydalanuvchi nomi..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setFilter(f.value); setPage(1); }}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', border: '1px solid',
                  background: filter === f.value ? 'var(--c-blue)' : 'var(--c-panel)',
                  color: filter === f.value ? '#fff' : 'var(--c-text2)',
                  borderColor: filter === f.value ? 'var(--c-blue)' : 'var(--c-border2)',
                  transition: 'all 0.15s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Foydalanuvchi', 'Masofa', 'Davomiylik', 'Tezlik', 'XP', 'Holat', 'Sana', ''].map((h) => (
                  <th key={h} style={TABLE_HEADER_STYLE}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={8} cols={8} />
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '50px 0', color: 'var(--c-muted)' }}>
                    <Activity size={30} style={{ display: 'block', margin: '0 auto 10px' }} />
                    Sessiyalar topilmadi
                  </td>
                </tr>
              ) : sessions.map((s) => (
                <tr key={s.id} style={{
                  borderBottom: '1px solid var(--c-border)',
                  background: s.isSuspicious ? 'rgba(239,68,68,0.04)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = s.isSuspicious ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)'}
                onMouseLeave={(e) => e.currentTarget.style.background = s.isSuspicious ? 'rgba(239,68,68,0.04)' : 'transparent'}
                >
                  <td style={TD}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {s.isSuspicious && <AlertTriangle size={12} style={{ color: 'var(--c-red)' }} />}
                      <span style={{ color: 'var(--c-text)', fontWeight: 600 }}>{s.username || '—'}</span>
                    </div>
                  </td>
                  <td style={TD}>{s.distance ? `${(s.distance / 1000).toFixed(2)} km` : '—'}</td>
                  <td style={TD}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={11} style={{ color: 'var(--c-muted)' }} />
                      {formatDuration(s.duration)}
                    </div>
                  </td>
                  <td style={TD}>{s.avgSpeed ? `${s.avgSpeed.toFixed(1)} km/h` : '—'}</td>
                  <td style={TD}><span style={{ color: 'var(--c-yellow)', fontWeight: 600 }}>+{s.xpEarned || 0}</span></td>
                  <td style={TD}><StatusBadge session={s} /></td>
                  <td style={{ ...TD, color: 'var(--c-muted)', fontSize: 12 }}>
                    {s.startTime ? new Date(s.startTime).toLocaleDateString('uz-UZ') : '—'}
                  </td>
                  <td style={TD}>
                    <button
                      onClick={() => setSelected(s)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text2)', padding: 4 }}
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--c-muted)', fontSize: 13 }}>Jami: <b style={{ color: 'var(--c-text)' }}>{total}</b> ta</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--c-border2)', background: 'var(--c-panel)', color: 'var(--c-text2)', cursor: 'pointer', fontSize: 13 }}>← Oldingi</button>
            <span style={{ padding: '7px 14px', fontSize: 13, color: 'var(--c-muted)' }}>{page}/{totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--c-border2)', background: 'var(--c-panel)', color: 'var(--c-text2)', cursor: 'pointer', fontSize: 13 }}>Keyingi →</button>
          </div>
        </div>
      )}

      <SessionModal session={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
