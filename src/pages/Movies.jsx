import { useEffect, useState, useMemo } from 'react';
import { pb } from '../services/pb';
import { fetchUserHistory } from '../hooks/useWatchProgress';
import MediaRow from '../components/MediaRow';
import MediaModal from '../components/MediaModal';
import {
  FaPlay, FaExclamationTriangle, FaDatabase,
  FaSortAlphaDown, FaCalendarAlt, FaHistory, FaSearch
} from 'react-icons/fa';

// ─── HELPERS DE URL ────────────────────────────────────────────
function driveVariants(id) {
  return [
    `https://drive.google.com/thumbnail?id=${id}&sz=w800`,
    `https://lh3.googleusercontent.com/d/${id}=w800`,
    `https://drive.google.com/uc?export=view&id=${id}`,
  ];
}

function buildUrlVariants(input) {
  if (!input) return [];
  if (input.startsWith('http')) {
    if (input.includes('drive.google.com') || input.includes('googleusercontent')) {
      const m = input.match(/(?:id=|\/d\/|open\?id=)([a-zA-Z0-9_-]{15,})/);
      if (m) return driveVariants(m[1]);
    }
    return [input];
  }
  if (/^[a-zA-Z0-9_-]{15,}$/.test(input)) return driveVariants(input);
  return [input];
}

function HeroImage({ url, alt }) {
  const variants = buildUrlVariants(url);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed]   = useState(false);

  if (failed || !variants.length) {
    return <div className="w-full h-full bg-[#1c1714]" />;
  }

  return (
    <>
      {/* Fondo desenfocado para evitar bordes vacíos cuando la imagen sea vertical */}
      <img
        src={variants[attempt]}
        alt=""
        className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none"
      />
      {/* Imagen real, respetando proporción en móviles */}
      <img
        src={variants[attempt]}
        alt={alt}
        onError={() => {
          if (attempt + 1 < variants.length) setAttempt(a => a + 1);
          else setFailed(true);
        }}
        className="absolute inset-0 w-full h-full object-contain md:object-cover object-center md:object-top"
        style={{ filter: 'contrast(1.05) saturate(0.85)' }}
      />
    </>
  );
}

function ArchiveCard({ movie, onClick }) {
  const variants = buildUrlVariants(movie.coverId?.trim() || movie.poster?.trim() || '');
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed]   = useState(false);

  return (
    <div
      onClick={onClick}
      className="relative aspect-[2/3] cursor-pointer overflow-hidden group
        bg-[#d4b595] border-2 border-[#5c4a3d] hover:border-[#c85a17]
        shadow-[3px_3px_0_#5c4a3d] hover:shadow-[3px_3px_0_#c85a17]
        transition-all duration-200 hover:-translate-y-1"
    >
      {failed || !variants.length ? (
        <div className="absolute inset-0 bg-[#d4b595] flex flex-col items-center justify-center p-2 gap-1">
          <div className="w-5 h-[2px] bg-[#c85a17]" />
          <span className="text-[9px] font-black text-[#1c1714] uppercase text-center leading-tight">
            {movie.tmdbTitle || movie.name}
          </span>
          <div className="w-5 h-[2px] bg-[#c85a17]" />
        </div>
      ) : (
        <img
          src={variants[attempt]}
          alt={movie.tmdbTitle || movie.name}
          loading="lazy"
          onError={() => {
            if (attempt + 1 < variants.length) setAttempt(a => a + 1);
            else setFailed(true);
          }}
          className="absolute inset-0 w-full h-full object-cover
            group-hover:scale-105 transition-transform duration-500"
        />
      )}

      {/* Overlay hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Barra de progreso */}
      {movie.progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 md:h-1.5 bg-[#1c1714] z-20 overflow-hidden">
          <div className="h-full bg-[#c85a17] transition-all duration-500" style={{ width: `${movie.progress}%` }} />
        </div>
      )}

      {/* Año */}
      <div className="absolute top-1.5 left-1.5 z-10
        bg-[#c85a17] text-white text-[8px] md:text-[9px] font-black px-1.5 py-0.5 font-mono tracking-widest">
        {movie.year}
      </div>

      {/* Título hover */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-[#1c1714]/95 p-2 md:p-3
        translate-y-full group-hover:translate-y-0 transition-transform duration-200
        border-t-2 border-[#c85a17]">
        <p className="text-[9px] md:text-[11px] text-[#d4b595] font-black uppercase truncate">
          {movie.tmdbTitle || movie.name}
        </p>
      </div>
    </div>
  );
}

export default function Movies() {
  const [allRecords, setAllRecords]         = useState([]);
  const [sortBy, setSortBy]                 = useState('RECENT');
  const [searchTerm, setSearchTerm]         = useState('');
  const [selectedMedia, setSelectedMedia]   = useState(null);
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [loading, setLoading]               = useState(true);
  const [heroMovies, setHeroMovies]         = useState([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isGlitching, setIsGlitching]       = useState(false);
  const [userHistory, setUserHistory]       = useState({});

  const HIDDEN_CATEGORIES = [];

  useEffect(() => {
    pb.collection('movies').getFullList({ batch: 5000, requestKey: null })
      .then((records) => {
        records.reverse();
        setAllRecords(records);
        setHeroMovies(
          records
            .filter(m => m.backdrop || m.poster || m.coverId)
            .slice(0, 6)
        );
        
        // Auto-abrir modal si hay hash en la URL (al presionar F5)
        if (window.location.hash) {
          const slug = window.location.hash.substring(1);
          const targetMovie = records.find(m => {
            const mSlug = (m.tmdbTitle || m.name || 'pelicula').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
            return mSlug === slug;
          });
          if (targetMovie) {
            setSelectedMedia(targetMovie);
            setIsModalOpen(true);
            document.body.style.overflow = 'hidden';
          }
        }
      })
      .catch(err => console.error('DB_ERROR:', err))
      .finally(() => setLoading(false));

    const loadHistory = async () => {
      try {
        const history = await fetchUserHistory(2000);
        const histMap = {};
        history.forEach(h => {
          if (h.status === 'finished') {
            histMap[h.media_id] = 100;
          } else if (h.total > 0) {
            histMap[h.media_id] = (h.progress / h.total) * 100;
          }
        });
        setUserHistory(histMap);
      } catch (e) {
        console.warn("Could not load history", e);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    if (heroMovies.length <= 1) return;
    const id = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => {
        setCurrentHeroIndex(i => (i + 1) % heroMovies.length);
        setIsGlitching(false);
      }, 250);
    }, 5500);
    return () => clearInterval(id);
  }, [heroMovies]);

  const filteredRecords = useMemo(() => {
    let r = allRecords;
    if (searchTerm) {
      r = r.filter(m => (m.tmdbTitle || m.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return r.sort((a, b) => {
      if (sortBy === 'ALPHA') {
        return (a.tmdbTitle || a.name || '').toLowerCase().localeCompare((b.tmdbTitle || b.name || '').toLowerCase());
      } else {
        return allRecords.indexOf(a) - allRecords.indexOf(b);
      }
    });
  }, [allRecords, sortBy, searchTerm]);

  const moviesByCategory = useMemo(() =>
    filteredRecords.reduce((acc, m) => {
      const cat = (m.category || 'OTROS').trim();
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(m);
      return acc;
    }, {}),
  [filteredRecords]);

  useEffect(() => {
    const handlePopState = () => {
      if (!window.location.hash) {
        setIsModalOpen(false);
        setSelectedMedia(null);
        document.body.style.overflow = 'auto';
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openModal = (movie) => {
    setSelectedMedia(movie);
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
    const slug = (movie.tmdbTitle || movie.name || 'pelicula').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    window.history.pushState({ modal: true }, '', `#${slug}`);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMedia(null);
    document.body.style.overflow = 'auto';
    if (window.location.hash) window.history.back();
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#f0e6d3]">
      <div className="w-10 h-10 border-4 border-[#5c4a3d] border-t-[#c85a17] rounded-full animate-spin mb-4" />
      <p className="text-[#1c1714] text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
        Cargando_Archivos...
      </p>
    </div>
  );

  const hero = heroMovies[currentHeroIndex];

  return (
    <div className="pb-20 md:pb-24 bg-[#f0e6d3] min-h-screen font-chakra">
      {isModalOpen && selectedMedia && (
        <MediaModal media={selectedMedia} onClose={closeModal} />
      )}

      {/* ── HERO ─────────────────────────────────────────── */}
      {hero && (
        <div className="relative w-full h-[55vh] md:h-[70vh] overflow-hidden bg-[#0f0c0a]">
          <div className={`absolute inset-0 transition-all duration-300 ${isGlitching ? 'scale-105 blur-[2px]' : ''}`}>
            <HeroImage url={hero.backdrop?.trim() || hero.poster?.trim() || hero.coverId?.trim() || ''} alt={hero.tmdbTitle} />
          </div>
          
          {/* Gradientes oscuros para legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0c0a] via-[#0f0c0a]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f0c0a]/80 via-[#0f0c0a]/20 to-transparent md:w-2/3" />

          {/* Marcador superior derecho */}
          <div className="absolute top-4 right-4 text-right space-y-1 opacity-70 text-[#d4b595] font-mono text-[9px] md:text-[10px]">
            <div>N°{String(currentHeroIndex + 1).padStart(3, '0')}</div>
            <div className="w-full h-px bg-[#5c4a3d]" />
            <div className="hidden sm:block">CINEMA_ARCHIVE</div>
          </div>

          {/* Caja de información principal */}
          <div className={`absolute bottom-0 left-0 z-20 w-full md:w-auto transition-all duration-300
            ${isGlitching ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            <div className="h-1.5 w-full md:w-[460px] bg-repeating-linear-gradient(45deg,#c85a17,#c85a17 10px,#1c1714 10px,#1c1714 20px)" />
            <div className="w-full md:w-[460px] p-5 md:p-6 bg-[#1c1714]/95 backdrop-blur-md border-r-0 md:border-r-2 border-t-2 border-[#5c4a3d]">
              <div className="flex items-center gap-2 mb-2 md:mb-3 flex-wrap">
                <span className="text-[#c85a17] text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0">
                  <FaExclamationTriangle className="text-[8px]" />
                  TARGET // {hero.year}
                </span>
                <span className="text-[#d4b595] text-[9px] md:text-[10px] font-mono border border-[#5c4a3d] px-1 truncate max-w-[150px]">
                  {hero.category || 'CLASSIFIED'}
                </span>
              </div>
              
              <h1 className="text-2xl md:text-[2.6rem] font-black text-white leading-tight uppercase tracking-tight mb-2 md:mb-3 line-clamp-2">
                {hero.tmdbTitle || hero.name}
              </h1>
              
              <div className="h-px bg-[#5c4a3d]/50 mb-3" />
              
              <p className="text-xs md:text-[13px] text-[#e6d5c3] mb-4 line-clamp-2 md:line-clamp-3 leading-relaxed">
                {hero.plot || 'Sin descripción en los archivos del sistema.'}
              </p>
              
              <button 
                onClick={() => openModal(hero)} 
                className="w-full md:w-auto bg-[#c85a17] text-[#1c1714] font-black uppercase tracking-widest text-[10px] md:text-xs px-6 py-3 flex items-center justify-center gap-2 hover:bg-[#d4b595] transition-colors border-2 border-transparent hover:border-[#5c4a3d] active:scale-95"
              >
                <FaPlay size={10} /> INICIAR_SYNC
              </button>
            </div>
          </div>

          {/* Paginación Hero */}
          <div className="absolute bottom-3 right-4 z-20 flex gap-1.5">
            {heroMovies.map((_, i) => (
              <button key={i} onClick={() => setCurrentHeroIndex(i)}
                className={`transition-all duration-200 ${i === currentHeroIndex
                  ? 'w-4 md:w-5 h-1.5 md:h-2 bg-[#c85a17]'
                  : 'w-1.5 md:w-2 h-1.5 md:h-2 bg-[#5c4a3d] hover:bg-[#d4b595]'}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── MARQUEE ───────────────────────────────────────── */}
      <div className="w-full bg-[#1c1714] border-b-2 border-[#5c4a3d] py-1.5 overflow-hidden flex items-center">
        <div className="flex w-[200%] animate-[marquee_15s_linear_infinite] text-[#d4b595] text-[9px] md:text-[10px] font-mono tracking-widest uppercase">
          {[...Array(4)].map((_, i) => (
            <span key={i} className="px-4 md:px-8 whitespace-nowrap">
              ◆ CINEMA_ARCHIVE  ◆ {filteredRecords.length} REGISTROS  
              ◆ {sortBy === 'RECENT' ? 'MÁS RECIENTES' : 'ALFABÉTICO'}  
            </span>
          ))}
        </div>
      </div>

      {/* ── FILTROS ───────────────────────────────────────── */}
      <div className="container mx-auto px-4 mt-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-8
          bg-[#e8d5b7] border-y-2 md:border-2 border-[#5c4a3d] p-3 md:p-4 shadow-[3px_3px_0_#5c4a3d] md:shadow-[4px_4px_0_#5c4a3d]">
          
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 md:pb-0 w-full md:w-auto">
            <input
              type="text"
              placeholder="BUSCAR PELÍCULA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-2 border-[#5c4a3d] focus:border-[#1c1714] outline-none px-4 py-2 font-chakra text-[10px] md:text-xs font-bold uppercase tracking-widest text-[#1c1714] placeholder:text-[#5c4a3d] transition-all w-full md:w-64"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => setSortBy('RECENT')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 border-2 px-4 py-1.5 font-chakra text-[9px] md:text-[10px] font-black tracking-widest uppercase transition-all active:scale-95 ${
                sortBy === 'RECENT' 
                ? 'bg-[#1c1714] border-[#1c1714] text-[#d4b595]' 
                : 'bg-transparent text-[#5c4a3d] border-[#5c4a3d] hover:border-[#c85a17] hover:text-[#c85a17]'
              }`}
            >
              <FaHistory size={10} /> RECIENTES
            </button>
            
            <button
              onClick={() => setSortBy('ALPHA')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 border-2 px-4 py-1.5 font-chakra text-[9px] md:text-[10px] font-black tracking-widest uppercase transition-all active:scale-95 ${
                sortBy === 'ALPHA' 
                ? 'bg-[#1c1714] border-[#1c1714] text-[#d4b595]' 
                : 'bg-transparent text-[#5c4a3d] border-[#5c4a3d] hover:border-[#c85a17] hover:text-[#c85a17]'
              }`}
            >
              <FaSortAlphaDown size={10} /> A → Z
            </button>
          </div>
        </div>

        {/* ── FILAS POR CATEGORÍA ───────────────────────── */}
        <div className="space-y-10 md:space-y-12 bg-[#e8d5b7] border-2 border-[#5c4a3d] p-4 md:p-6 mb-10 shadow-[3px_3px_0_#5c4a3d] md:shadow-[4px_4px_0_#5c4a3d]">
          {Object.entries(moviesByCategory).map(([category, movies]) => (
            <MediaRow
              key={category}
              title={category}
              items={movies.map(m => ({ ...m, name: m.tmdbTitle || m.name }))}
              onMediaClick={openModal}
            />
          ))}
        </div>

        {/* ── ARCHIVO GLOBAL ────────────────────────────── */}
        <div className="border-t-4 border-[#5c4a3d] pt-8 md:pt-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 md:mb-8">
            <div>
              <div className="text-[#c85a17] text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1">N°001 // GLOBAL_INDEX</div>
              <h2 className="text-[#1c1714] text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                Global_<span className="text-[#c85a17]">Archive</span>
              </h2>
            </div>
            
            <div className="w-full md:w-auto bg-[#1c1714] text-[#d4b595] px-4 md:px-5 py-2 md:py-3 flex items-center justify-center md:justify-start gap-3 border-2 border-[#5c4a3d] shadow-[3px_3px_0_#c85a17]">
              <FaDatabase className="text-[#c85a17] text-lg md:text-xl" />
              <div>
                <div className="text-[#c85a17] text-[8px] md:text-[9px] font-black tracking-widest uppercase">REGISTROS</div>
                <div className="text-xl md:text-2xl font-black leading-none text-white">{filteredRecords.length}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
            {filteredRecords.map(movie => (
              <ArchiveCard 
                key={`global-${movie.id}`} 
                movie={{...movie, progress: userHistory[movie.id] || 0}} 
                onClick={() => openModal(movie)} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}