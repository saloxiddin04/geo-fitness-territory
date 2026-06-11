import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Search, Eye, EyeOff, Key, CheckCircle, XCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import apiService from '../../services/api.service';
import { Toast, Modal, SkeletonTable, TABLE_HEADER_STYLE, TD, pageTitle, pageSubtitle, searchInput } from '../../components/ui/shared.jsx';

const labelStyle = { display: 'block', color: 'var(--c-text2)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 };

function RoleBadge({ role }) {
  const r = role?.toUpperCase();
  if (r === 'SUPER_ADMIN') return <span className="badge badge-warning">Super Admin</span>;
  if (r === 'MODERATOR') return <span className="badge badge-info">Moderator</span>;
  return <span className="badge badge-info">Admin</span>;
}

function AddAdminModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'admin' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.username || !form.email || !form.password) { setError('Barcha maydonlar majburiy'); return; }
    if (form.password.length < 8) { setError("Parol kamida 8 ta belgi bo'lishi kerak"); return; }
    setError(''); setLoading(true);
    try {
      await apiService.post('/admin/admins', form);
      onSuccess("Admin muvaffaqiyatli qo'shildi");
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Qo'shishda xatolik");
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Yangi admin qo'shish" onClose={onClose}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[
          { key: 'username', label: 'Username', placeholder: 'admin_username', type: 'text' },
          { key: 'email',    label: 'Email',    placeholder: 'admin@geofitness.uz', type: 'email' },
        ].map((f) => (
          <div key={f.key}>
            <label style={labelStyle}>{f.label} *</label>
            <input type={f.type} style={searchInput} value={form[f.key]} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
          </div>
        ))}
        <div>
          <label style={labelStyle}>Parol *</label>
          <div style={{ position: 'relative' }}>
            <input type={showPass ? 'text' : 'password'} style={{ ...searchInput, paddingRight: 40 }} value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Kamida 8 ta belgi" />
            <button type="button" onClick={() => setShowPass((s) => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-muted)' }}>
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Rol</label>
          <select style={searchInput} value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
        {error && <div style={{ background: 'var(--c-red-dim)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', color: 'var(--c-red)', fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Bekor</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? "Qo'shilmoqda..." : "Qo'shish"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ChangePasswordModal({ admin, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (password.length < 8) { setError("Parol kamida 8 ta belgi bo'lishi kerak"); return; }
    setLoading(true);
    try {
      await apiService.put(`/admin/admins/${admin.id}/password`, { password });
      onSuccess("Parol muvaffaqiyatli o'zgartirildi");
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Xatolik yuz berdi');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Parol o'zgartirish" onClose={onClose} maxWidth={380}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ color: 'var(--c-text2)', fontSize: 13, margin: 0 }}>
          <b style={{ color: 'var(--c-text)' }}>{admin.username}</b> uchun yangi parol
        </p>
        <div style={{ position: 'relative' }}>
          <input type={showPass ? 'text' : 'password'} style={{ ...searchInput, paddingRight: 40 }} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Yangi parol..." />
          <button type="button" onClick={() => setShowPass((s) => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-muted)' }}>
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {error && <div style={{ color: 'var(--c-red)', fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Bekor</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [changePassAdmin, setChangePassAdmin] = useState(null);
  const [toast, setToast] = useState(null);

  const currentAdmin = useSelector((s) => s.adminAuth?.admin);
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/admin/admins');
      setAdmins(res.data.data.admins || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleDelete = async (admin) => {
    if (admin.id === currentAdmin?.id) { showToast("O'zingizni o'chira olmaysiz", 'error'); return; }
    if (!window.confirm(`"${admin.username}" adminni o'chirmoqchimisiz?`)) return;
    try {
      await apiService.delete(`/admin/admins/${admin.id}`);
      showToast("Admin o'chirildi");
      fetchAdmins();
    } catch (err) {
      showToast(err.response?.data?.message || "O'chirishda xatolik", 'error');
    }
  };

  const handleToggleStatus = async (admin) => {
    if (admin.id === currentAdmin?.id) return;
    try {
      await apiService.patch(`/admin/admins/${admin.id}/toggle-status`);
      showToast("Admin statusi o'zgartirildi");
      fetchAdmins();
    } catch { showToast('Xatolik yuz berdi', 'error'); }
  };

  const filtered = admins.filter((a) =>
    !search ||
    a.username?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={pageTitle}>Adminlar boshqaruvi</h1>
          <p style={pageSubtitle}>Tizim adminlarini boshqarish va ruxsatlar</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={14} /> Yangi admin
        </button>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-muted)' }} />
          <input style={{ ...searchInput, paddingLeft: 32 }} placeholder="Username yoki email bo'yicha qidirish..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Admin', 'Email', 'Rol', "So'nggi kirish", 'Holat', 'Amallar'].map((h) => (
                  <th key={h} style={TABLE_HEADER_STYLE}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonTable rows={3} cols={6} /> : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '50px 0', color: 'var(--c-muted)' }}>
                    <Shield size={28} style={{ display: 'block', margin: '0 auto 10px' }} />
                    Admin topilmadi
                  </td>
                </tr>
              ) : filtered.map((admin) => {
                const isCurrent = admin.id === currentAdmin?.id;
                return (
                  <tr key={admin.id}
                    style={{ borderBottom: '1px solid var(--c-border)', background: isCurrent ? 'rgba(59,130,246,0.04)' : 'transparent', transition: 'background 0.1s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = isCurrent ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = isCurrent ? 'rgba(59,130,246,0.04)' : 'transparent'}
                  >
                    <td style={TD}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                          {admin.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: 13 }}>{admin.username}</div>
                          {isCurrent && <div style={{ color: 'var(--c-blue)', fontSize: 11 }}>● Siz</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...TD, color: 'var(--c-muted)' }}>{admin.email}</td>
                    <td style={TD}><RoleBadge role={admin.role} /></td>
                    <td style={{ ...TD, color: 'var(--c-muted)', fontSize: 12 }}>
                      {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString('uz-UZ') : 'Hech qachon'}
                    </td>
                    <td style={TD}>
                      <button
                        onClick={() => !isCurrent && handleToggleStatus(admin)}
                        disabled={isCurrent}
                        style={{ background: 'none', border: 'none', cursor: isCurrent ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: admin.isActive ? 'var(--c-green)' : 'var(--c-red)', fontSize: 12, fontWeight: 600, padding: 0 }}
                      >
                        {admin.isActive ? <><CheckCircle size={13} /> Faol</> : <><XCircle size={13} /> Bloklangan</>}
                      </button>
                    </td>
                    <td style={TD}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setChangePassAdmin(admin)} style={iconBtn} title="Parol o'zgartirish">
                          <Key size={14} />
                        </button>
                        {!isCurrent && admin.role?.toUpperCase() !== 'SUPER_ADMIN' && (
                          <button onClick={() => handleDelete(admin)} style={{ ...iconBtn, color: 'var(--c-red)' }} title="O'chirish">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddAdminModal onClose={() => setShowAdd(false)} onSuccess={(msg) => { showToast(msg); fetchAdmins(); }} />}
      {changePassAdmin && <ChangePasswordModal admin={changePassAdmin} onClose={() => setChangePassAdmin(null)} onSuccess={(msg) => showToast(msg)} />}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

const iconBtn = {
  background: 'var(--c-panel)', border: '1px solid var(--c-border2)',
  cursor: 'pointer', color: 'var(--c-text2)', padding: '5px 8px',
  borderRadius: 7, display: 'flex', alignItems: 'center', transition: 'all 0.15s',
};
