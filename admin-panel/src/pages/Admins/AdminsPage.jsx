import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Search, Eye, EyeOff, Key, CheckCircle, XCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import apiService from '../../services/api.service';

// Rol badge
function RoleBadge({ role }) {
  if (role === 'super_admin') {
    return <span className="badge bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Super Admin</span>;
  }
  return <span className="badge badge-info">Admin</span>;
}

// Yangi admin qo'shish modali
function AddAdminModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'admin' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.username || !form.email || !form.password) {
      setError('Barcha maydonlar majburiy');
      return;
    }
    if (form.password.length < 8) {
      setError('Parol kamida 8 ta belgi bo\'lishi kerak');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiService.post('/admin/admins', form);
      onSuccess('Admin muvaffaqiyatli qo\'shildi');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Qo\'shishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 border border-dark-600 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-dark-600">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Yangi admin qo'shish</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Username *</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              placeholder="admin_username"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="admin@geofitness.uz"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Parol */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Parol *</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Kamida 8 ta belgi"
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Rol */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Rol</label>
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 btn-secondary text-sm">Bekor qilish</button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 btn-primary text-sm disabled:opacity-50"
            >
              {loading ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Parol o'zgartirish modali
function ChangePasswordModal({ admin, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (password.length < 8) {
      setError('Parol kamida 8 ta belgi bo\'lishi kerak');
      return;
    }
    setLoading(true);
    try {
      await apiService.put(`/admin/admins/${admin.id}/password`, { password });
      onSuccess('Parol muvaffaqiyatli o\'zgartirildi');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 border border-dark-600 rounded-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-dark-600">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Parol o'zgartirish</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-400">
            <span className="text-white font-medium">{admin.username}</span> uchun yangi parol
          </p>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Yangi parol..."
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button type="button" onClick={() => setShowPass((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {error && <div className="text-sm text-red-400">{error}</div>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 btn-secondary text-sm">Bekor</button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 btn-primary text-sm disabled:opacity-50">
              {loading ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [changePassAdmin, setChangePassAdmin] = useState(null);
  const [toast, setToast] = useState(null);

  // Joriy admin
  const currentAdmin = useSelector((s) => s.adminAuth?.admin);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Adminlarni yuklash
  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/admin/admins');
      setAdmins(res.data.data.admins || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Adminni o'chirish
  const handleDelete = async (admin) => {
    if (admin.id === currentAdmin?.id) {
      showToast('O\'zingizni o\'chira olmaysiz', 'error');
      return;
    }
    if (!window.confirm(`"${admin.username}" adminni o'chirmoqchimisiz?`)) return;
    try {
      await apiService.delete(`/admin/admins/${admin.id}`);
      showToast('Admin o\'chirildi');
      fetchAdmins();
    } catch (err) {
      showToast(err.response?.data?.message || 'O\'chirishda xatolik', 'error');
    }
  };

  // Statusni toggle qilish
  const handleToggleStatus = async (admin) => {
    if (admin.id === currentAdmin?.id) return;
    try {
      await apiService.patch(`/admin/admins/${admin.id}/toggle-status`);
      showToast('Admin statusi o\'zgartirildi');
      fetchAdmins();
    } catch {
      showToast('Xatolik yuz berdi', 'error');
    }
  };

  // Qidiruv filtri
  const filtered = admins.filter((a) =>
    !search ||
    a.username?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Adminlar boshqaruvi</h1>
          <p className="text-gray-400 text-sm mt-1">Tizim adminlarini boshqarish va ruxsatlar</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 btn-primary"
        >
          <Plus size={16} />
          Yangi admin
        </button>
      </div>

      {/* Qidiruv */}
      <div className="card">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Username yoki email bo'yicha qidirish..."
            className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Adminlar ro'yxati */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-600">
                {['Admin', 'Email', 'Rol', 'So\'nggi kirish', 'Holat', 'Amallar'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-dark-700">
                    {Array(6).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-dark-600 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">
                    <Shield size={28} className="mx-auto mb-2 text-gray-600" />
                    Admin topilmadi
                  </td>
                </tr>
              ) : (
                filtered.map((admin) => {
                  const isCurrent = admin.id === currentAdmin?.id;
                  return (
                    <tr key={admin.id} className={`border-b border-dark-700 hover:bg-dark-700/50 transition-colors ${isCurrent ? 'bg-blue-500/5' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {admin.username?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{admin.username}</div>
                            {isCurrent && <div className="text-xs text-blue-400">Siz</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{admin.email}</td>
                      <td className="px-4 py-3"><RoleBadge role={admin.role} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {admin.lastLoginAt
                          ? new Date(admin.lastLoginAt).toLocaleString('uz-UZ')
                          : 'Hech qachon'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => !isCurrent && handleToggleStatus(admin)}
                          disabled={isCurrent}
                          className={`flex items-center gap-1.5 text-xs ${
                            admin.isActive
                              ? 'text-green-400'
                              : 'text-red-400'
                          } disabled:opacity-50`}
                        >
                          {admin.isActive
                            ? <><CheckCircle size={14} /> Faol</>
                            : <><XCircle size={14} /> Bloklangan</>}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setChangePassAdmin(admin)}
                            className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded transition-colors"
                            title="Parol o'zgartirish"
                          >
                            <Key size={14} />
                          </button>
                          {!isCurrent && admin.role !== 'super_admin' && (
                            <button
                              onClick={() => handleDelete(admin)}
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              title="O'chirish"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modallar */}
      {showAdd && (
        <AddAdminModal
          onClose={() => setShowAdd(false)}
          onSuccess={(msg) => { showToast(msg); fetchAdmins(); }}
        />
      )}
      {changePassAdmin && (
        <ChangePasswordModal
          admin={changePassAdmin}
          onClose={() => setChangePassAdmin(null)}
          onSuccess={(msg) => showToast(msg)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-medium shadow-xl z-50 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
