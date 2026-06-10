import { useState, useEffect, useCallback } from 'react';
import { MapPin, RotateCcw, Search, Filter, Eye, Trash2, AlertTriangle } from 'lucide-react';
import apiService from '../../services/api.service';

// Hudud rangi - egallab olingan hududlar rangini belgilash
const REGION_COLORS = {
  tashkent: '#3B82F6',
  samarkand: '#10B981',
  bukhara: '#F59E0B',
  andijan: '#EF4444',
  fergana: '#8B5CF6',
  namangan: '#EC4899',
  default: '#6B7280',
};

// Viloyatlar ro'yxati
const UZBEKISTAN_REGIONS = [
  { value: '', label: 'Barcha viloyatlar' },
  { value: 'tashkent', label: 'Toshkent' },
  { value: 'samarkand', label: 'Samarqand' },
  { value: 'bukhara', label: 'Buxoro' },
  { value: 'andijan', label: 'Andijon' },
  { value: 'fergana', label: 'Farg\'ona' },
  { value: 'namangan', label: 'Namangan' },
  { value: 'kashkadarya', label: 'Qashqadaryo' },
  { value: 'surkhandarya', label: 'Surxondaryo' },
  { value: 'jizzakh', label: 'Jizzax' },
  { value: 'syrdarya', label: 'Sirdaryo' },
  { value: 'navoi', label: 'Navoiy' },
  { value: 'khorezm', label: 'Xorazm' },
  { value: 'karakalpakstan', label: 'Qoraqalpog\'iston' },
];

// Hudud kartasi komponenti
function TerritoryCard({ territory, onReset, onView }) {
  const regionColor = REGION_COLORS[territory.region] || REGION_COLORS.default;

  return (
    <div className="card hover:border-blue-500/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: regionColor }}
          />
          <span className="text-xs text-gray-400 font-mono">{territory.h3Index}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onView(territory)}
            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
            title="Ko'rish"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => onReset(territory)}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="Reset qilish"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-white truncate">
            {territory.ownerUsername || 'Egallanmagan'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-dark-800 rounded p-2">
            <div className="text-gray-500 mb-0.5">Viloyat</div>
            <div className="text-gray-300 capitalize">{territory.region || '—'}</div>
          </div>
          <div className="bg-dark-800 rounded p-2">
            <div className="text-gray-500 mb-0.5">Himoya</div>
            <div className="text-gray-300">{territory.defenseLevel || 0} / 10</div>
          </div>
          <div className="bg-dark-800 rounded p-2">
            <div className="text-gray-500 mb-0.5">Hujumlar</div>
            <div className="text-yellow-400">{territory.attackCount || 0}</div>
          </div>
          <div className="bg-dark-800 rounded p-2">
            <div className="text-gray-500 mb-0.5">CP</div>
            <div className="text-blue-400">{territory.controlPoints || 0}</div>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Egallangan: {territory.capturedAt
            ? new Date(territory.capturedAt).toLocaleDateString('uz-UZ')
            : '—'}
        </div>
      </div>
    </div>
  );
}

// Hudud detali modali
function TerritoryDetailModal({ territory, onClose }) {
  if (!territory) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 border border-dark-600 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-dark-600">
          <h3 className="text-lg font-semibold text-white">Hudud tafsilotlari</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'H3 Index', value: territory.h3Index, mono: true },
              { label: 'Viloyat', value: territory.region || '—' },
              { label: 'Egasi', value: territory.ownerUsername || 'Yo\'q' },
              { label: 'Egasi ID', value: territory.ownerId || '—', mono: true },
              { label: 'Himoya darajasi', value: territory.defenseLevel || 0 },
              { label: 'Control Points', value: territory.controlPoints || 0 },
              { label: 'Hujumlar soni', value: territory.attackCount || 0 },
              { label: 'Muvaffaqiyatli himoya', value: territory.successfulDefenses || 0 },
            ].map((item) => (
              <div key={item.label} className="bg-dark-700 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <div className={`text-sm text-white ${item.mono ? 'font-mono text-xs' : ''}`}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          {territory.capturedAt && (
            <div className="bg-dark-700 rounded p-3">
              <div className="text-xs text-gray-500 mb-1">Egallangan vaqt</div>
              <div className="text-sm text-white">
                {new Date(territory.capturedAt).toLocaleString('uz-UZ')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Reset tasdiqlash modali
function ResetConfirmModal({ territory, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  if (!territory) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 border border-red-500/30 rounded-xl w-full max-w-sm">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="text-red-400" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white">Hududni reset qilish</h3>
          </div>
          <p className="text-gray-400 text-sm mb-2">
            <span className="font-mono text-gray-300">{territory.h3Index}</span> hududini
            reset qilmoqchimisiz?
          </p>
          <p className="text-red-400 text-xs mb-5">
            ⚠️ Bu amal qaytarib bo'lmaydi. Hudud egalik ma'lumotlari o'chiriladi.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 btn-secondary text-sm py-2">
              Bekor qilish
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors"
            >
              {loading ? 'Jarayonda...' : 'Reset qilish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [viewTerritory, setViewTerritory] = useState(null);
  const [resetTerritory, setResetTerritory] = useState(null);
  const [resetAllLoading, setResetAllLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const limit = 12;

  // Xabar ko'rsatish
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Hududlarni yuklash
  const fetchTerritories = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (region) params.region = region;

      const res = await apiService.get('/admin/territories', { params });
      setTerritories(res.data.data.territories || []);
      setTotal(res.data.data.total || 0);
    } catch {
      showToast('Hududlarni yuklashda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, region]);

  // Statistikalarni yuklash
  const fetchStats = async () => {
    try {
      const res = await apiService.get('/admin/territories/stats');
      setStats(res.data.data);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchTerritories();
  }, [fetchTerritories]);

  useEffect(() => {
    fetchStats();
  }, []);

  // Bitta hududni reset qilish
  const handleReset = async () => {
    try {
      await apiService.post(`/admin/territories/${resetTerritory.id}/reset`);
      showToast('Hudud muvaffaqiyatli reset qilindi');
      setResetTerritory(null);
      fetchTerritories();
      fetchStats();
    } catch {
      showToast('Reset qilishda xatolik', 'error');
    }
  };

  // Barcha hududlarni reset qilish
  const handleResetAll = async () => {
    if (!window.confirm('Barcha hududlarni reset qilmoqchimisiz? Bu amalni qaytarib bo\'lmaydi!')) return;
    setResetAllLoading(true);
    try {
      await apiService.post('/admin/territories/reset-all');
      showToast('Barcha hududlar reset qilindi');
      fetchTerritories();
      fetchStats();
    } catch {
      showToast('Reset qilishda xatolik', 'error');
    } finally {
      setResetAllLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hududlar boshqaruvi</h1>
          <p className="text-gray-400 text-sm mt-1">H3 Grid asosidagi hududlarni kuzatish va boshqarish</p>
        </div>
        <button
          onClick={handleResetAll}
          disabled={resetAllLoading}
          className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          <Trash2 size={16} />
          {resetAllLoading ? 'Jarayonda...' : 'Barchani reset qilish'}
        </button>
      </div>

      {/* Statistika kartalar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Jami hududlar', value: stats.total?.toLocaleString() || 0, color: 'text-white' },
            { label: 'Egallangan', value: stats.captured?.toLocaleString() || 0, color: 'text-blue-400' },
            { label: 'Bugun egallangan', value: stats.capturedToday || 0, color: 'text-green-400' },
            { label: 'Hujumlar bugun', value: stats.attacksToday || 0, color: 'text-yellow-400' },
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
              placeholder="H3 index yoki foydalanuvchi nomi..."
              className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={region}
              onChange={(e) => { setRegion(e.target.value); setPage(1); }}
              className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {UZBEKISTAN_REGIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Hududlar ro'yxati */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-dark-600 rounded mb-3 w-3/4" />
              <div className="h-3 bg-dark-600 rounded mb-2" />
              <div className="grid grid-cols-2 gap-2">
                {Array(4).fill(0).map((_, j) => (
                  <div key={j} className="h-12 bg-dark-600 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : territories.length === 0 ? (
        <div className="card text-center py-12">
          <MapPin size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Hududlar topilmadi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {territories.map((t) => (
            <TerritoryCard
              key={t.id}
              territory={t}
              onReset={setResetTerritory}
              onView={setViewTerritory}
            />
          ))}
        </div>
      )}

      {/* Sahifalash */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Jami: <span className="text-white">{total}</span> ta hudud
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm bg-dark-700 border border-dark-600 rounded-lg text-gray-300 disabled:opacity-40 hover:border-blue-500/50 transition-colors"
            >
              ← Oldingi
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-400">
              {page} / {totalPages}
            </span>
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

      {/* Modallar */}
      <TerritoryDetailModal territory={viewTerritory} onClose={() => setViewTerritory(null)} />
      <ResetConfirmModal
        territory={resetTerritory}
        onConfirm={handleReset}
        onClose={() => setResetTerritory(null)}
      />

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
