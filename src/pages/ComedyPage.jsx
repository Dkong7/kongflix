import { useState, useEffect, useMemo } from 'react';
import { pb } from '../services/pb';
import MediaCard from '../components/MediaCard';
import MediaModal from '../components/MediaModal';
import { FaDatabase, FaSearch, FaTimes, FaTheaterMasks } from 'react-icons/fa';

export default function ComedyPage() {
  const [items, setItems]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [searchTerm, setSearchTerm]   = useState('');
  const [sortBy, setSortBy]           = useState('year'); // 'year' | 'alpha'

  useEffect(() => {
    async function fetchComedy() {
      try {
        const response = await pb.collection('comedia').getFullList({ requestKey: null });
        const formatted = response.map(item => ({
          ...item,
          type: 'movie',
          name: item.tmdbTitle || item.name,
        }));
        setItems(formatted);
      } catch (err) {
        console.error('KONGFLIX_COMEDY_ERROR:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchComedy();
  }, []);

  const filtered = useMemo(() => {
    let list = items.filter(d =>
      (d.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (sortBy === 'alpha') list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (sortBy === 'year')  list = [...list].sort((a, b) => (b.year || 0) - (a.year || 0));
    return list;
  }, [items, searchTerm, sortBy]);

  // ── LOADING ──────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0e6d3' }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#1c1714', letterSpacing: '0.25em' }}
           className="animate-pulse">&gt; CARGANDO_COMEDIA...</div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0e6d3',
      backgroundImage: `linear-gradient(rgba(92,74,61,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(92,74,61,0.06) 1px, transparent 1px)`,
      backgroundSize: '28px 28px',
      fontFamily: "'Chakra Petch', sans-serif",
    }}>

      {selectedMedia && <MediaModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />}

      {/* ══ HERO HEADER ════════════════════════════════════════ */}
      <div style={{ background: '#1c1714', borderBottom: '4px solid #c85a17', padding: '48px 32px 32px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>

          {/* Franja industrial */}
          <div style={{
            background: 'repeating-linear-gradient(45deg,#cfaa70,#cfaa70 10px,#1c1714 10px,#1c1714 20px)',
            height: 6, marginBottom: 24, width: 120,
          }} />

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: "'Space Mono', monospace", fontSize: '9px',
                color: '#c85a17', letterSpacing: '0.3em', fontWeight: 700,
                textTransform: 'uppercase', marginBottom: 8,
              }}>
                <FaTheaterMasks size={10} />
                KONGFLIX · SECTOR_COMEDIA
              </div>

              <h1 style={{
                fontSize: 'clamp(2.5rem, 7vw, 6rem)',
                fontWeight: 900, color: '#f0e6d3',
                textTransform: 'uppercase', letterSpacing: '-0.03em',
                lineHeight: 0.9, margin: 0,
                textShadow: '4px 4px 0 #c85a17',
              }}>
                Comedia
              </h1>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: "'Space Mono', monospace", fontSize: '9px',
                color: '#d4b595', letterSpacing: '0.2em', marginTop: 12,
              }}>
                <FaDatabase size={8} />
                {filtered.length} / {items.length} REGISTROS
              </div>
            </div>

            {/* Buscador */}
            <div style={{ position: 'relative', width: 280 }}>
              <FaSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#5c4a3d', pointerEvents: 'none' }} size={12} />
              <input
                type="text"
                placeholder="BUSCAR_COMEDIA..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', background: '#f0e6d3',
                  border: '2px solid #5c4a3d',
                  padding: '10px 36px 10px 36px',
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '10px', fontWeight: 700,
                  color: '#1c1714', letterSpacing: '0.15em',
                  textTransform: 'uppercase', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#c85a17'}
                onBlur={e => e.target.style.borderColor = '#5c4a3d'}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#c85a17', cursor: 'pointer', padding: 0 }}>
                  <FaTimes size={10} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ TOOLBAR SORT ═══════════════════════════════════════ */}
      <div style={{ background: '#e8d5b7', borderBottom: '2px solid #d4b595' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', gap: 0 }}>
          {[
            { key: 'year',  label: 'AÑO ↓' },
            { key: 'alpha', label: 'A → Z' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              style={{
                padding: '12px 18px',
                fontFamily: "'Space Mono', monospace",
                fontSize: '8px', fontWeight: 700,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                whiteSpace: 'nowrap', cursor: 'pointer', border: 'none',
                borderBottom: sortBy === opt.key ? '3px solid #c85a17' : '3px solid transparent',
                background: sortBy === opt.key ? '#c85a17' : 'transparent',
                color: sortBy === opt.key ? '#fff' : '#5c4a3d',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (sortBy !== opt.key) e.currentTarget.style.color = '#1c1714'; }}
              onMouseLeave={e => { if (sortBy !== opt.key) e.currentTarget.style.color = '#5c4a3d'; }}
            >
              {opt.label}
            </button>
          ))}

          {/* Separador + conteo */}
          <div style={{ marginLeft: 'auto', fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#5c4a3d', letterSpacing: '0.15em' }}>
            ORDENAR_POR
          </div>
        </div>
      </div>

      {/* ══ GRID ═══════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 32px 80px' }}>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', border: '2px dashed #d4b595' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#5c4a3d', letterSpacing: '0.2em' }}>
              NO_RECORDS_FOUND<br />
              <span style={{ fontSize: '9px', opacity: 0.6 }}>intenta con otro término</span>
            </div>
          </div>
        )}

        <div className="archive-grid">
          {filtered.map(item => (
            <MediaCard
              key={item.id}
              media={{
                name:   item.name,
                poster: item.poster || item.coverId || '',
                year:   item.year   || '',
                genres: item.genres || '',
              }}
              onClick={() => setSelectedMedia(item)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}