import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Search, RefreshCw, Download, ChevronDown } from 'lucide-react';
import apiService from '../../services/api.service';
import { pageTitle, pageSubtitle, searchInput } from '../../components/ui/shared.jsx';

const LEVEL_STYLES = {
  error: { label: 'ERROR', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  warn:  { label: 'WARN',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  info:  { label: 'INFO',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  debug: { label: 'DEBUG', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  http:  { label: 'HTTP',  color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
};
const CATEGORY_COLORS = {
  auth: '#22c55e', territory: '#3b82f6', session: '#f59e0b',
  notification: '#a855f7', scheduler: '#06b6d4', admin: '#ef4444', system: '#6b7280',
};

function LevelBadge({ level }) {
  const s = LEVEL_STYLES[level?.toLowerCase()] || LEVEL_STYLES.info;
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}44`, padding: '2px 8px', borderRadius: 5, fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = log.meta && Object.keys(log.meta).length > 0;
  const catColor = CATEGORY_COLORS[log.category] || 'var(--c-muted)';

  return (
    <>
      <tr
        style={{ borderBottom: '1px solid var(--c-border)', transition: 'background 0.1s', cursor: hasDetails ? 'pointer' : 'default' }}
        onClick={() => hasDetails && setExpanded((e) => !e)}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <td style={{ padding: '10px 16px', fontSize: 11, color: 'var(--c-muted)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          {log.timestamp ? new Date(log.timestamp).toLocaleString('uz-UZ') : '—'}
        </td>
        <td style={{ padding: '10px 16px' }}><LevelBadge level={log.level} /></td>
        <td style={{ padding: '10px 16px' }}>
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: catColor }}>[{log.category || 'system'}]</span>
        </td>
        <td style={{ padding: '10px 16px', maxWidth: 400 }}>
          <span style={{ color: 'var(--c-text2)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{log.message}</span>
        </td>
        <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--c-muted)', fontFamily: 'monospace' }}>{log.userId || '—'}</td>
        <td style={{ padding: '10px 16px' }}>
          {hasDetails && <ChevronDown size={13} style={{ color: 'var(--c-muted)', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }} />}
        </td>
      </tr>
      {expanded && hasDetails && (
        <tr style={{ borderBottom: '1px solid var(--c-border)', background: 'rgba(0,0,0,0.25)' }}>
          <td colSpan={6} style={{ padding: '10px 16px' }}>
            <pre style={{ fontSize: 11, color: 'var(--c-text2)', fontFamily: 'monospace', background: 'var(--c-bg)', borderRadius: 8, padding: 12, maxHeight: 200, overflowY: 'auto', overflowX: 'auto', margin: 0 }}>
              {JSON.stringify(log.meta, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

const selectStyle = {
  background: 'var(--c-panel)', border: '1px solid var(--c-border2)',
  borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px',
  fontSize: 13, outline: 'none',
};
const pageBtnStyle = (disabled) => ({
  padding: '7px 14px', borderRadius: 8, border: '1px solid var(--c-border2)',
  background: 'var(--c-panel)', color: disabled ? 'var(--c-muted)' : 'var(--c-text2)',
  cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, opacity: disabled ? 0.5 : 1,
});

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const intervalRef = useRef(null);
  const limit = 50;

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (level) params.level = level;
      if (category) params.category = category;
      const res = await apiService.get('/admin/logs', { params });
      setLogs(res.data.data.logs || []);
      setTotal(res.data.data.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, search, level, category]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchLogs(true), 5000);
    } else { clearInterval(intervalRef.current); }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, fetchLogs]);

  const handleExport = async () => {
    try {
      const res = await apiService.get('/admin/logs/export', { responseType: 'blob', params: { level, category } });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `logs-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={pageTitle}>Tizim loglari</h1>
          <p style={pageSubtitle}>Server loglari va hodisalar tarixi</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setAutoRefresh((a) => !a)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              border: '1px solid', cursor: 'pointer',
              background: autoRefresh ? 'rgba(34,197,94,0.12)' : 'var(--c-panel)',
              color: autoRefresh ? 'var(--c-green)' : 'var(--c-text2)',
              borderColor: autoRefresh ? 'rgba(34,197,94,0.3)' : 'var(--c-border2)',
            }}
          >
            <RefreshCw size={13} style={{ animation: autoRefresh ? 'spin 1.2s linear infinite' : 'none' }} />
            {autoRefresh ? 'Auto (5s)' : 'Auto off'}
          </button>
          <button onClick={() => fetchLogs()} className="btn-secondary">
            <RefreshCw size={14} /> Yangilash
          </button>
          <button onClick={handleExport} className="btn-secondary">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-muted)' }} />
            <input style={{ ...searchInput, paddingLeft: 32 }} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Log xabaridan qidirish..." />
          </div>
          <select style={selectStyle} value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }}>
            <option value="">Barcha darajalar</option>
            <option value="error">🔴 ERROR</option>
            <option value="warn">🟡 WARN</option>
            <option value="info">🔵 INFO</option>
            <option value="http">🟣 HTTP</option>
            <option value="debug">⚫ DEBUG</option>
          </select>
          <select style={selectStyle} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="">Barcha kategoriyalar</option>
            {['auth', 'territory', 'session', 'notification', 'scheduler', 'admin', 'system'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <p style={{ color: 'var(--c-muted)', fontSize: 12 }}>
            Jami: <b style={{ color: 'var(--c-text)' }}>{total.toLocaleString()}</b> ta log
          </p>
          {(search || level || category) && (
            <button onClick={() => { setSearch(''); setLevel(''); setCategory(''); setPage(1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-blue)', fontSize: 12 }}>
              Filtrlarni tozalash
            </button>
          )}
        </div>
      </div>

      {/* Terminal-style table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Terminal header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--c-bg)', borderBottom: '1px solid var(--c-border)' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#ef4444', '#f59e0b', '#22c55e'].map((c) => (
              <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c + 'bb' }} />
            ))}
          </div>
          <span style={{ color: 'var(--c-muted)', fontSize: 12, fontFamily: 'monospace', marginLeft: 6 }}>system.log</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--c-border)', background: 'rgba(0,0,0,0.2)' }}>
                {['Vaqt', 'Daraja', 'Kategoriya', 'Xabar', 'User ID', ''].map((h) => (
                  <th key={h} style={{ padding: '9px 16px', fontSize: 11, color: 'var(--c-muted)', fontWeight: 500, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--c-border)' }}>
                    {Array(6).fill(0).map((_, j) => (
                      <td key={j} style={{ padding: '10px 16px' }}>
                        <div className="animate-pulse" style={{ height: 13, borderRadius: 4, width: j === 3 ? '70%' : '50%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '50px 0', color: 'var(--c-muted)' }}>
                  <FileText size={28} style={{ display: 'block', margin: '0 auto 10px' }} />
                  Loglar topilmadi
                </td></tr>
              ) : logs.map((log, idx) => <LogRow key={log.id || idx} log={log} />)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--c-muted)', fontSize: 13 }}>
            {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} / {total.toLocaleString()}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(1)} disabled={page === 1} style={pageBtnStyle(page === 1)}>«</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={pageBtnStyle(page === 1)}>← Oldingi</button>
            <span style={{ padding: '7px 14px', fontSize: 13, color: 'var(--c-muted)' }}>{page}/{totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtnStyle(page === totalPages)}>Keyingi →</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={pageBtnStyle(page === totalPages)}>»</button>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
