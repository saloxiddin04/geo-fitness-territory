import { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle, Clock, MapPin, Search, Filter, Eye, ChevronDown } from 'lucide-react';
import apiService from '../../services/api.service';

// Sessiya holati badge
function StatusBadge({ status }) {
  const map = {
    completed: { label: 'Tugallangan', className: 'badge-success' },
    active: { label: 'Faol', className: 'badge-warning' },
    suspicious: { label: 'Shubhali', className: 'badge-danger' },
    cancelled: { label: 'Bekor qilingan', className: 'text-gray-400 bg-dark-600' },
  };
  const s = map[status] || map.cancelled;
  return <span className={`badge ${s.className}`}>{s.label}</span>;
}

// Vaqtni formatlash (sekunddan mm:ss)
function formatDuration(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Sessiya detali modali
function SessionDetailModal({ session, onClose }) {
  if (!session) return null;

  const isSuspicious = session.isSuspicious || session.status === 'suspicious';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-dark-800 border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto ${
        isSuspicious ? 'border-red-500/40' : 'border-dark-600'
      }`}>
        <div className="flex items-center justify-between p-5 border-b border-dark-600">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">Sessiya tafsilotlari</h3>
            {isSuspicious && (
              <div className="flex items-center gap-1.5 text-red-400 text-xs bg-red-500/10 px-2 py-1 rounded">
                <AlertTriangle size={12} />
                Shubhali
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Asosiy ma'lumotlar */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Sessiya ID', value: session.id?.slice(0, 8) + '...', mono: true },
              { label: 'Foydalanuvchi', value: session.username || '—' },
              { label: 'Masofa', value: session.distance ? `${(session.distance / 1000).toFixed(2)} km` : '—' },
              { label: 'Davomiylik', value: formatDuration(session.duration) },
              { label: 'O\'rtacha tezlik', value: session.avgSpeed ? `${session.avgSpeed.toFixed(1)} km/h` : '—' },
              { label: 'Max tezlik', value: session.maxSpeed ? `${session.maxSpeed.toFixed(1)} km/h` : '—' },
              { label: 'Kaloriya', value: session.calories ? `${session.calories} kcal` : '—' },
              { label: 'Earned XP', value: session.xpEarned || 0 },
              { label: 'GPS nuqtalari', value: session.gpsPointsCount || 0 },
              { label: 'Egallangan hududlar', value: session.territoriesCaptured || 0 },
            ].map((item) => (
              <div key={item.label} className="bg-dark-700 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <div className={`text-sm text-white ${item.mono ? 'font-mono text-xs' : ''}`}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Shubhali sabab */}
          {isSuspicious && session.suspiciousReason && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="text-xs text-red-400 mb-1 font-medium">⚠️ Shubhali sabab:</div>
              <div className="text-sm text-red-300">{session.suspiciousReason}</div>
            </div>
          )}

          {/* Vaqt */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-dark-700 rounded p-3">
              <div className="text-xs text-gray-500 mb-1">Boshlangan</div>
              <div className="text-sm text-white">
                {session.startTime ? new Date(session.startTime).toLocaleString('uz-UZ') : '—'}
              </div>
            </div>
            <div className="bg-dark-700 rounded p-3">
              <div className="text-xs text-gray-500 mb-1">Tugallangan</div>
              <div className="text-sm text-white">
                {session.endTime ? new Date(session.endTime).toLocaleString('uz-UZ') : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | suspicious | active | completed
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const limit = 15;

  // Sessiyalarni yuklash
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (filter !== 'all') params.status = filter;

      const res = await apiService.get('/admin/sessions', { params });
      setSessions(res.data.data.sessions || []);
      setTotal(res.data.data.total || 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, search, filter]);

  // Statistikalarni yuklash
  const fetchStats = async () => {
    try {
      const res = await apiService.get('/admin/sessions/stats');
      setStats(res.data.data);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    fetchStats();
  }, []);

  const totalPages = Math.ceil(total / limit);

  const filterOptions = [
    { value: 'all', label: 'Barchasi' },
    { value: 'suspicious', label: '⚠️ Shubhali' },
    { value: 'active', label: 'Faol' },
    { value: 'completed', label: 'Tugallangan' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Yugurish sessiyalari</h1>
        <p className="text-gray-400 text-sm mt-1">Barcha foydalanuvchi sessiyalari va shubhali faoliyatlar</p>
      </div>

      {/* Statistika */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Jami sessiyalar', value: stats.total?.toLocaleString() || 0, color: 'text-white' },
            { label: 'Bugun', value: stats.today || 0, color: 'text-blue-400' },
            { label: 'Faol hozir', value: stats.active || 0, color: 'text-green-400' },
            { label: 'Shubhali', value: stats.suspicious || 0, color: 'text-red-400' },
          ].map((item) => (
            <div key={item.label} className="card text-center">
              <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-gray-400 text-xs mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtrlar */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Foydalanuvchi nomi yoki sessiya ID..."
              className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setFilter(opt.value); setPage(1); }}
                className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                  filter === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-dark-700 border border-dark-600 text-gray-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Jadval */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-600">
                {['Foydalanuvchi', 'Masofa', 'Davomiylik', 'Tezlik', 'XP', 'Holat', 'Sana', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-dark-700">
                    {Array(8).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-dark-600 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    <Activity size={32} className="mx-auto mb-2 text-gray-600" />
                    Sessiyalar topilmadi
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr
                    key={session.id}
                    className={`border-b border-dark-700 hover:bg-dark-700/50 transition-colors ${
                      session.isSuspicious ? 'bg-red-500/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {session.isSuspicious && (
                          <AlertTriangle size={14} className="text-red-400 shrink-0" />
                        )}
                        <span className="text-sm text-white font-medium">{session.username || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {session.distance ? `${(session.distance / 1000).toFixed(2)} km` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-gray-500" />
                        {formatDuration(session.duration)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {session.avgSpeed ? `${session.avgSpeed.toFixed(1)} km/h` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-yellow-400">+{session.xpEarned || 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={session.isSuspicious ? 'suspicious' : session.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {session.startTime
                        ? new Date(session.startTime).toLocaleDateString('uz-UZ')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sahifalash */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Jami: <span className="text-white">{total}</span> ta sessiya
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm bg-dark-700 border border-dark-600 rounded-lg text-gray-300 disabled:opacity-40 hover:border-blue-500/50 transition-colors"
            >
              ← Oldingi
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-400">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm bg-dark-700 border border-dark-600 rounded-lg text-gray-300 disabled:opacity-40 hover:border-blue-500/50 transition-colors"
            >
              Keyingi →
            </button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      <SessionDetailModal
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
      />
    </div>
  );
}
