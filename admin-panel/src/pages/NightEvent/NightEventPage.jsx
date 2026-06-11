import { useState, useEffect } from 'react';
import { Moon, Sun, Play, Square, Clock, Zap, Calendar, RefreshCw } from 'lucide-react';
import apiService from '../../services/api.service';
import socketService from '../../services/socket.service';
import { pageTitle, pageSubtitle, Toast } from '../../components/ui/shared.jsx';

const inputStyle = {
  width: '100%', background: 'var(--c-panel)', border: '1px solid var(--c-border2)',
  borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none',
};
const labelStyle = { display: 'block', color: 'var(--c-text2)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 };

function Countdown({ targetDate }) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!targetDate) return;
    const update = () => {
      const diff = new Date(targetDate) - Date.now();
      if (diff <= 0) { setRemaining('Tugadi'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}s ${m}d ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [targetDate]);
  return <div style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700, color: 'var(--c-text)' }}>{remaining || '—'}</div>;
}

function ScheduleItem({ item, index }) {
  const now = Date.now();
  const isPast = new Date(item.endTime) < now;
  const isActive = new Date(item.startTime) <= now && new Date(item.endTime) >= now;

  let bg = 'var(--c-panel)';
  let borderColor = 'var(--c-border2)';
  if (isActive) { bg = 'rgba(59,130,246,0.07)'; borderColor = 'rgba(59,130,246,0.3)'; }
  if (isPast) { bg = 'rgba(255,255,255,0.015)'; }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 10, background: bg, border: `1px solid ${borderColor}`, opacity: isPast ? 0.5 : 1 }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--c-border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--c-text2)', flexShrink: 0 }}>
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: 13 }}>{item.name || `Night Event #${index + 1}`}</span>
          {isActive && <span className="badge badge-success">Faol</span>}
          {isPast && <span style={{ color: 'var(--c-muted)', fontSize: 11 }}>Tugagan</span>}
        </div>
        <div style={{ color: 'var(--c-muted)', fontSize: 11 }}>
          {item.startTime ? new Date(item.startTime).toLocaleString('uz-UZ') : '—'} — {item.endTime ? new Date(item.endTime).toLocaleString('uz-UZ') : '—'}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ color: 'var(--c-yellow)', fontSize: 13, fontWeight: 600 }}>{item.xpMultiplier || 2}x XP</div>
        <div style={{ color: 'var(--c-muted)', fontSize: 11, textTransform: 'capitalize' }}>{item.region || 'Barcha viloyatlar'}</div>
      </div>
    </div>
  );
}

export default function NightEventPage() {
  const [status, setStatus] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [manualConfig, setManualConfig] = useState({ duration: 60, xpMultiplier: 2, region: '', name: "Qo'lda event" });

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, sc] = await Promise.all([
        apiService.get('/admin/night-event/status'),
        apiService.get('/admin/night-event/schedule'),
      ]);
      setStatus(s.data.data);
      setSchedule(sc.data.data?.schedule || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('night_event_started', (data) => { setStatus((p) => ({ ...p, isActive: true, ...data })); showToast('🌙 Night Event boshlandi!'); });
      socket.on('night_event_ended', () => { setStatus((p) => ({ ...p, isActive: false })); showToast('Night Event tugadi'); });
    }
    return () => { if (socket) { socket.off('night_event_started'); socket.off('night_event_ended'); } };
  }, []);

  const handleStart = async () => {
    setActionLoading(true);
    try {
      await apiService.post('/admin/night-event/start', manualConfig);
      showToast('🌙 Night Event muvaffaqiyatli boshlandi!');
      fetchData();
    } catch (err) { showToast(err.response?.data?.message || 'Boshlashda xatolik', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleStop = async () => {
    if (!window.confirm("Night Eventni to'xtatmoqchimisiz?")) return;
    setActionLoading(true);
    try {
      await apiService.post('/admin/night-event/stop');
      showToast("Night Event to'xtatildi");
      fetchData();
    } catch (err) { showToast(err.response?.data?.message || "To'xtatishda xatolik", 'error'); }
    finally { setActionLoading(false); }
  };

  const isActive = status?.isActive;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={pageTitle}>Night Event boshqaruvi</h1>
          <p style={pageSubtitle}>Kechki maxsus hodisalarni boshqarish va rejalashtirish</p>
        </div>
        <button onClick={fetchData} className="btn-secondary">
          <RefreshCw size={14} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} /> Yangilash
        </button>
      </div>

      {/* Current status */}
      <div className="card" style={{ border: `2px solid ${isActive ? 'rgba(59,130,246,0.4)' : 'var(--c-border)'}`, background: isActive ? 'rgba(59,130,246,0.04)' : 'var(--c-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isActive ? 20 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ padding: 12, borderRadius: 12, background: isActive ? 'rgba(59,130,246,0.15)' : 'var(--c-panel)', display: 'flex' }}>
              {isActive ? <Moon size={24} style={{ color: 'var(--c-blue)' }} /> : <Sun size={24} style={{ color: 'var(--c-muted)' }} />}
            </div>
            <div>
              <h2 style={{ color: 'var(--c-text)', fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>
                {isActive ? '🌙 Night Event Faol' : '☀️ Oddiy Rejim'}
              </h2>
              <p style={{ color: 'var(--c-muted)', fontSize: 13, margin: 0 }}>
                {isActive ? (status?.name || 'Kechki maxsus rejim') : "Hech qanday aktiv event yo'q"}
              </p>
            </div>
          </div>
          {isActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 20, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: 'var(--c-blue)', fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-blue)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              Faol
            </div>
          )}
        </div>

        {isActive && status && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { icon: <Zap size={15} style={{ color: 'var(--c-yellow)' }} />, label: 'XP Multiplikator', value: <span style={{ color: 'var(--c-yellow)', fontWeight: 700, fontSize: 20 }}>{status.xpMultiplier || 2}x</span> },
              { icon: <Clock size={15} style={{ color: 'var(--c-blue)' }} />, label: 'Qolgan vaqt', value: <Countdown targetDate={status.endTime} /> },
              { icon: null, label: 'Boshlangan', value: <span style={{ color: 'var(--c-text)', fontSize: 13, fontWeight: 600 }}>{status.startTime ? new Date(status.startTime).toLocaleTimeString('uz-UZ') : '—'}</span> },
              { icon: null, label: 'Viloyat', value: <span style={{ color: 'var(--c-text)', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{status.region || 'Barcha'}</span> },
            ].map((item, i) => (
              <div key={i} style={{ background: 'var(--c-panel)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                {item.icon && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{item.icon}</div>}
                <div style={{ marginBottom: 4 }}>{item.value}</div>
                <div style={{ color: 'var(--c-muted)', fontSize: 11 }}>{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {isActive && (
          <button onClick={handleStop} disabled={actionLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--c-red)', padding: '9px 18px', borderRadius: 9, fontSize: 13, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1 }}
          >
            <Square size={14} /> {actionLoading ? "To'xtatilmoqda..." : "Eventni to'xtatish"}
          </button>
        )}
      </div>

      {/* Manual start panel */}
      {!isActive && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Play size={16} style={{ color: 'var(--c-blue)' }} />
            <span style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: 15 }}>Qo'lda Night Event boshlash</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Event nomi</label>
              <input type="text" style={inputStyle} value={manualConfig.name} onChange={(e) => setManualConfig((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Davomiylik (daqiqa)</label>
              <input type="number" min={10} max={480} style={inputStyle} value={manualConfig.duration} onChange={(e) => setManualConfig((p) => ({ ...p, duration: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={labelStyle}>XP Multiplikator</label>
              <select style={inputStyle} value={manualConfig.xpMultiplier} onChange={(e) => setManualConfig((p) => ({ ...p, xpMultiplier: Number(e.target.value) }))}>
                {[1.5, 2, 2.5, 3, 4, 5].map((v) => <option key={v} value={v}>{v}x XP</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Viloyat (ixtiyoriy)</label>
              <select style={inputStyle} value={manualConfig.region} onChange={(e) => setManualConfig((p) => ({ ...p, region: e.target.value }))}>
                <option value="">Barcha viloyatlar</option>
                {['tashkent', 'samarkand', 'bukhara', 'andijan', 'fergana', 'namangan'].map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--c-muted)', fontSize: 12 }}>
              {manualConfig.duration} daqiqa • {manualConfig.xpMultiplier}x XP • {manualConfig.region || 'Barcha viloyatlar'}
            </span>
            <button onClick={handleStart} disabled={actionLoading} className="btn-primary" style={{ opacity: actionLoading ? 0.6 : 1 }}>
              <Moon size={14} /> {actionLoading ? 'Boshlanmoqda...' : '🌙 Night Event boshlash'}
            </button>
          </div>
        </div>
      )}

      {/* Schedule */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Calendar size={16} style={{ color: 'var(--c-blue)' }} />
          <span style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: 14 }}>Avtomatik jadval</span>
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse" style={{ height: 64, borderRadius: 10 }} />
            ))}
          </div>
        ) : schedule.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-muted)' }}>
            <Calendar size={28} style={{ display: 'block', margin: '0 auto 10px' }} />
            Jadval ma'lumotlari mavjud emas
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {schedule.map((item, idx) => <ScheduleItem key={item.id || idx} item={item} index={idx} />)}
          </div>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
