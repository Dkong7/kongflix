import { useEffect, useState, useMemo } from 'react';
import { pb } from '../services/pb';
import MediaCard from '../components/MediaCard';
import MediaModal from '../components/MediaModal';
import { FaDatabase, FaSearch, FaFilter, FaTimes } from 'react-icons/fa';

export default function Documentaries() {
  const [docs, setDocs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [searchTerm, setSearchTerm]   = useState('');
  const [activeGenre, setActiveGenre] = useState('ALL');

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const records = await pb.collection('documentaries').getFullList({
          sort: '-year', requestKey: null,
        });
        setDocs(records);
      } catch (err) {
        console.error('KONGFLIX_DOCS_ERROR:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  // Géneros únicos para filtro
  const genres = useMemo(() => {
    const set = new Set();
    docs.forEach(d => {
      if (d.genres) d.genres.split(',').forEach(g => set.add(g.trim()));
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [docs]);

  const filtered = useMemo(() => {
    return docs.filter(d => {
      const matchSearch = (d.tmdbTitle || d.name || '')
        .toLowerCase().includes(searchTerm.toLowerCase());
      const matchGenre = activeGenre === 'ALL' ||
        (d.genres || '').includes(activeGenre);
      return matchSearch && matchGenre;
    });
  }, [docs, searchTerm, activeGenre]);

  // ── LOADING ──────────────────────────────────────────────
  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f0e6d3',
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: '12px',
        color: '#1c1714', letterSpacing: '0.25em', textTransform: 'uppercase',
      }}
      className="animate-pulse">
        &gt; CARGANDO_ARCHIVO...
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0e6d3',
      backgroundImage: `
        linear-gradient(rgba(92,74,61,0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(92,74,61,0.06) 1px, transparent 1px)
      `,
      backgroundSize: '28px 28px',
      fontFamily: "'Chakra Petch', sans-serif",
    }}>

      {selectedDoc && (
        <MediaModal media={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}

      {/* ══ HERO HEADER ════════════════════════════════════════ */}
      <div style={{
        background: '#1c1714',
        borderBottom: '4px solid #c85a17',
        padding: '48px 32px 32px',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* Franja warning */}
          <div style={{
            background: 'repeating-linear-gradient(45deg, #cfaa70, #cfaa70 10px, #1c1714 10px, #1c1714 20px)',
            height: 6, marginBottom: 24, width: 120,
          }} />

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
            <div>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: '9px',
                color: '#c85a17', letterSpacing: '0.3em', fontWeight: 700,
                textTransform: 'uppercase', marginBottom: 8,
              }}>
                KONGFLIX · ARCHIVO_DOCUMENTAL
              </div>
              <h1 style={{
                fontSize: 'clamp(2.5rem, 7vw, 6rem)',
                fontWeight: 900, color: '#f0e6d3',
                textTransform: 'uppercase', letterSpacing: '-0.03em',
                lineHeight: 0.9, margin: 0,
                textShadow: '4px 4px 0 #c85a17',
              }}>
                Documentales
              </h1>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: "'Space Mono', monospace", fontSize: '9px',
                color: '#d4b595', letterSpacing: '0.2em',
                marginTop: 12,
              }}>
                <FaDatabase size={8} />
                {filtered.length} / {docs.length} REGISTROS
                {activeGenre !== 'ALL' && (
                  <span style={{
                    background: '#c85a17', color: '#fff',
                    padding: '1px 8px', marginLeft: 4,
                  }}>
                    {activeGenre}
                  </span>
                )}
              </div>
            </div>

            {/* Buscador */}
            <div style={{ position: 'relative', width: 280 }}>
              <FaSearch style={{
                position: 'absolute', left: 12, top: '50%',
                transform: 'translateY(-50%)',
                color: '#5c4a3d', pointerEvents: 'none',
              }} size={12} />
              <input
                type="text"
                placeholder="BUSCAR_ARCHIVO..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  background: '#f0e6d3',
                  border: '2px solid #5c4a3d',
                  padding: '10px 36px 10px 36px',
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '10px', fontWeight: 700,
                  color: '#1c1714', letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#c85a17'}
                onBlur={e => e.target.style.borderColor = '#5c4a3d'}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: '#c85a17', cursor: 'pointer', padding: 0,
                  }}
                >
                  <FaTimes size={10} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ FILTROS DE GÉNERO ══════════════════════════════════ */}
      {genres.length > 1 && (
        <div style={{
          borderBottom: '2px solid #d4b595',
          background: '#e8d5b7',
          overflowX: 'auto',
        }}
        className="scrollbar-hide">
          <div style={{
            display: 'flex', gap: 0,
            maxWidth: 1400, margin: '0 auto',
            padding: '0 32px',
          }}>
            {genres.slice(0, 10).map(genre => (
              <button
                key={genre}
                onClick={() => setActiveGenre(genre)}
                style={{
                  padding: '12px 16px',
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '8px', fontWeight: 700,
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap', cursor: 'pointer',
                  border: 'none',
                  borderBottom: activeGenre === genre ? '3px solid #c85a17' : '3px solid transparent',
                  background: activeGenre === genre ? '#c85a17' : 'transparent',
                  color: activeGenre === genre ? '#fff' : '#5c4a3d',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (activeGenre !== genre) e.currentTarget.style.color = '#1c1714'; }}
                onMouseLeave={e => { if (activeGenre !== genre) e.currentTarget.style.color = '#5c4a3d'; }}
              >
                {genre === 'ALL' ? '⊞ TODOS' : genre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══ GRID ═══════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 32px 80px' }}>

        {/* Sin resultados */}
        {filtered.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            border: '2px dashed #d4b595',
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: '11px',
              color: '#5c4a3d', letterSpacing: '0.2em',
            }}>
              NO_RECORDS_FOUND<br />
              <span style={{ fontSize: '9px', opacity: 0.6 }}>
                intenta con otro término de búsqueda
              </span>
            </div>
          </div>
        )}

        <div className="archive-grid">
          {filtered.map(doc => (
            <MediaCard
              key={doc.id}
              media={{
                name:   doc.tmdbTitle || doc.name,
                poster: doc.poster || doc.coverId || '',
                year:   doc.year  || '',
                genres: doc.genres || '',
              }}
              onClick={() => setSelectedDoc(doc)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}