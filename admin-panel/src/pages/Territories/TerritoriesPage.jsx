import { useState, useEffect, useCallback } from 'react';
import { MapPin, RotateCcw, Search, Eye, Trash2, AlertTriangle, X } from 'lucide-react';
import apiService from '../../services/api.service';

const REGION_COLORS = {
  tashkent: '#3b82f6', samarkand: '#22c55e', bukhara: '#f59e0b',
  andijan: '#ef4444', fergana: '#a855f7', namangan: '#ec4899',
  default: '#64748b',
};

const REGIONS = [
  { value: '', label: 'Barcha viloyatlar' },
  { value: 'tashkent', label: 'Toshkent' }, { value: 'samarkand', label: 'Samarqand' },
  { value: 'bukhara', label: 'Buxoro' }, { value: 'andijan', label: 'Andijon' },
  { value: 'fergana', label: "Farg'ona" }, { value: 'namangan', label: 'Namangan' },
  { value: 'kashkadarya', label: 'Qashqadaryo' }, { value: 'surkhandarya', label: 'Surxondaryo' },
  { value: 'jizzakh', label: 'Jizzax' }, { value: 'syrdarya', label: 'Sirdaryo' },
  { value: 'navoi', label: 'Navoiy' }, { value: 'khorezm', label: 'Xorazm' },
  { value: 'karakalpakstan', label: "Qoraqalpog'iston" },
];

function TerritoryCard({ territory, onReset, onView }) {
  const color = REGION_COLORS[territory.region] || REGION_COLORS.default;
  return (
    <div className="card" style={{ cursor: 'pointer', padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ color: 'var(--c-muted)', fontSize: 11, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {territory.h3Index}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => onView(territory)} style={iconBtn} title="Ko'rish">
            <Eye size={13} />
          </button>
          <button onClick={() => onReset(territory)} style={{ ...iconBtn, color: 'var(--c-red)' }} title="Reset">
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Owner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <MapPin size={13} style={{ color: 'var(--c-text2)', flexShrink: 0 }} />
        <span style={{ color: territory.ownerUsername ? 'var(--c-text)' : 'var(--c-muted)', fontSize: 13, fontWeight: 600 }}>
          {territory.ownerUsername || 'Egallanmagan'}
        </span>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {[
          { label: 'Viloyat', value: territory.region || '—' },
          { label: 'Himoya', value: `${territory.defenseLevel || 0}/10` },
          { label: 'Hujumlar', value: territory.attackCount || 0, highlight: 'var(--c-yellow)' },
          { label: 'CP', value: territory.controlPoints || 0, highlight: 'var(--c-blue)' },
        ].map((item) => (
          <div key={item.label} style={{ background: 'var(--c-panel)', borderRadius: 6, padding: '6px 8px' }}>
            <div style={{ color: 'var(--c-muted)', fontSize: 10, marginBottom: 2 }}>{item.label}</div>
            <div style={{ color: item.highlight || 'var(--c-text2)', fontSize: 13, fontWeight: 600 }}>{item.value}</div>
          </div>
        ))}
      </div>

      {territory.capturedAt && (
        <div style={{ color: 'var(--c-muted)', fontSize: 11, marginTop: 8 }}>
          {new Date(territory.capturedAt).toLocaleDateString('uz-UZ')} da egallangan
        </div>
      )}
    </div>
  );
}

function Modal({ title, onClose, children, danger }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16,
    }}>
      <div style={{
        background: 'var(--c-surface)',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.3)' : 'var(--c-border)'}`,
        borderRadius: 14, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--c-border)',
        }}>
          <h3 style={{ color: 'var(--c-text)', fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ ...iconBtn, fontSize: 18 }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [viewTerritory, setViewTerritory] = useState(null);
  const [resetTerritory, setResetTerritory] = useState(null);
  const [resetAllLoading, setResetAllLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const limit = 12;
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchTerritories = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (region) params.region = region;
      const res = await apiService.get('/admin/territories', { params });
      setTerritories(res.data.data.territories || []);
      setTotal(res.data.data.total || 0);
    } catch { showToast('Yuklashda xatolik', 'error'); }
    finally { setLoading(false); }
  }, [page, search, region]);

  const fetchStats = async () => {
    try {
      const res = await apiService.get('/admin/territories/stats');
      setStats(res.data.data);
    } catch {}
  };

  useEffect(() => { fetchTerritories(); }, [fetchTerritories]);
  useEffect(() => { fetchStats(); }, []);

  const handleReset = async () => {
    try {
      await apiService.post(`/admin/territories/${resetTerritory.id}/reset`);
      showToast('Hudud reset qilindi');
      setResetTerritory(null);
      fetchTerritories(); fetchStats();
    } catch { showToast('Xatolik yuz berdi', 'error'); }
  };

  const handleResetAll = async () => {
    if (!window.confirm('Barcha hududlarni reset qilmoqchimisiz?')) return;
    setResetAllLoading(true);
    try {
      await apiService.post('/admin/territories/reset-all');
      showToast('Barcha hududlar reset qilindi');
      fetchTerritories(); fetchStats();
    } catch { showToast('Xatolik yuz berdi', 'error'); }
    finally { setResetAllLoading(false); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={pageTitle}>Hududlar boshqaruvi</h1>
          <p style={pageSubtitle}>H3 Grid asosidagi hududlarni kuzatish</p>
        </div>
        <button onClick={handleResetAll} disabled={resetAllLoading} className="btn-danger">
          <Trash2 size={14} />
          {resetAllLoading ? 'Jarayonda...' : 'Barchani reset'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'Jami hududlar', value: stats.total?.toLocaleString() || 0, color: 'var(--c-text)' },
            { label: 'Egallangan', value: stats.captured?.toLocaleString() || 0, color: 'var(--c-blue)' },
            { label: 'Bugun egallangan', value: stats.capturedToday || 0, color: 'var(--c-green)' },
            { label: 'Hujumlar bugun', value: stats.attacksToday || 0, color: 'var(--c-yellow)' },
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
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-muted)' }} />
            <input
              style={{ ...searchInput, paddingLeft: 32 }}
              placeholder="H3 index yoki foydalanuvchi nomi..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            style={selectInput}
            value={region}
            onChange={(e) => { setRegion(e.target.value); setPage(1); }}
          >
            {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="card animate-pulse" style={{ height: 160, padding: 0 }} />
          ))}
        </div>
      ) : territories.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <MapPin size={36} style={{ color: 'var(--c-muted)', margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--c-text2)' }}>Hududlar topilmadi</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {territories.map((t) => (
            <TerritoryCard key={t.id} territory={t} onReset={setResetTerritory} onView={setViewTerritory} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--c-muted)', fontSize: 13 }}>Jami: <b style={{ color: 'var(--c-text)' }}>{total}</b> ta</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn}>← Oldingi</button>
            <span style={{ ...pageBtn, background: 'var(--c-blue)', color: '#fff', border: 'none' }}>{page}/{totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn}>Keyingi →</button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {viewTerritory && (
        <Modal title="Hudud tafsilotlari" onClose={() => setViewTerritory(null)}>
          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'H3 Index', value: viewTerritory.h3Index, mono: true },
              { label: 'Viloyat', value: viewTerritory.region || '—' },
              { label: 'Egasi', value: viewTerritory.ownerUsername || "Yo'q" },
              { label: 'Himoya', value: viewTerritory.defenseLevel || 0 },
              { label: 'CP', value: viewTerritory.controlPoints || 0 },
              { label: 'Hujumlar', value: viewTerritory.attackCount || 0 },
            ].map((item) => (
              <div key={item.label} style={{ background: 'var(--c-panel)', borderRadius: 8, padding: 12 }}>
                <div style={{ color: 'var(--c-muted)', fontSize: 11, marginBottom: 4 }}>{item.label}</div>
                <div style={{ color: 'var(--c-text)', fontSize: 13, fontWeight: 600, fontFamily: item.mono ? 'monospace' : undefined }}>
                  {String(item.value)}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Reset confirm modal */}
      {resetTerritory && (
        <Modal title="Hududni reset qilish" onClose={() => setResetTerritory(null)} danger>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
              <AlertTriangle size={20} style={{ color: 'var(--c-red)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ color: 'var(--c-text)', fontSize: 14, margin: '0 0 6px' }}>
                  <b style={{ fontFamily: 'monospace' }}>{resetTerritory.h3Index}</b> hududini reset qilmoqchimisiz?
                </p>
                <p style={{ color: 'var(--c-red)', fontSize: 12, margin: 0 }}>⚠️ Bu amal qaytarib bo'lmaydi</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setResetTerritory(null)} className="btn-secondary" style={{ flex: 1 }}>Bekor qilish</button>
              <button onClick={handleReset} className="btn-danger" style={{ flex: 1, justifyContent: 'center' }}>Reset qilish</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

// Shared styles
const pageTitle = { color: 'var(--c-text)', fontSize: 22, fontWeight: 700, margin: 0 };
const pageSubtitle = { color: 'var(--c-text2)', fontSize: 13, margin: '4px 0 0' };
const iconBtn = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'var(--c-text2)', padding: '4px 6px', borderRadius: 6, display: 'flex',
  alignItems: 'center', transition: 'background 0.15s, color 0.15s',
};
const searchInput = {
  width: '100%', background: 'var(--c-panel)', border: '1px solid var(--c-border2)',
  borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13,
  outline: 'none', transition: 'border-color 0.15s',
};
const selectInput = {
  background: 'var(--c-panel)', border: '1px solid var(--c-border2)',
  borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none',
};
const pageBtn = {
  padding: '6px 14px', borderRadius: 7, border: '1px solid var(--c-border2)',
  background: 'var(--c-panel)', color: 'var(--c-text2)', cursor: 'pointer',
  fontSize: 13, transition: 'opacity 0.15s',
};

function Toast({ msg, type }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      background: type === 'error' ? 'var(--c-red)' : 'var(--c-green)',
      color: '#fff', padding: '12px 20px', borderRadius: 10,
      fontSize: 13, fontWeight: 600, boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
      zIndex: 100, animation: 'slideUp 0.3s ease',
    }}>
      {msg}
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}
