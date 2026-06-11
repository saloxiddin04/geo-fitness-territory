// Shared UI primitives used across admin pages

export const pageTitle = { color: 'var(--c-text)', fontSize: 22, fontWeight: 700, margin: 0 };
export const pageSubtitle = { color: 'var(--c-text2)', fontSize: 13, margin: '4px 0 0' };

export const searchInput = {
  width: '100%',
  background: 'var(--c-panel)',
  border: '1px solid var(--c-border2)',
  borderRadius: 8,
  color: 'var(--c-text)',
  padding: '8px 12px',
  fontSize: 13,
  outline: 'none',
};

export const selectInput = {
  background: 'var(--c-panel)',
  border: '1px solid var(--c-border2)',
  borderRadius: 8,
  color: 'var(--c-text)',
  padding: '8px 12px',
  fontSize: 13,
  outline: 'none',
};

export const pageBtn = {
  padding: '7px 16px',
  borderRadius: 8,
  border: '1px solid var(--c-border2)',
  background: 'var(--c-panel)',
  color: 'var(--c-text2)',
  cursor: 'pointer',
  fontSize: 13,
};

export function Toast({ msg, type }) {
  const bg = type === 'error' ? 'var(--c-red)' : type === 'info' ? 'var(--c-blue)' : 'var(--c-green)';
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      background: bg, color: '#fff',
      padding: '12px 20px', borderRadius: 10,
      fontSize: 13, fontWeight: 600,
      boxShadow: '0 8px 25px rgba(0,0,0,0.35)',
      zIndex: 100, animation: 'toastIn 0.25s ease',
    }}>
      {msg}
      <style>{`@keyframes toastIn { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

export function Modal({ title, onClose, children, danger, maxWidth = 460 }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 60, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--c-surface)',
          border: `1px solid ${danger ? 'rgba(239,68,68,0.3)' : 'var(--c-border2)'}`,
          borderRadius: 14,
          width: '100%', maxWidth,
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--c-border)',
        }}>
          <h3 style={{ color: 'var(--c-text)', fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--c-text2)', padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center',
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, message }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <Icon size={36} style={{ color: 'var(--c-muted)', margin: '0 auto 12px', display: 'block' }} />
      <div style={{ color: 'var(--c-text2)', fontSize: 14 }}>{message}</div>
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 6 }) {
  return (
    <>
      {Array(rows).fill(0).map((_, i) => (
        <tr key={i} style={{ borderBottom: '1px solid var(--c-border)' }}>
          {Array(cols).fill(0).map((_, j) => (
            <td key={j} style={{ padding: '12px 16px' }}>
              <div className="animate-pulse" style={{ height: 14, borderRadius: 4, width: j === 0 ? '60%' : '80%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export const TABLE_HEADER_STYLE = {
  textAlign: 'left', fontSize: 11, fontWeight: 600,
  color: 'var(--c-muted)', padding: '10px 16px',
  letterSpacing: '0.05em', textTransform: 'uppercase',
  borderBottom: '1px solid var(--c-border)',
  whiteSpace: 'nowrap',
};

export const TABLE_ROW_STYLE = {
  borderBottom: '1px solid var(--c-border)',
  transition: 'background 0.1s',
};

export const TD = { padding: '12px 16px', fontSize: 13, color: 'var(--c-text2)', verticalAlign: 'middle' };
