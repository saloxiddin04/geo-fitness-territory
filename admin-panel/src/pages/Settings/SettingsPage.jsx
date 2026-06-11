import { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import apiService from '../../services/api.service';
import { pageTitle, pageSubtitle, Toast } from '../../components/ui/shared.jsx';

const SETTING_GROUPS = [
  {
    key: 'game', label: "O'yin sozlamalari", icon: '🎮', description: "Asosiy o'yin parametrlari",
    settings: [
      { key: 'BASE_CAPTURE_XP', label: 'Asosiy capture XP', type: 'number', min: 1, max: 1000, hint: 'Hudud egallaganda beriladigan XP' },
      { key: 'BASE_EXPLORE_XP', label: 'Asosiy explore XP', type: 'number', min: 1, max: 500, hint: 'Yangi hudud kashf etganda XP' },
      { key: 'ATTACK_COST_XP', label: 'Hujum narxi (XP)', type: 'number', min: 0, max: 500, hint: 'Hujum qilish uchun sarflanadigan XP' },
      { key: 'MAX_TERRITORY_DEFENSE', label: 'Max himoya darajasi', type: 'number', min: 1, max: 20, hint: 'Hududning maksimal himoya darajasi' },
      { key: 'TERRITORY_EXPIRE_HOURS', label: 'Hudud muddati (soat)', type: 'number', min: 1, max: 720, hint: "Faolsiz hudud necha soatdan keyin o'chadi" },
    ],
  },
  {
    key: 'multiplier', label: 'Multiplikatorlar', icon: '⚡', description: 'XP va bonus multiplikatorlar',
    settings: [
      { key: 'NIGHT_EVENT_XP_MULTIPLIER', label: 'Night Event XP x', type: 'number', min: 1, max: 10, step: 0.5, hint: 'Night Event paytida XP multiplikatori' },
      { key: 'STREAK_BONUS_MULTIPLIER', label: 'Streak bonus x', type: 'number', min: 1, max: 5, step: 0.1, hint: 'Ketma-ket yugurish bonusi' },
      { key: 'FIRST_CAPTURE_BONUS', label: 'Birinchi egallash bonusi', type: 'number', min: 1, max: 1000, hint: 'Hududni birinchi marta egallaganda bonus XP' },
    ],
  },
  {
    key: 'gps', label: 'GPS sozlamalari', icon: '📍', description: 'GPS va masofa parametrlari',
    settings: [
      { key: 'MIN_GPS_ACCURACY', label: 'Min GPS aniqligi (m)', type: 'number', min: 5, max: 100, hint: 'Mininal qabul qilinadigan GPS aniqligi' },
      { key: 'MAX_SPEED_KMH', label: 'Max tezlik (km/h)', type: 'number', min: 10, max: 100, hint: "Bu tezlikdan yuqori bo'lsa shubhali belgilanadi" },
      { key: 'MIN_SESSION_DISTANCE', label: 'Min sessiya masofasi (m)', type: 'number', min: 10, max: 1000, hint: 'Saqlanadigan minimal sessiya masofasi' },
      { key: 'GPS_UPDATE_INTERVAL_SEC', label: 'GPS yangilanish (sek)', type: 'number', min: 1, max: 30, hint: "GPS koordinata yangilanish oralig'i" },
    ],
  },
  {
    key: 'leaderboard', label: 'Reyting sozlamalari', icon: '🏆', description: 'Leaderboard va haftalik reset',
    settings: [
      { key: 'LEADERBOARD_CACHE_TTL', label: 'Cache TTL (sek)', type: 'number', min: 60, max: 3600, hint: 'Leaderboard cache muddati' },
      { key: 'WEEKLY_RESET_DAY', label: 'Haftalik reset kuni', type: 'select', options: [
        { value: '0', label: 'Yakshanba' }, { value: '1', label: 'Dushanba' },
        { value: '5', label: 'Juma' }, { value: '6', label: 'Shanba' },
      ], hint: "Haftalik reyting qachon reset bo'ladi" },
    ],
  },
];

const inputStyle = {
  width: '100%', background: 'var(--c-panel)', border: '1px solid var(--c-border2)',
  borderRadius: 8, color: 'var(--c-text)', padding: '8px 12px', fontSize: 13, outline: 'none',
};

function SettingInput({ setting, value, onChange }) {
  if (setting.type === 'select') {
    return (
      <select style={inputStyle} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {setting.options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    );
  }
  if (setting.type === 'boolean') {
    return (
      <button
        onClick={() => onChange(!value)}
        style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: value ? 'var(--c-blue)' : 'var(--c-border2)', transition: 'background 0.2s' }}
      >
        <span style={{ position: 'absolute', left: value ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </button>
    );
  }
  return (
    <input type="number" min={setting.min} max={setting.max} step={setting.step || 1} value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))} style={inputStyle} />
  );
}

function SettingGroup({ group, values, onChange }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.1s' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>{group.icon}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: 14 }}>{group.label}</div>
            <div style={{ color: 'var(--c-muted)', fontSize: 12, marginTop: 2 }}>{group.description}</div>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} style={{ color: 'var(--c-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--c-muted)' }} />}
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--c-border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {group.settings.map((setting) => (
            <div key={setting.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={{ display: 'block', color: 'var(--c-text)', fontWeight: 500, fontSize: 13, marginBottom: 2 }}>{setting.label}</label>
                {setting.hint && <p style={{ color: 'var(--c-muted)', fontSize: 11, margin: 0 }}>{setting.hint}</p>}
              </div>
              <div style={{ width: 180, flexShrink: 0 }}>
                <SettingInput setting={setting} value={values[setting.key]} onChange={(val) => onChange(setting.key, val)} />
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

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/admin/settings');
      const map = {};
      (res.data.data.settings || []).forEach((s) => {
        const num = Number(s.value);
        map[s.key] = isNaN(num) ? s.value : num;
      });
      setValues(map); setOriginalValues(map);
    } catch { showToast('Sozlamalarni yuklashda xatolik', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleChange = (key, val) => setValues((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    const changed = Object.entries(values).filter(([k, v]) => v !== originalValues[k]);
    if (changed.length === 0) { showToast("O'zgarish yo'q", 'info'); return; }
    setSaving(true);
    try {
      await apiService.put('/admin/settings', { settings: changed.map(([key, value]) => ({ key, value: String(value) })) });
      setOriginalValues({ ...values });
      showToast(`${changed.length} ta sozlama saqlandi`);
    } catch { showToast('Saqlashda xatolik', 'error'); }
    finally { setSaving(false); }
  };

  const changedCount = Object.keys(values).filter((k) => values[k] !== originalValues[k]).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={pageTitle}>Tizim sozlamalari</h1>
          <p style={pageSubtitle}>O'yin parametrlari va tizim konfiguratsiyasi</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {changedCount > 0 && (
            <button onClick={() => setValues({ ...originalValues })} className="btn-secondary">
              <RefreshCw size={14} /> Bekor qilish
            </button>
          )}
          <button onClick={handleSave} disabled={saving || changedCount === 0} className="btn-primary" style={{ opacity: (saving || changedCount === 0) ? 0.5 : 1, cursor: (saving || changedCount === 0) ? 'not-allowed' : 'pointer' }}>
            <Save size={14} />
            {saving ? 'Saqlanmoqda...' : changedCount > 0 ? `${changedCount} ta saqlash` : 'Saqlash'}
          </button>
        </div>
      </div>

      {/* Unsaved warning */}
      {changedCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 16px' }}>
          <AlertTriangle size={15} style={{ color: 'var(--c-yellow)', flexShrink: 0 }} />
          <p style={{ color: '#fde68a', fontSize: 13, margin: 0 }}>{changedCount} ta sozlama o'zgartirildi. Saqlash tugmasini bosing.</p>
        </div>
      )}

      {/* Setting groups */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse card" style={{ height: 60 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SETTING_GROUPS.map((group) => (
            <SettingGroup key={group.key} group={group} values={values} onChange={handleChange} />
          ))}
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}
