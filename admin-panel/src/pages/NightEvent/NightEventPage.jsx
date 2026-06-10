import { useState, useEffect } from 'react';
import { Moon, Sun, Play, Square, Clock, Zap, Calendar, RefreshCw } from 'lucide-react';
import apiService from '../../services/api.service';
import socketService from '../../services/socket.service';

// Vaqt formatlash
function formatTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('uz-UZ');
}

// Countdown komponenti
function Countdown({ targetDate, label }) {
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

  return (
    <div className="text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-mono font-bold text-white">{remaining || '—'}</div>
    </div>
  );
}

// Jadval elementi
function ScheduleItem({ item, index }) {
  const isPast = new Date(item.endTime) < Date.now();
  const isActive = new Date(item.startTime) <= Date.now() && new Date(item.endTime) >= Date.now();

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
      isActive
        ? 'bg-blue-500/10 border-blue-500/30'
        : isPast
        ? 'bg-dark-700/30 border-dark-600/50 opacity-50'
        : 'bg-dark-700/50 border-dark-600'
    }`}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-dark-600 text-gray-300 shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-white">{item.name || `Night Event #${index + 1}`}</span>
          {isActive && <span className="badge badge-success text-xs">Faol</span>}
          {isPast && <span className="text-xs text-gray-500">Tugagan</span>}
        </div>
        <div className="text-xs text-gray-500">
          {formatTime(item.startTime)} — {formatTime(item.endTime)}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-yellow-400 font-medium">{item.xpMultiplier || 2}x XP</div>
        <div className="text-xs text-gray-500">{item.region || 'Barcha viloyatlar'}</div>
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

  // Manual event sozlamalari
  const [manualConfig, setManualConfig] = useState({
    duration: 60,       // daqiqa
    xpMultiplier: 2,
    region: '',
    name: 'Qo\'lda event',
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Status va jadval yuklash
  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, scheduleRes] = await Promise.all([
        apiService.get('/admin/night-event/status'),
        apiService.get('/admin/night-event/schedule'),
      ]);
      setStatus(statusRes.data.data);
      setSchedule(scheduleRes.data.data?.schedule || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Socket orqali real-time yangilanish
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('night_event_started', (data) => {
        setStatus((prev) => ({ ...prev, isActive: true, ...data }));
        showToast('🌙 Night Event boshlandi!');
      });
      socket.on('night_event_ended', () => {
        setStatus((prev) => ({ ...prev, isActive: false }));
        showToast('Night Event tugadi');
      });
    }

    return () => {
      if (socket) {
        socket.off('night_event_started');
        socket.off('night_event_ended');
      }
    };
  }, []);

  // Eventni qo'lda boshlash
  const handleStart = async () => {
    setActionLoading(true);
    try {
      await apiService.post('/admin/night-event/start', manualConfig);
      showToast('🌙 Night Event muvaffaqiyatli boshlandi!');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Boshlashda xatolik', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Eventni to'xtatish
  const handleStop = async () => {
    if (!window.confirm('Night Eventni to\'xtatmoqchimisiz?')) return;
    setActionLoading(true);
    try {
      await apiService.post('/admin/night-event/stop');
      showToast('Night Event to\'xtatildi');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'To\'xtatishda xatolik', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const isActive = status?.isActive;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Night Event boshqaruvi</h1>
          <p className="text-gray-400 text-sm mt-1">Kechki maxsus hodisalarni boshqarish va rejalashtirish</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 btn-secondary">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Yangilash
        </button>
      </div>

      {/* Joriy holat */}
      <div className={`card border-2 transition-all ${
        isActive ? 'border-blue-500/50 bg-blue-500/5' : 'border-dark-600'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isActive ? 'bg-blue-500/20' : 'bg-dark-700'}`}>
              {isActive ? (
                <Moon size={24} className="text-blue-400" />
              ) : (
                <Sun size={24} className="text-gray-400" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isActive ? '🌙 Night Event Faol' : '☀️ Oddiy Rejim'}
              </h2>
              <p className="text-sm text-gray-400">
                {isActive ? status?.name || 'Kechki maxsus rejim' : 'Hech qanday aktiv event yo\'q'}
              </p>
            </div>
          </div>

          {isActive && (
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5`}>
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Faol
            </div>
          )}
        </div>

        {/* Aktiv event tafsilotlari */}
        {isActive && status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-dark-800 rounded-lg p-3 text-center">
              <Zap size={16} className="text-yellow-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-yellow-400">{status.xpMultiplier || 2}x</div>
              <div className="text-xs text-gray-500">XP Multiplikator</div>
            </div>
            <div className="bg-dark-800 rounded-lg p-3 text-center">
              <Clock size={16} className="text-blue-400 mx-auto mb-1" />
              <Countdown targetDate={status.endTime} label="Qolgan vaqt" />
            </div>
            <div className="bg-dark-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Boshlangan</div>
              <div className="text-sm font-medium text-white">
                {status.startTime ? new Date(status.startTime).toLocaleTimeString('uz-UZ') : '—'}
              </div>
            </div>
            <div className="bg-dark-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Viloyat</div>
              <div className="text-sm font-medium text-white capitalize">
                {status.region || 'Barcha'}
              </div>
            </div>
          </div>
        )}

        {/* Amallar */}
        <div className="flex gap-3">
          {isActive ? (
            <button
              onClick={handleStop}
              disabled={actionLoading}
              className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <Square size={15} />
              {actionLoading ? 'To\'xtatilmoqda...' : 'Eventni to\'xtatish'}
            </button>
          ) : null}
        </div>
      </div>

      {/* Qo'lda boshlash paneli */}
      {!isActive && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Play size={18} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Qo'lda Night Event boshlash</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Event nomi</label>
              <input
                type="text"
                value={manualConfig.name}
                onChange={(e) => setManualConfig((p) => ({ ...p, name: e.target.value }))}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Davomiylik (daqiqa)</label>
              <input
                type="number"
                min={10}
                max={480}
                value={manualConfig.duration}
                onChange={(e) => setManualConfig((p) => ({ ...p, duration: Number(e.target.value) }))}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">XP Multiplikator</label>
              <select
                value={manualConfig.xpMultiplier}
                onChange={(e) => setManualConfig((p) => ({ ...p, xpMultiplier: Number(e.target.value) }))}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {[1.5, 2, 2.5, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>{v}x XP</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Viloyat (ixtiyoriy)</label>
              <select
                value={manualConfig.region}
                onChange={(e) => setManualConfig((p) => ({ ...p, region: e.target.value }))}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Barcha viloyatlar</option>
                <option value="tashkent">Toshkent</option>
                <option value="samarkand">Samarqand</option>
                <option value="bukhara">Buxoro</option>
                <option value="andijan">Andijon</option>
                <option value="fergana">Farg'ona</option>
                <option value="namangan">Namangan</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-500">
              {manualConfig.duration} daqiqa • {manualConfig.xpMultiplier}x XP •{' '}
              {manualConfig.region || 'Barcha viloyatlar'}
            </div>
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="flex items-center gap-2 btn-primary disabled:opacity-50"
            >
              <Moon size={15} />
              {actionLoading ? 'Boshlanmoqda...' : '🌙 Night Event boshlash'}
            </button>
          </div>
        </div>
      )}

      {/* Jadval */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-blue-400" />
          <h3 className="font-semibold text-white">Avtomatik jadval</h3>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-16 bg-dark-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : schedule.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar size={28} className="mx-auto mb-2 text-gray-600" />
            Jadval ma'lumotlari mavjud emas
          </div>
        ) : (
          <div className="space-y-3">
            {schedule.map((item, idx) => (
              <ScheduleItem key={item.id || idx} item={item} index={idx} />
            ))}
          </div>
        )}
      </div>

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
