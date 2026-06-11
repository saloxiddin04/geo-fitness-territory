import { useState, useEffect } from 'react';
import { Bell, Send } from 'lucide-react';
import apiService from '../../services/api.service';
import { Toast, SkeletonTable, TABLE_HEADER_STYLE, TD, pageTitle, pageSubtitle, searchInput, selectInput } from '../../components/ui/shared.jsx';

const TYPE_ICONS = { attack: '⚔️', capture: '🏴', night_event: '🌙', explore: '🗺️', weekly_stats: '📊', leaderboard: '🏆', broadcast: '📢', system: '⚙️' };
const REGIONS = ['', 'tashkent', 'samarkand', 'bukhara', 'andijan', 'fergana', 'namangan', 'kashkadarya', 'surkhandarya'];
const REGION_LABELS = { '': 'Barcha foydalanuvchilar', tashkent: 'Toshkent', samarkand: 'Samarqand', bukhara: 'Buxoro', andijan: 'Andijon', fergana: "Farg'ona", namangan: 'Namangan', kashkadarya: 'Qashqadaryo', surkhandarya: 'Surxondaryo' };

function BroadcastForm({ onSuccess }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('broadcast');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) { setError('Sarlavha va matn majburiy'); return; }
    setError(''); setLoading(true);
    try {
      const payload = { title: title.trim(), body: body.trim(), type };
      if (region) payload.region = region;
      await apiService.post('/admin/notifications/broadcast', payload);
      setTitle(''); setBody(''); setRegion('');
      onSuccess('Notification muvaffaqiyatli yuborildi!');
    } catch (err) {
      setError(err.response?.data?.message || 'Yuborishda xatolik');
    } finally { setLoading(false); }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Send size={16} style={{ color: 'var(--c-blue)' }} />
        <span style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: 15 }}>Broadcast Notification</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Sarlavha *</label>
          <input style={searchInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification sarlavhasi..." maxLength={100} />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Matn *</label>
          <textarea
            style={{ ...searchInput, resize: 'none', fontFamily: 'inherit' }}
            rows={3} value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Notification matni..." maxLength={500}
          />
          <div style={{ color: 'var(--c-muted)', fontSize: 11, textAlign: 'right', marginTop: 4 }}>{body.length}/500</div>
        </div>
        <div>
          <label style={labelStyle}>Tur</label>
          <select style={selectInput} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="broadcast">📢 Broadcast</option>
            <option value="night_event">🌙 Night Event</option>
            <option value="system">⚙️ System</option>
            <option value="weekly_stats">📊 Haftalik statistika</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Viloyat (ixtiyoriy)</label>
          <select style={selectInput} value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => <option key={r} value={r}>{REGION_LABELS[r]}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--c-red-dim)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', color: 'var(--c-red)', fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--c-muted)', fontSize: 12 }}>
          {region ? `"${REGION_LABELS[region]}"` : 'Barcha foydalanuvchilarga'} yuboriladi
        </span>
        <button onClick={handleSubmit} disabled={loading || !title.trim() || !body.trim()} className="btn-primary">
          <Send size={13} />
          {loading ? 'Yuborilmoqda...' : 'Yuborish'}
        </button>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', color: 'var(--c-text2)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 };

export default function NotificationsPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);

  const limit = 15;
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/admin/notifications', { params: { page, limit } });
      setHistory(res.data.data.notifications || []);
      setTotal(res.data.data.total || 0);
    } catch {} finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await apiService.get('/admin/notifications/stats');
      setStats(res.data.data);
    } catch {}
  };

  useEffect(() => { fetchHistory(); }, [page]);
  useEffect(() => { fetchStats(); }, []);

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={pageTitle}>Bildirishnomalar</h1>
        <p style={pageSubtitle}>Broadcast yuborish va notification tarixi</p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'Bugun yuborilgan', value: stats.sentToday || 0, icon: '📤', color: 'var(--c-blue)' },
            { label: 'Jami yuborilgan', value: stats.totalSent?.toLocaleString() || 0, icon: '✅', color: 'var(--c-green)' },
            { label: 'Muvaffaqiyatsiz', value: stats.failed || 0, icon: '❌', color: 'var(--c-red)' },
            { label: 'Broadcast', value: stats.broadcasts || 0, icon: '📢', color: 'var(--c-yellow)' },
          ].map((s) => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ color: 'var(--c-text2)', fontSize: 12, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <BroadcastForm onSuccess={(msg) => { showToast(msg); fetchHistory(); fetchStats(); }} />

      {/* History table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)' }}>
          <Bell size={15} style={{ color: 'var(--c-blue)', display: 'inline', marginRight: 8 }} />
          <span style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: 14 }}>Notification tarixi</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Tur', 'Sarlavha', 'Qabul qiluvchi', 'Holat', 'Vaqt'].map((h) => (
                  <th key={h} style={TABLE_HEADER_STYLE}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonTable rows={6} cols={5} /> : history.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '50px 0', color: 'var(--c-muted)' }}>
                    <Bell size={28} style={{ display: 'block', margin: '0 auto 10px' }} />
                    Notification tarixi yo'q
                  </td>
                </tr>
              ) : history.map((n) => (
                <tr key={n.id}
                  style={{ borderBottom: '1px solid var(--c-border)', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={TD}>
                    <span style={{ fontSize: 16 }}>{TYPE_ICONS[n.type] || '🔔'}</span>
                    <span style={{ color: 'var(--c-muted)', fontSize: 11, marginLeft: 6, textTransform: 'capitalize' }}>{n.type}</span>
                  </td>
                  <td style={TD}>
                    <div style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                    <div style={{ color: 'var(--c-muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{n.body}</div>
                  </td>
                  <td style={TD}>{n.recipientUsername || (n.isBroadcast ? '📢 Broadcast' : '—')}</td>
                  <td style={TD}>
                    <span className={n.status === 'sent' ? 'badge badge-success' : n.status === 'failed' ? 'badge badge-danger' : 'badge badge-warning'}>
                      {n.status === 'sent' ? 'Yuborildi' : n.status === 'failed' ? 'Xatolik' : 'Kutmoqda'}
                    </span>
                  </td>
                  <td style={{ ...TD, color: 'var(--c-muted)', fontSize: 12 }}>
                    {n.createdAt ? new Date(n.createdAt).toLocaleString('uz-UZ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--c-muted)', fontSize: 13 }}>Jami: <b style={{ color: 'var(--c-text)' }}>{total}</b></span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--c-border2)', background: 'var(--c-panel)', color: 'var(--c-text2)', cursor: 'pointer', fontSize: 13 }}>← Oldingi</button>
            <span style={{ padding: '7px 14px', fontSize: 13, color: 'var(--c-muted)' }}>{page}/{totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--c-border2)', background: 'var(--c-panel)', color: 'var(--c-text2)', cursor: 'pointer', fontSize: 13 }}>Keyingi →</button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} type="success" />}
    </div>
  );
}
