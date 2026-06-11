import { useState, useEffect, useCallback } from 'react';
import { Search, Ban, CheckCircle, Eye, RefreshCw, User } from 'lucide-react';
import api from '../../services/api.service';
import { Toast, Modal, SkeletonTable, TABLE_HEADER_STYLE, TD, pageTitle, pageSubtitle, searchInput } from '../../components/ui/shared.jsx';

function StatusBadge({ isBlocked }) {
  return isBlocked
    ? <span className="badge badge-danger">Bloklangan</span>
    : <span className="badge badge-success">Faol</span>;
}

function UserDetailModal({ user, onClose }) {
  if (!user) return null;
  const stats = user.statistics;
  return (
    <Modal title={`${user.username} — tafsilotlar`} onClose={onClose}>
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>
            {user.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: 15 }}>{user.username}</div>
            <div style={{ color: 'var(--c-muted)', fontSize: 12 }}>{user.email}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: "To'liq ism", value: user.displayName || '—' },
            { label: 'Viloyat', value: user.region || '—' },
            { label: 'Daraja', value: user.level || 1 },
            { label: 'Jami XP', value: user.totalXp?.toLocaleString() || 0 },
            { label: 'Holat', value: user.isBlocked ? '🚫 Bloklangan' : '✅ Faol' },
            { label: "Ro'yxat sanasi", value: new Date(user.createdAt).toLocaleDateString('uz-UZ') },
          ].map((item) => (
            <div key={item.label} style={{ background: 'var(--c-panel)', borderRadius: 8, padding: 12 }}>
              <div style={{ color: 'var(--c-muted)', fontSize: 11, marginBottom: 4 }}>{item.label}</div>
              <div style={{ color: 'var(--c-text)', fontSize: 13, fontWeight: 600 }}>{String(item.value)}</div>
            </div>
          ))}
        </div>

        {user.isBlocked && user.blockedReason && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
            <div style={{ color: 'var(--c-red)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Bloklash sababi</div>
            <div style={{ color: 'var(--c-text2)', fontSize: 13 }}>{user.blockedReason}</div>
          </div>
        )}

        {stats && (
          <>
            <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 14, marginBottom: 10 }}>
              <div style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Statistika</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Hududlar', value: stats.currentTerritories || 0 },
                  { label: 'Jami masofa', value: `${((stats.totalDistanceMeters || 0) / 1000).toFixed(1)} km` },
                  { label: 'Sessiyalar', value: stats.totalSessions || 0 },
                  { label: 'Kashf etilgan', value: stats.totalExploredCells || 0 },
                ].map((item) => (
                  <div key={item.label} style={{ background: 'var(--c-panel)', borderRadius: 8, padding: 12 }}>
                    <div style={{ color: 'var(--c-muted)', fontSize: 11, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ color: 'var(--c-text)', fontSize: 13, fontWeight: 600 }}>{String(item.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        <button onClick={onClose} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>Yopish</button>
      </div>
    </Modal>
  );
}

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--c-text2)', padding: '5px 7px', borderRadius: 6,
  display: 'flex', alignItems: 'center', transition: 'all 0.15s',
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [toast, setToast] = useState(null);
  const limit = 20;

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', { params: { page, limit, search: search || undefined } });
      setUsers(res.data.data.users || []);
      setTotal(res.data.data.total || 0);
    } catch (e) { console.error(e.message); }
    finally { setLoading(false); }
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
    } catch (e) { showToast('Xatolik: ' + e.message, 'error'); }
  };

  const totalPages = Math.ceil(total / limit);
  const pageBtnStyle = (disabled) => ({
    padding: '7px 14px', borderRadius: 8, border: '1px solid var(--c-border2)',
    background: 'var(--c-panel)', color: disabled ? 'var(--c-muted)' : 'var(--c-text2)',
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, opacity: disabled ? 0.5 : 1,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={pageTitle}>Foydalanuvchilar</h1>
          <p style={pageSubtitle}>Jami: <b style={{ color: 'var(--c-text)' }}>{total.toLocaleString()}</b> ta foydalanuvchi</p>
        </div>
        <button onClick={fetchUsers} className="btn-secondary">
          <RefreshCw size={14} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} /> Yangilash
        </button>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-muted)' }} />
          <input style={{ ...searchInput, paddingLeft: 32 }} placeholder="Username yoki email bo'yicha qidirish..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#', 'Foydalanuvchi', 'Email', 'Viloyat', 'Daraja', 'Hududlar', 'Holat', 'Sana', 'Amallar'].map((h) => (
                  <th key={h} style={TABLE_HEADER_STYLE}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonTable rows={6} cols={9} /> : users.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '50px 0', color: 'var(--c-muted)' }}>
                  <User size={28} style={{ display: 'block', margin: '0 auto 10px' }} />
                  Foydalanuvchi topilmadi
                </td></tr>
              ) : users.map((user, idx) => (
                <tr key={user.id}
                  style={{ borderBottom: '1px solid var(--c-border)', background: 'transparent', opacity: user.isBlocked ? 0.65 : 1, transition: 'background 0.1s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ ...TD, color: 'var(--c-muted)', fontSize: 12 }}>{(page - 1) * limit + idx + 1}</td>
                  <td style={TD}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {user.username?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: 13 }}>{user.username}</span>
                    </div>
                  </td>
                  <td style={{ ...TD, color: 'var(--c-muted)' }}>{user.email}</td>
                  <td style={{ ...TD, color: 'var(--c-muted)', textTransform: 'capitalize' }}>{user.region || '—'}</td>
                  <td style={{ ...TD, color: 'var(--c-text2)' }}>{user.level || 1}</td>
                  <td style={{ ...TD, color: 'var(--c-blue)', fontWeight: 600 }}>{user.statistics?.currentTerritories || 0}</td>
                  <td style={TD}><StatusBadge isBlocked={user.isBlocked} /></td>
                  <td style={{ ...TD, color: 'var(--c-muted)', fontSize: 12 }}>{new Date(user.createdAt).toLocaleDateString('uz-UZ')}</td>
                  <td style={TD}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => setSelectedUser(user)} style={iconBtn} title="Ko'rish">
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleBlock(user.id, user.isBlocked)}
                        style={{ ...iconBtn, color: user.isBlocked ? 'var(--c-green)' : 'var(--c-red)' }}
                        title={user.isBlocked ? 'Faollashtirish' : 'Bloklash'}
                      >
                        {user.isBlocked ? <CheckCircle size={14} /> : <Ban size={14} />}
                      </button>
                    </div>
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
          <span style={{ color: 'var(--c-muted)', fontSize: 13 }}>Jami: <b style={{ color: 'var(--c-text)' }}>{total.toLocaleString()}</b> ta</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={pageBtnStyle(page === 1)}>← Oldingi</button>
            <span style={{ padding: '7px 14px', fontSize: 13, color: 'var(--c-muted)' }}>{page}/{totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtnStyle(page === totalPages)}>Keyingi →</button>
          </div>
        </div>
      )}

      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
