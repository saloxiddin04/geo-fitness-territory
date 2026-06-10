// Foydalanuvchilarni boshqarish sahifasi
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Ban, CheckCircle, Eye, RefreshCw } from 'lucide-react';
import api from '../../services/api.service';
import dayjs from 'dayjs';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/users', {
        params: { page, limit, search: search || undefined },
      });
      setUsers(res.data.data.users);
      setTotal(res.data.data.total);
    } catch (e) {
      console.error(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleBlock = async (userId, isBlocked) => {
    try {
      await api.patch(`/admin/users/${userId}`, { isBlocked: !isBlocked });
      fetchUsers();
    } catch (e) {
      alert('Xato: ' + e.message);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 'bold', margin: 0 }}>
            Foydalanuvchilar
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 0' }}>
            Jami: {total} ta
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={fetchUsers}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} />
          Yangilash
        </button>
      </div>

      {/* Qidiruv */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
        borderRadius: 6, padding: '8px 12px', marginBottom: 16,
      }}>
        <Search size={16} color="var(--text-muted)" />
        <input
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: 14, flex: 1,
          }}
          placeholder="Username yoki email bo'yicha qidirish..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Jadval */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              {['#', 'Username', 'Email', 'Viloyat', 'Daraja', 'Hududlar', 'Holat', 'Ro\'yxat sanasi', 'Amallar'].map(h => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: 'left',
                  color: 'var(--text-secondary)', fontSize: 12,
                  fontWeight: 600,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Yuklanmoqda...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Foydalanuvchi topilmadi
                </td>
              </tr>
            ) : (
              users.map((user, idx) => (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    opacity: user.isBlocked ? 0.6 : 1,
                  }}
                >
                  <td style={tdStyle}>{(page - 1) * limit + idx + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {user.username}
                  </td>
                  <td style={tdStyle}>{user.email}</td>
                  <td style={tdStyle}>{user.region || '-'}</td>
                  <td style={tdStyle}>{user.level || 1}</td>
                  <td style={tdStyle}>{user.statistics?.territoriesCount || 0}</td>
                  <td style={tdStyle}>
                    <span className={`badge ${user.isBlocked ? 'badge-red' : 'badge-green'}`}>
                      {user.isBlocked ? 'Bloklangan' : 'Faol'}
                    </span>
                  </td>
                  <td style={tdStyle}>{dayjs(user.createdAt).format('DD.MM.YYYY')}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <ActionBtn
                        icon={<Eye size={14} />}
                        title="Ko'rish"
                        onClick={() => setSelectedUser(user)}
                      />
                      <ActionBtn
                        icon={user.isBlocked ? <CheckCircle size={14} /> : <Ban size={14} />}
                        title={user.isBlocked ? 'Faollashtirish' : 'Bloklash'}
                        danger={!user.isBlocked}
                        onClick={() => handleBlock(user.id, user.isBlocked)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border-color)',
                background: p === page ? 'var(--accent-green)' : 'var(--bg-secondary)',
                color: p === page ? '#000' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 13, fontWeight: p === page ? 600 : 400,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* User detail modal */}
      {selectedUser && (
        <UserModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
};

const tdStyle = { padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 13 };

const ActionBtn = ({ icon, title, onClick, danger }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      background: danger ? 'rgba(248, 81, 73, 0.1)' : 'var(--bg-tertiary)',
      border: `1px solid ${danger ? 'rgba(248, 81, 73, 0.3)' : 'var(--border-color)'}`,
      borderRadius: 4, padding: '4px 8px', cursor: 'pointer',
      color: danger ? 'var(--accent-red)' : 'var(--text-secondary)',
      display: 'flex', alignItems: 'center',
    }}
  >
    {icon}
  </button>
);

// Foydalanuvchi detail modal
const UserModal = ({ user, onClose }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  }} onClick={onClose}>
    <div
      className="card"
      style={{ width: 480, maxHeight: '80vh', overflow: 'auto' }}
      onClick={e => e.stopPropagation()}
    >
      <h2 style={{ color: 'var(--text-primary)', margin: '0 0 20px' }}>
        {user.username} — batafsil
      </h2>

      <Row label="Email" value={user.email} />
      <Row label="To'liq ism" value={user.fullName || '-'} />
      <Row label="Viloyat" value={user.region || '-'} />
      <Row label="Daraja" value={user.level || 1} />
      <Row label="Jami XP" value={user.totalXP || 0} />
      <Row label="Ro'yxat sanasi" value={dayjs(user.createdAt).format('DD.MM.YYYY HH:mm')} />

      {user.statistics && (
        <>
          <hr style={{ borderColor: 'var(--border-color)', margin: '16px 0' }} />
          <h3 style={{ color: 'var(--text-primary)', margin: '0 0 12px', fontSize: 14 }}>Statistika</h3>
          <Row label="Egallangan hududlar" value={user.statistics.territoriesCount || 0} />
          <Row label="Jami masofa" value={`${((user.statistics.totalDistanceMeters || 0) / 1000).toFixed(1)} km`} />
          <Row label="Ochilgan hujayralar" value={user.statistics.totalExploredCells || 0} />
        </>
      )}

      <button className="btn-primary" onClick={onClose} style={{ marginTop: 20, width: '100%' }}>
        Yopish
      </button>
    </div>
  </div>
);

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
  </div>
);

export default UsersPage;
