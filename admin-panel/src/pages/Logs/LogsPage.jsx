import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Search, Filter, RefreshCw, Download, ChevronDown } from 'lucide-react';
import apiService from '../../services/api.service';

// Log darajasi badge
function LevelBadge({ level }) {
  const map = {
    error: { label: 'ERROR', className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
    warn: { label: 'WARN', className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
    info: { label: 'INFO', className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
    debug: { label: 'DEBUG', className: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' },
    http: { label: 'HTTP', className: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
  };
  const s = map[level?.toLowerCase()] || map.info;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${s.className}`}>
      {s.label}
    </span>
  );
}

// Log kategoriyasi badge
function CategoryBadge({ category }) {
  const colors = {
    auth: 'text-green-400',
    territory: 'text-blue-400',
    session: 'text-yellow-400',
    notification: 'text-purple-400',
    leaderboard: 'text-orange-400',
    admin: 'text-red-400',
    system: 'text-gray-400',
    scheduler: 'text-cyan-400',
  };
  const color = colors[category] || 'text-gray-400';
  return (
    <span className={`text-xs font-mono ${color}`}>[{category || 'system'}]</span>
  );
}

// Log qatori
function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = log.meta && Object.keys(log.meta).length > 0;

  return (
    <>
      <tr
        className={`border-b border-dark-700/50 hover:bg-dark-700/30 transition-colors ${
          hasDetails ? 'cursor-pointer' : ''
        }`}
        onClick={() => hasDetails && setExpanded((e) => !e)}
      >
        <td className="px-4 py-2.5 text-xs text-gray-500 font-mono whitespace-nowrap">
          {log.timestamp ? new Date(log.timestamp).toLocaleString('uz-UZ') : '—'}
        </td>
        <td className="px-4 py-2.5">
          <LevelBadge level={log.level} />
        </td>
        <td className="px-4 py-2.5">
          <CategoryBadge category={log.category} />
        </td>
        <td className="px-4 py-2.5 text-sm text-gray-300 max-w-md">
          <span className="truncate block">{log.message}</span>
        </td>
        <td className="px-4 py-2.5 text-xs text-gray-500">{log.userId || '—'}</td>
        <td className="px-4 py-2.5">
          {hasDetails && (
            <ChevronDown size={14} className={`text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          )}
        </td>
      </tr>
      {expanded && hasDetails && (
        <tr className="border-b border-dark-700/50 bg-dark-900/50">
          <td colSpan={6} className="px-4 py-3">
            <pre className="text-xs text-gray-400 font-mono overflow-x-auto bg-dark-800 rounded p-3 max-h-48 overflow-y-auto">
              {JSON.stringify(log.meta, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

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
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, search, level, category]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchLogs(true), 5000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, fetchLogs]);

  // CSV eksport
  const handleExport = async () => {
    try {
      const res = await apiService.get('/admin/logs/export', {
        responseType: 'blob',
        params: { level, category },
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tizim loglari</h1>
          <p className="text-gray-400 text-sm mt-1">Server loglari va hodisalar tarixi</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh((a) => !a)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
              autoRefresh
                ? 'bg-green-500/20 border-green-500/30 text-green-400'
                : 'bg-dark-700 border-dark-600 text-gray-400'
            }`}
          >
            <RefreshCw size={14} className={autoRefresh ? 'animate-spin' : ''} />
            {autoRefresh ? 'Auto (5s)' : 'Auto off'}
          </button>

          <button
            onClick={() => fetchLogs()}
            className="flex items-center gap-2 btn-secondary text-sm"
          >
            <RefreshCw size={14} />
            Yangilash
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 btn-secondary text-sm"
          >
            <Download size={14} />
            CSV
          </button>
        </div>
      </div>

      {/* Filtrlar */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Log xabaridan qidirish..."
              className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={level}
            onChange={(e) => { setLevel(e.target.value); setPage(1); }}
            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Barcha darajalar</option>
            <option value="error">🔴 ERROR</option>
            <option value="warn">🟡 WARN</option>
            <option value="info">🔵 INFO</option>
            <option value="http">🟣 HTTP</option>
            <option value="debug">⚫ DEBUG</option>
          </select>

          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Barcha kategoriyalar</option>
            <option value="auth">auth</option>
            <option value="territory">territory</option>
            <option value="session">session</option>
            <option value="notification">notification</option>
            <option value="scheduler">scheduler</option>
            <option value="admin">admin</option>
            <option value="system">system</option>
          </select>
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-500">
            Jami: <span className="text-white">{total.toLocaleString()}</span> ta log
          </p>
          {(search || level || category) && (
            <button
              onClick={() => { setSearch(''); setLevel(''); setCategory(''); setPage(1); }}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Filtrlarni tozalash
            </button>
          )}
        </div>
      </div>

      {/* Jadval - terminal uslubida */}
      <div className="card overflow-hidden p-0 font-mono">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-dark-900 border-b border-dark-600">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <span className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs text-gray-500 ml-2">system.log</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-dark-600 bg-dark-800/50">
                {['Vaqt', 'Daraja', 'Kategoriya', 'Xabar', 'User ID', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-dark-700/50">
                    {Array(6).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-dark-600 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <FileText size={28} className="mx-auto mb-2 text-gray-600" />
                    Loglar topilmadi
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => <LogRow key={log.id || idx} log={log} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sahifalash */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} / {total.toLocaleString()}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-3 py-1.5 text-xs bg-dark-700 border border-dark-600 rounded-lg text-gray-300 disabled:opacity-40">
              «
            </button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm bg-dark-700 border border-dark-600 rounded-lg text-gray-300 disabled:opacity-40">
              ← Oldingi
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-400">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm bg-dark-700 border border-dark-600 rounded-lg text-gray-300 disabled:opacity-40">
              Keyingi →
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-3 py-1.5 text-xs bg-dark-700 border border-dark-600 rounded-lg text-gray-300 disabled:opacity-40">
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
