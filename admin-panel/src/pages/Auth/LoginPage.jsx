import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { adminLogin, clearError } from '../../store/slices/adminAuthSlice';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error } = useSelector((s) => s.adminAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(clearError());
    dispatch(adminLogin({ email, password }));
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--c-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow effects */}
      <div style={{
        position: 'absolute',
        width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
        top: '10%', left: '20%',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)',
        bottom: '10%', right: '20%',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        borderRadius: 16,
        padding: 40,
        position: 'relative',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: 16,
            display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
            boxShadow: '0 0 30px rgba(59,130,246,0.3)',
          }}>
            <span style={{ color: '#fff', fontSize: 24, fontWeight: 800 }}>GF</span>
          </div>
          <h1 style={{ color: 'var(--c-text)', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
            Geo Fitness Admin
          </h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13, margin: 0 }}>
            Admin paneliga kirish
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            color: 'var(--c-red)',
            fontSize: 13,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div>
            <label style={{
              display: 'block',
              color: 'var(--c-text2)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              Email
            </label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@geofitness.uz"
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block',
              color: 'var(--c-text2)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              Parol
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--c-muted)',
                  display: 'flex', alignItems: 'center',
                  padding: 0,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--c-text2)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--c-muted)'}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: 8,
              background: isLoading ? 'rgba(59,130,246,0.5)' : 'var(--c-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '12px',
              fontSize: 14,
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'opacity 0.15s',
              boxShadow: isLoading ? 'none' : '0 4px 15px rgba(59,130,246,0.3)',
            }}
          >
            {isLoading ? (
              <>
                <span style={{
                  width: 16, height: 16,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Kirilmoqda...
              </>
            ) : (
              <>
                <LogIn size={16} />
                Kirish
              </>
            )}
          </button>
        </form>

        {/* Hint */}
        <div style={{
          marginTop: 24,
          padding: '12px 14px',
          background: 'rgba(59,130,246,0.06)',
          border: '1px solid rgba(59,130,246,0.15)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--c-muted)',
          lineHeight: 1.6,
        }}>
          📧 admin@geofitness.uz<br />
          🔑 Admin@123456
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
