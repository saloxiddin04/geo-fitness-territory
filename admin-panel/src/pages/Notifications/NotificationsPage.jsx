import { useState, useEffect } from 'react';
import { Bell, Send, Users, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import apiService from '../../services/api.service';

// Notification turi ikonkasi
function TypeIcon({ type }) {
  const map = {
    attack: '⚔️',
    capture: '🏴',
    night_event: '🌙',
    explore: '🗺️',
    weekly_stats: '📊',
    leaderboard: '🏆',
    broadcast: '📢',
    system: '⚙️',
  };
  return <span>{map[type] || '🔔'}</span>;
}

// Holat badge
function StatusBadge({ status }) {
  if (status === 'sent') return <span className="badge badge-success">Yuborildi</span>;
  if (status === 'failed') return <span className="badge badge-danger">Xatolik</span>;
  if (status === 'pending') return <span className="badge badge-warning">Kutmoqda</span>;
  return <span className="badge">{status}</span>;
}

// Broadcast formasi
function BroadcastForm({ onSuccess }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('broadcast');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Sarlavha va matn majburiy');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = { title: title.trim(), body: body.trim(), type };
      if (region) payload.region = region;
      await apiService.post('/admin/notifications/broadcast', payload);
      setTitle('');
      setBody('');
      setRegion('');
      onSuccess('Notification muvaffaqiyatli yuborildi!');
    } catch (err) {
      setError(err.response?.data?.message || 'Yuborishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Send size={18} className="text-blue-400" />
        <h2 className="text-lg font-semibold text-white">Broadcast Notification</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sarlavha */}
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-400 mb-1.5">Sarlavha *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification sarlavhasi..."
            maxLength={100}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Matn */}
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-400 mb-1.5">Matn *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Notification matni..."
            rows={3}
            maxLength={500}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="text-right text-xs text-gray-600 mt-1">{body.length}/500</div>
        </div>

        {/* Tur */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Tur</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="broadcast">📢 Broadcast</option>
            <option value="night_event">🌙 Night Event</option>
            <option value="system">⚙️ System</option>
            <option value="weekly_stats">📊 Haftalik statistika</option>
          </select>
        </div>

        {/* Viloyat (ixtiyoriy) */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Viloyat (ixtiyoriy)</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Barcha foydalanuvchilar</option>
            <option value="tashkent">Toshkent</option>
            <option value="samarkand">Samarqand</option>
            <option value="bukhara">Buxoro</option>
            <option value="andijan">Andijon</option>
            <option value="fergana">Farg'ona</option>
            <option value="namangan">Namangan</option>
            <option value="kashkadarya">Qashqadaryo</option>
            <option value="surkhandarya">Surxondaryo</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-gray-500">
          {region ? `"${region}" viloyati` : 'Barcha foydalanuvchilarga'} yuboriladi
        </p>
        <button
          onClick={handleSubmit}
          disabled={loading || !title.trim() || !body.trim()}
          className="flex items-center gap-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={15} />
          {loading ? 'Yuborilmoqda...' : 'Yuborish'}
        </button>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);

  const limit = 15;

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // Notification tarixini yuklash
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/admin/notifications', { params: { page, limit } });
      setHistory(res.data.data.notifications || []);
      setTotal(res.data.data.total || 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  // Statistikalarni yuklash
  const fetchStats = async () => {
    try {
      const res = await apiService.get('/admin/notifications/stats');
      setStats(res.data.data);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page]);

  useEffect(() => {
    fetchStats();
  }, []);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Notificationlar</h1>
        <p className="text-gray-400 text-sm mt-1">Broadcast yuborish va notification tarixi</p>
      </div>

      {/* Statistika */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Bugun yuborilgan', value: stats.sentToday || 0, icon: '📤', color: 'text-blue-400' },
            { label: 'Jami yuborilgan', value: stats.totalSent?.toLocaleString() || 0, icon: '✅', color: 'text-green-400' },
            { label: 'Muvaffaqiyatsiz', value: stats.failed || 0, icon: '❌', color: 'text-red-400' },
            { label: 'Broadcast', value: stats.broadcasts || 0, icon: '📢', color: 'text-yellow-400' },
          ].map((item) => (
            <div key={item.label} className="card text-center">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-gray-400 text-xs mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Broadcast forma */}
      <BroadcastForm onSuccess={(msg) => { showToast(msg); fetchHistory(); fetchStats(); }} />

      {/* Tarix */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 border-b border-dark-600">
          <h3 className="font-semibold text-white">Notification tarixi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-600">
                {['Tur', 'Sarlavha', 'Qabul qiluvchi', 'Holat', 'Vaqt'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-dark-700">
                    {Array(5).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-dark-600 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-500">
                    <Bell size={28} className="mx-auto mb-2 text-gray-600" />
                    Notification tarixi yo'q
                  </td>
                </tr>
              ) : (
                history.map((n) => (
                  <tr key={n.id} className="border-b border-dark-700 hover:bg-dark-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TypeIcon type={n.type} />
                        <span className="text-xs text-gray-400 capitalize">{n.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white font-medium">{n.title}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{n.body}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {n.recipientUsername || (n.isBroadcast ? '📢 Broadcast' : '—')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={n.status || 'sent'} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString('uz-UZ') : '—'}
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
          <p className="text-sm text-gray-400">Jami: <span className="text-white">{total}</span></p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm bg-dark-700 border border-dark-600 rounded-lg text-gray-300 disabled:opacity-40">
              ← Oldingi
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-400">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm bg-dark-700 border border-dark-600 rounded-lg text-gray-300 disabled:opacity-40">
              Keyingi →
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-3 rounded-lg text-sm font-medium shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
