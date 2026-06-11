import { useState, useEffect, useCallback } from 'react';
import { Search, Ban, CheckCircle, Eye, RefreshCw, User, MapPin, Activity } from 'lucide-react';
import api from '../../services/api.service';

function StatusBadge({ isBlocked }) {
  if (isBlocked) {
    return <span className="badge badge-danger">Bloklangan</span>;
  }
  return <span className="badge badge-success">Faol</span>;
}

function UserDetailModal({ user, onClose }) {
  if (!user) return null;
  const stats = user.statistics;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-dark-800 border border-dark-600 rounded-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-dark-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-white">{user.username}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'To\'liq ism', value: user.displayName || '—' },
              { label: 'Viloyat', value: user.region || '—' },
              { label: 'Daraja', value: user.level || 1 },
              { label: 'Jami XP', value: user.totalXp?.toLocaleString() || 0 },
              { label: 'Holat', value: user.isBlocked ? '🚫 Bloklangan' : '✅ Faol' },
              { label: 'Ro\'yxat sanasi', value: new Date(user.createdAt).toLocaleDateString('uz-UZ') },
            ].map((item) => (
              <div key={item.label} className="bg-dark-700 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <div className="text-sm text-white font-medium">{String(item.value)}</div>
              </div>
            ))}
          </div>

          {user.isBlocked && user.blockedReason && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="text-xs text-red-400 mb-1">Bloklash sababi</div>
              <div className="text-sm text-red-300">{user.blockedReason}</div>
            </div>
          )}

          {stats && (
            <>
              <div className="border-t border-dark-600 pt-4">
                <h3 className="text-sm font-semibold text-white mb-3">Statistika</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Hududlar', value: stats.currentTerritories || 0 },
                    { label: 'Jami masofa', value: `${((stats.totalDistanceMeters || 0) / 1000).toFixed(1)} km` },
                    { label: 'Sessiyalar', value: stats.totalSessions || 0 },
                    { label: 'Kashf etilgan', value: stats.totalExploredCells || 0 },
                  ].map((item) => (
                    <div key={item.label} className="bg-dark-700 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                      <div className="text-sm text-white font-medium">{String(item.value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <button onClick={onClose} className="w-full btn-secondary mt-2">Yopish</button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [toast, setToast] = useState(null);

  const limit = 20;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', {
        params: { page, limit, search: search || undefined },
      });
      setUsers(res.data.data.users || []);
      setTotal(res.data.data.total || 0);
    } catch (e) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleBlock = async (userId, isBlocked) => {
    try {
      await api.patch(`/admin/users/${userId}`, { isBlocked: !isBlocked });
      showToast(isBlocked ? 'Foydalanuvchi faollashtirildi' : 'Foydalanuvchi bloklandi');
      fetchUsers();
    } catch (e) {
      showToast('Xatolik: ' + e.message, 'error');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Foydalanuvchilar</h1>
          <p className="text-gray-400 text-sm mt-1">
            Jami: <span className="text-white font-medium">{total.toLocaleString()}</span> ta foydalanuvchi
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 btn-secondary"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Yangilash
        </button>
      </div>

      {/* Qidiruv */}
      <div className="card">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="Username yoki email bo'yicha qidirish..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Jadval */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-600">
                {['#', 'Foydalanuvchi', 'Email', 'Viloyat', 'Daraja', 'Hududlar', 'Holat', 'Sana', 'Amallar'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-dark-700">
                    {Array(9).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-dark-600 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    <User size={32} className="mx-auto mb-2 text-gray-600" />
                    Foydalanuvchi topilmadi
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => (
                  <tr
                    key={user.id}
                    className={`border-b border-dark-700 hover:bg-dark-700/50 transition-colors ${user.isBlocked ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {user.username?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-white">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-400 capitalize">{user.region || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{user.level || 1}</td>
                    <td className="px-4 py-3 text-sm text-blue-400">
                      {user.statistics?.currentTerritories || 0}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge isBlocked={user.isBlocked} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('uz-UZ')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                          title="Ko'rish"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleBlock(user.id, user.isBlocked)}
                          className={`p-1.5 rounded transition-colors ${
                            user.isBlocked
                              ? 'text-gray-400 hover:text-green-400 hover:bg-green-500/10'
                              : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                          }`}
                          title={user.isBlocked ? 'Faollashtirish' : 'Bloklash'}
                        >
                          {user.isBlocked ? <CheckCircle size={14} /> : <Ban size={14} />}
                        </button>
                      </div>
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
            Jami: <span className="text-white">{total.toLocaleString()}</span> ta foydalanuvchi
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
      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-medium shadow-xl z-50 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
