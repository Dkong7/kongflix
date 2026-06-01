import { useState, useEffect } from 'react';
import { pb } from '../services/pb';
import { Eye, EyeOff, LogIn, AlertCircle, Film, Music2, BookOpen, Gamepad2, Mic2 } from 'lucide-react';

const ICONS = [Film, Music2, BookOpen, Gamepad2, Mic2, Film, Music2, BookOpen];

export default function Home({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [focused, setFocused]   = useState(null);

  // Si ya hay sesión activa, login automático
  useEffect(() => {
    if (pb.authStore.isValid) {
      onLogin(pb.authStore.model);
    }
  }, [onLogin]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Completa todos los campos.'); return; }
    setLoading(true);
    setError('');
    try {
      const auth = await pb.collection('users').authWithPassword(email.trim(), password.trim());
      onLogin(auth.record);
    } catch (err) {
      setError('Email o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#1c1714', display: 'flex', alignItems: 'stretch',
      fontFamily: "'Chakra Petch', sans-serif", overflow: 'hidden',
    }}>
      {/* LEFT PANEL — brand */}
      <div style={{
        flex: 1, background: '#1c1714', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 56px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Stripe decoration */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 6,
          background: 'repeating-linear-gradient(90deg,#c85a17 0,#c85a17 20px,#1c1714 20px,#1c1714 30px)',
        }} />

        {/* Floating icons BG */}
        {ICONS.map((Icon, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: `${10 + (i * 12)}%`,
            left: `${(i % 3) * 35 + 5}%`,
            opacity: 0.04,
            transform: `rotate(${i * 17}deg)`,
          }}>
            <Icon size={60 + (i % 3) * 20} color="#cfaa70" />
          </div>
        ))}

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ marginBottom: 48 }}>
            <div style={{
              display: 'inline-block',
              background: '#c85a17', padding: '6px 16px',
              fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700,
              color: '#fff', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 12,
            }}>
              STREAMING PRIVADO
            </div>
            <h1 style={{
              fontSize: 'clamp(3rem,6vw,5rem)', fontWeight: 900, color: '#f0e6d3',
              textTransform: 'uppercase', margin: 0, letterSpacing: '-0.03em', lineHeight: 0.9,
              textShadow: '4px 4px 0 #c85a17',
            }}>
              KONG<br/>FLIX
            </h1>
          </div>

          {/* Tagline */}
          <p style={{
            fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#5c4a3d',
            lineHeight: 2, letterSpacing: '0.05em', maxWidth: 340, borderLeft: '3px solid #c85a17',
            paddingLeft: 16,
          }}>
            Películas · Series · Documentales<br/>
            Conciertos · Cursos · Música · Cómics
          </p>

          {/* Stats decorativas */}
          <div style={{ display: 'flex', gap: 32, marginTop: 48 }}>
            {[
              { val: '4K',   label: 'Calidad' },
              { val: '∞',    label: 'Contenido' },
              { val: '24/7', label: 'Disponible' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: '1.8rem',
                               fontWeight: 900, color: '#cfaa70', lineHeight: 1 }}>
                  {s.val}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px',
                               color: '#5c4a3d', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom left border */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #c85a17, transparent)',
        }} />
      </div>

      {/* RIGHT PANEL — form */}
      <div style={{
        width: '100%', maxWidth: 480, background: '#f0e6d3',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 48px', borderLeft: '4px solid #c85a17',
        position: 'relative',
      }}>
        {/* Top stripe */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 6,
          background: 'repeating-linear-gradient(90deg,#c85a17 0,#c85a17 20px,#1c1714 20px,#1c1714 30px)',
        }} />

        <div style={{ marginBottom: 40 }}>
          <h2 style={{
            fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 900, color: '#1c1714',
            textTransform: 'uppercase', margin: '0 0 8px', letterSpacing: '-0.02em',
          }}>
            ACCEDER
          </h2>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px',
                       color: '#5c4a3d', margin: 0, letterSpacing: '0.15em' }}>
            ÁREA PRIVADA · KONGFLIX
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Email */}
          <div>
            <label style={{
              display: 'block', fontFamily: "'Space Mono', monospace", fontSize: '8px',
              fontWeight: 700, color: '#5c4a3d', letterSpacing: '0.2em',
              textTransform: 'uppercase', marginBottom: 6,
            }}>EMAIL</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              placeholder="usuario@correo.com"
              autoComplete="email"
              style={{
                width: '100%', padding: '14px 16px', boxSizing: 'border-box',
                background: '#fff', border: `2px solid ${focused === 'email' ? '#c85a17' : '#d4b595'}`,
                fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#1c1714',
                outline: 'none', transition: 'border-color 0.15s',
                boxShadow: focused === 'email' ? '3px 3px 0 #c85a17' : '3px 3px 0 #d4b595',
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block', fontFamily: "'Space Mono', monospace", fontSize: '8px',
              fontWeight: 700, color: '#5c4a3d', letterSpacing: '0.2em',
              textTransform: 'uppercase', marginBottom: 6,
            }}>CONTRASEÑA</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocused('pw')}
                onBlur={() => setFocused(null)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '14px 48px 14px 16px', boxSizing: 'border-box',
                  background: '#fff', border: `2px solid ${focused === 'pw' ? '#c85a17' : '#d4b595'}`,
                  fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#1c1714',
                  outline: 'none', transition: 'border-color 0.15s',
                  boxShadow: focused === 'pw' ? '3px 3px 0 #c85a17' : '3px 3px 0 #d4b595',
                }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#5c4a3d', padding: 0,
                }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#fee', border: '2px solid #e63946', padding: '10px 14px',
            }}>
              <AlertCircle size={14} color="#e63946" style={{ flexShrink: 0 }} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px',
                              fontWeight: 700, color: '#e63946' }}>
                {error}
              </span>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{
              padding: '16px', background: loading ? '#d4b595' : '#c85a17',
              border: '2px solid #1c1714',
              boxShadow: loading ? 'none' : '4px 4px 0 #1c1714',
              cursor: loading ? 'default' : 'pointer',
              fontFamily: "'Chakra Petch', sans-serif", fontSize: '14px', fontWeight: 900,
              color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all 0.15s', marginTop: 4,
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '6px 6px 0 #1c1714'; }}}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0 #1c1714'; }}
          >
            {loading ? (
              <>
                <div style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent',
                               borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                VERIFICANDO...
              </>
            ) : (
              <><LogIn size={16} /> ENTRAR A KONGFLIX</>
            )}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          marginTop: 40, fontFamily: "'Space Mono', monospace", fontSize: '8px',
          color: '#adb5bd', letterSpacing: '0.1em', textAlign: 'center',
        }}>
          ACCESO SOLO POR INVITACIÓN
        </p>

        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>

      {/* MOBILE responsive override */}
      <style>{`
        @media (max-width: 640px) {
          div[style*="max-width: 480px"] { max-width: 100% !important; border-left: none !important; }
          div[style*="flex: 1"] { display: none !important; }
        }
      `}</style>
    </div>
  );
}