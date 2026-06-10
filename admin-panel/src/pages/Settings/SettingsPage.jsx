import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import apiService from '../../services/api.service';

// Sozlamalar guruhlari
const SETTING_GROUPS = [
  {
    key: 'game',
    label: '🎮 O\'yin sozlamalari',
    icon: '🎮',
    description: 'Asosiy o\'yin parametrlari',
    settings: [
      { key: 'BASE_CAPTURE_XP', label: 'Asosiy capture XP', type: 'number', min: 1, max: 1000, hint: 'Hudud egallaganda beriladigan XP' },
      { key: 'BASE_EXPLORE_XP', label: 'Asosiy explore XP', type: 'number', min: 1, max: 500, hint: 'Yangi hudud kashf etganda XP' },
      { key: 'ATTACK_COST_XP', label: 'Hujum narxi (XP)', type: 'number', min: 0, max: 500, hint: 'Hujum qilish uchun sarflanadigan XP' },
      { key: 'MAX_TERRITORY_DEFENSE', label: 'Max himoya darajasi', type: 'number', min: 1, max: 20, hint: 'Hududning maksimal himoya darajasi' },
      { key: 'TERRITORY_EXPIRE_HOURS', label: 'Hudud muddati (soat)', type: 'number', min: 1, max: 720, hint: 'Faolsiz hudud necha soatdan keyin o\'chadi' },
    ],
  },
  {
    key: 'multiplier',
    label: '⚡ Multiplikatorlar',
    icon: '⚡',
    description: 'XP va bonus multiplikatorlar',
    settings: [
      { key: 'NIGHT_EVENT_XP_MULTIPLIER', label: 'Night Event XP x', type: 'number', min: 1, max: 10, step: 0.5, hint: 'Night Event paytida XP multiplikatori' },
      { key: 'STREAK_BONUS_MULTIPLIER', label: 'Streak bonus x', type: 'number', min: 1, max: 5, step: 0.1, hint: 'Ketma-ket yugurish bonusi' },
      { key: 'FIRST_CAPTURE_BONUS', label: 'Birinchi egallash bonusi', type: 'number', min: 1, max: 1000, hint: 'Hududni birinchi marta egallaganda bonus XP' },
    ],
  },
  {
    key: 'gps',
    label: '📍 GPS sozlamalari',
    icon: '📍',
    description: 'GPS va masofa parametrlari',
    settings: [
      { key: 'MIN_GPS_ACCURACY', label: 'Min GPS aniqligi (m)', type: 'number', min: 5, max: 100, hint: 'Mininal qabul qilinadigan GPS aniqligi' },
      { key: 'MAX_SPEED_KMH', label: 'Max tezlik (km/h)', type: 'number', min: 10, max: 100, hint: 'Bu tezlikdan yuqori bo\'lsa shubhali belgilanadi' },
      { key: 'MIN_SESSION_DISTANCE', label: 'Min sessiya masofasi (m)', type: 'number', min: 10, max: 1000, hint: 'Saqlanadigan minimal sessiya masofasi' },
      { key: 'GPS_UPDATE_INTERVAL_SEC', label: 'GPS yangilanish (sek)', type: 'number', min: 1, max: 30, hint: 'GPS koordinata yangilanish oralig\'i' },
    ],
  },
  {
    key: 'leaderboard',
    label: '🏆 Reyting sozlamalari',
    icon: '🏆',
    description: 'Leaderboard va haftalik reset',
    settings: [
      { key: 'LEADERBOARD_CACHE_TTL', label: 'Cache TTL (sek)', type: 'number', min: 60, max: 3600, hint: 'Leaderboard cache muddati' },
      { key: 'WEEKLY_RESET_DAY', label: 'Haftalik reset kuni', type: 'select', options: [
        { value: '0', label: 'Yakshanba' },
        { value: '1', label: 'Dushanba' },
        { value: '5', label: 'Juma' },
        { value: '6', label: 'Shanba' },
      ], hint: 'Haftalik reyting qachon reset bo\'ladi' },
    ],
  },
];

// Bitta sozlama inputi
function SettingInput({ setting, value, onChange }) {
  if (setting.type === 'select') {
    return (
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
      >
        {setting.options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (setting.type === 'boolean') {
    return (
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${
          value ? 'bg-blue-600' : 'bg-dark-600'
        }`}
      >
        <span className={`inline-block w-4 h-4 rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    );
  }

  return (
    <input
      type="number"
      min={setting.min}
      max={setting.max}
      step={setting.step || 1}
      value={value ?? ''}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
    />
  );
}

// Sozlamalar guruhi komponenti
function SettingGroup({ group, values, onChange }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="card overflow-hidden p-0">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-dark-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{group.icon}</span>
          <div className="text-left">
            <div className="font-semibold text-white">{group.label}</div>
            <div className="text-xs text-gray-500">{group.description}</div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-gray-400" />
        ) : (
          <ChevronDown size={18} className="text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-dark-600 pt-4 space-y-4">
          {group.settings.map((setting) => (
            <div key={setting.key} className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-white mb-0.5">{setting.label}</label>
                {setting.hint && (
                  <p className="text-xs text-gray-500 mb-2">{setting.hint}</p>
                )}
              </div>
              <div className="w-48 shrink-0">
                <SettingInput
                  setting={setting}
                  value={values[setting.key]}
                  onChange={(val) => onChange(setting.key, val)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [values, setValues] = useState({});
  const [originalValues, setOriginalValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sozlamalarni yuklash
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/admin/settings');
      const map = {};
      (res.data.data.settings || []).forEach((s) => {
        // Raqam bo'lsa parse qilish
        const num = Number(s.value);
        map[s.key] = isNaN(num) ? s.value : num;
      });
      setValues(map);
      setOriginalValues(map);
    } catch {
      showToast('Sozlamalarni yuklashda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key, val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  // Saqlash
  const handleSave = async () => {
    // O'zgargan sozlamalarni topish
    const changed = Object.entries(values).filter(([k, v]) => v !== originalValues[k]);
    if (changed.length === 0) {
      showToast('O\'zgarish yo\'q', 'info');
      return;
    }

    setSaving(true);
    try {
      await apiService.put('/admin/settings', {
        settings: changed.map(([key, value]) => ({ key, value: String(value) })),
      });
      setOriginalValues({ ...values });
      showToast(`${changed.length} ta sozlama saqlandi`);
    } catch {
      showToast('Saqlashda xatolik', 'error');
    } finally {
      setSaving(false);
    }
  };

  // O'zgarishlarni bekor qilish
  const handleReset = () => {
    setValues({ ...originalValues });
  };

  // O'zgargan sozlamalar soni
  const changedCount = Object.keys(values).filter((k) => values[k] !== originalValues[k]).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tizim sozlamalari</h1>
          <p className="text-gray-400 text-sm mt-1">O'yin parametrlari va tizim konfiguratsiyasi</p>
        </div>
        <div className="flex items-center gap-3">
          {changedCount > 0 && (
            <button onClick={handleReset} className="flex items-center gap-2 btn-secondary text-sm">
              <RefreshCw size={14} />
              Bekor qilish
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || changedCount === 0}
            className="flex items-center gap-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={15} />
            {saving ? 'Saqlanmoqda...' : changedCount > 0 ? `${changedCount} ta saqlash` : 'Saqlash'}
          </button>
        </div>
      </div>

      {/* O'zgarishlar ogohlantirish */}
      {changedCount > 0 && (
        <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-300">
            {changedCount} ta sozlama o'zgartirildi. Saqlash tugmasini bosing.
          </p>
        </div>
      )}

      {/* Sozlama guruhlari */}
      {loading ? (
        <div className="space-y-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-48 bg-dark-800 border border-dark-600 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {SETTING_GROUPS.map((group) => (
            <SettingGroup
              key={group.key}
              group={group}
              values={values}
              onChange={handleChange}
            />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-medium shadow-xl z-50 ${
          toast.type === 'error'
            ? 'bg-red-600 text-white'
            : toast.type === 'info'
            ? 'bg-blue-600 text-white'
            : 'bg-green-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
