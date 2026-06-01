import { useEffect, useState, useMemo } from 'react';
import { pb } from '../services/pb';
import { fetchUserHistory } from '../hooks/useWatchProgress';
import MediaCard from '../components/MediaCard';
import SeriesModal from '../components/SeriesModal';
import {
  FaSortAlphaDown, FaHistory, FaDatabase,
  FaPlay, FaExclamationTriangle
} from 'react-icons/fa';

/**
 * Construye URL de thumbnail de Google Drive a partir del ID.
 */
function driveThumb(driveId, size = 'w800') {
  if (!driveId) return '';
  if (driveId.startsWith('http')) return driveId.replace('http://', 'https://');
  return `https://drive.google.com/thumbnail?id=${driveId}&sz=${size}`;
}

export default function Series() {
  const [allRecords, setAllRecords]     = useState([]);
  const [heroSeries, setHeroSeries]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [sortBy, setSortBy]             = useState('RECENT');
  const [searchTerm, setSearchTerm]     = useState('');
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isGlitching, setIsGlitching]   = useState(false);
  const [userHistory, setUserHistory]   = useState({});

  const HERO_ROTATION_INTERVAL = 5000;
  const GLITCH_DURATION        = 280;

  // ── FETCH ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const records = await pb.collection('series').getFullList({ batch: 5000, requestKey: null });
        // PocketBase bloquea el sort por fecha. Pero entrega las series en el orden que se insertaron (el más viejo primero).
        // Al revertir el array, logramos exactamente lo mismo: del más nuevo al más viejo, evadiendo la restricción.
        records.reverse();
        setAllRecords(records);

        // Hero: series únicas que tengan el campo 'poster' en cualquiera de sus episodios
        const unique = [];
        const seen   = new Set();
        for (const rec of records) {
          if (!seen.has(rec.seriesName)) {
            // Check if ANY episode of this series has a poster
            const allEps = records.filter(r => r.seriesName === rec.seriesName);
            const epWithPoster = allEps.find(r => r.poster);
            
            if (epWithPoster) {
              seen.add(rec.seriesName);
              // Use the episode that has the poster so the hero can render it
              unique.push(epWithPoster);
              if (unique.length >= 6) break;
            } else if (rec.poster) {
              // Fallback just in case
              seen.add(rec.seriesName);
              unique.push(rec);
              if (unique.length >= 6) break;
            }
          }
        }
        setHeroSeries(unique);
      } catch (err) {
        console.error("KONGFLIX_DB_ERROR:", err.status, err.response);
      } finally {
        setLoading(false);
      }
    };

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

    fetchSeries();
    loadHistory();
  }, []);

  // ── HERO ROTATION ──────────────────────────────────────────
  useEffect(() => {
    if (heroSeries.length <= 1) return;
    const id = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => {
        setCurrentHeroIndex(p => (p + 1) % heroSeries.length);
        setIsGlitching(false);
      }, GLITCH_DURATION);
    }, HERO_ROTATION_INTERVAL);
    return () => clearInterval(id);
  }, [heroSeries]);

  // ── AGRUPACIÓN Y ORDENAMIENTO ──────────────────────────────
  const groupedSeries = useMemo(() => {
    // 1. Filtrar por búsqueda
    const filtered = allRecords.filter(item => {
      if (!searchTerm) return true;
      return (item.seriesName || '').toLowerCase().includes(searchTerm.toLowerCase());
    });

    // 2. Agrupar
    const grouped = filtered.reduce((acc, item) => {
      const key = item.seriesName || 'UNKNOWN';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    // 3. Ordenar
    return Object.entries(grouped).sort(([nameA, itemsA], [nameB, itemsB]) => {
      if (sortBy === 'ALPHA') {
        return nameA.localeCompare(nameB);
      } else {
        // En lugar de calcular fechas, buscamos el índice original más bajo en allRecords 
        // (el índice más bajo es el más reciente porque PocketBase ya lo ordenó).
        const indexA = Math.min(...itemsA.map(ep => allRecords.indexOf(ep)));
        const indexB = Math.min(...itemsB.map(ep => allRecords.indexOf(ep)));
        
        return indexA - indexB;
      }
    });
  }, [allRecords, sortBy, searchTerm]);

  // ── POPSTATE PARA BOTON ATRAS ──────────────────────────────
  useEffect(() => {
    const handlePopState = () => {
      if (!window.location.hash) {
        setSelectedSeries(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openSeries = (name, episodes) => {
    setSelectedSeries({ name, episodes });
    const slug = name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    window.history.pushState({ modal: true }, '', `#${slug}`);
  };

  const closeSeries = () => {
    setSelectedSeries(null);
    if (window.location.hash) window.history.back();
  };

  // ── LOADING ────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0e6d3]">
      <div className="font-mono text-xs md:text-[13px] text-[#1c1714] tracking-[0.2em] animate-pulse uppercase">
        &gt; LOADING_ARCHIVE...
      </div>
    </div>
  );

  const activeHero = heroSeries[currentHeroIndex];
  // Imagen del hero usando el campo 'poster' de PocketBase
  let heroImg = '';
  if (activeHero && activeHero.poster) {
    if (activeHero.poster.startsWith('http')) {
      heroImg = activeHero.poster.replace('http://', 'https://');
    } else {
      heroImg = driveThumb(activeHero.poster, 'w1000');
    }
  }

  return (
    <div className="bg-[#f0e6d3] min-h-screen font-chakra pb-10">

      {/* ══ HERO ══════════════════════════════════════════════ */}
      {activeHero && (
        <div className="relative w-full h-[55vh] md:h-[65vh] lg:h-[75vh] overflow-hidden border-b-4 border-[#c85a17] bg-[#1c1714] group">
          
          {/* Capa de imagen principal y transición glitch */}
          <div className={`absolute inset-0 transition-all duration-200 ${isGlitching ? 'opacity-40 scale-105 blur-sm' : 'opacity-100 scale-100'}`}>
            {heroImg && (
              <img
                src={heroImg}
                alt={activeHero.seriesName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-60 md:opacity-75"
              />
            )}
            {/* Gradiente vertical para fusionar con la UI */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1c1714] via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1c1714]/80 via-transparent to-transparent md:w-2/3" />
          </div>

          {/* Info del hero (Caja de texto flotante) */}
          <div className={`absolute bottom-6 left-4 md:bottom-12 md:left-10 z-10 w-[90%] md:max-w-[520px] transition-all duration-300
            ${isGlitching ? 'translate-x-2 opacity-0' : 'translate-x-0 opacity-100'}`}>
            
            <div className="inline-flex items-center gap-1.5 md:gap-2 bg-[#c85a17] text-white font-mono text-[8px] md:text-[9px] font-bold tracking-[0.2em] uppercase px-2 md:px-3 py-1 mb-2 md:mb-3">
              <FaExclamationTriangle size={8} />
              NEW_UPLOAD // {activeHero.category || 'SERIES'}
            </div>
            
            <h1 className="text-3xl md:text-[3.5rem] lg:text-[4.5rem] font-black text-white uppercase tracking-tighter leading-none mb-2 md:mb-4 drop-shadow-[3px_3px_0_#c85a17]">
              {activeHero.seriesName}
            </h1>
            
            <p className="text-[#d4b595] text-[11px] md:text-[13px] mb-4 md:mb-5 border-l-2 md:border-l-3 border-[#d4b595] pl-3 line-clamp-2 md:line-clamp-3 overflow-hidden leading-relaxed">
              {activeHero.plot || 'Sinopsis clasificada bajo protocolo KONG. Archivo restringido para personal autorizado.'}
            </p>
            
            <button
              onClick={() => openSeries(activeHero.seriesName, allRecords.filter(r => r.seriesName === activeHero.seriesName))}
              className="bg-[#c85a17] text-[#1c1714] font-black uppercase tracking-widest text-[9px] md:text-xs px-5 md:px-8 py-2.5 md:py-3.5 flex items-center justify-center md:justify-start gap-2 hover:bg-[#d4b595] transition-all border-2 border-transparent hover:border-[#1c1714] active:scale-95 shadow-[4px_4px_0_0_#1c1714] w-full md:w-auto"
            >
              <FaPlay size={10} /> INICIAR_MISIÓN
            </button>
          </div>

          {/* Controles de navegación manual (Flechas) */}
          <button 
            onClick={() => setCurrentHeroIndex(p => (p - 1 + heroSeries.length) % heroSeries.length)}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-30 bg-[#1c1714]/60 text-[#c85a17] hover:bg-[#c85a17] hover:text-[#1c1714] p-3 md:p-5 rounded-sm border-2 border-[#c85a17] transition-all opacity-50 hover:opacity-100 group-hover:opacity-100 hidden md:block"
          >
            &#10094;
          </button>
          <button 
            onClick={() => setCurrentHeroIndex(p => (p + 1) % heroSeries.length)}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-30 bg-[#1c1714]/60 text-[#c85a17] hover:bg-[#c85a17] hover:text-[#1c1714] p-3 md:p-5 rounded-sm border-2 border-[#c85a17] transition-all opacity-50 hover:opacity-100 group-hover:opacity-100 hidden md:block"
          >
            &#10095;
          </button>

          {/* Dots de paginación del carrusel */}
          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-8 flex gap-1.5 md:gap-2 z-20">
            {heroSeries.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentHeroIndex(i)}
                className={`h-1.5 md:h-1 transition-all duration-300 border-none cursor-pointer ${
                  i === currentHeroIndex 
                  ? 'w-6 md:w-10 bg-[#c85a17]' 
                  : 'w-2 md:w-5 bg-[#d4b595]/40 hover:bg-[#d4b595]'
                }`} 
              />
            ))}
          </div>
        </div>
      )}

      {/* ══ ARCHIVO GLOBAL ════════════════════════════════════ */}
      <div className="px-4 md:px-8 pt-8 md:pt-12 pb-16 md:pb-20 max-w-[1600px] mx-auto">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-l-4 md:border-l-6 border-[#c85a17] pl-4 md:pl-5 mb-6 md:mb-10">
          <div>
            <h2 className="text-2xl md:text-4xl lg:text-[3rem] font-black uppercase tracking-tighter text-[#1c1714] m-0 leading-none">
              Global_Archive
            </h2>
            <p className="font-mono text-[9px] md:text-[10px] tracking-[0.2em] text-[#5c4a3d] mt-2 flex items-center gap-2">
              <FaDatabase size={9} className="text-[#c85a17]" />
              TOTAL_RECORDS: <span className="font-bold text-[#1c1714]">{groupedSeries.length}</span> UNITS_INDEXED
            </p>
          </div>

          <div className="flex flex-col md:flex-row w-full md:w-auto gap-3 items-stretch md:items-center">
            {/* BARRA DE BUSQUEDA RESTAURADA */}
            <input
              type="text"
              placeholder="BUSCAR SERIE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-2 border-[#5c4a3d] focus:border-[#1c1714] outline-none px-4 py-2 font-chakra text-[10px] md:text-xs font-bold uppercase tracking-widest text-[#1c1714] placeholder:text-[#5c4a3d] shadow-[3px_3px_0_0_#1c1714] transition-all w-full md:w-64"
            />

            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={() => setSortBy('RECENT')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 border-2 px-4 py-2 font-chakra text-[9px] md:text-[10px] font-black tracking-widest uppercase transition-all shadow-[3px_3px_0_0_#1c1714] active:scale-95 active:shadow-none ${
                  sortBy === 'RECENT' 
                  ? 'bg-[#c85a17] text-[#fff] border-[#1c1714]' 
                  : 'bg-transparent text-[#1c1714] border-[#5c4a3d] hover:border-[#1c1714]'
                }`}
              >
                <FaHistory size={12} /> RECIENTES
              </button>
              
              <button
                onClick={() => setSortBy('ALPHA')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 border-2 px-4 py-2 font-chakra text-[9px] md:text-[10px] font-black tracking-widest uppercase transition-all shadow-[3px_3px_0_0_#1c1714] active:scale-95 active:shadow-none ${
                  sortBy === 'ALPHA' 
                  ? 'bg-[#c85a17] text-[#fff] border-[#1c1714]' 
                  : 'bg-transparent text-[#1c1714] border-[#5c4a3d] hover:border-[#1c1714]'
                }`}
              >
                <FaSortAlphaDown size={12} /> A → Z
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5">
          {groupedSeries.map(([name, episodes]) => {
            // Find the first episode that has a valid poster
            const epWithPoster = episodes.find(ep => ep.poster) || episodes[0];
            
            // Calculate series progress
            let totalProgress = 0;
            let countWatched = 0;
            episodes.forEach(ep => {
              if (userHistory[ep.id]) {
                if (userHistory[ep.id] === 100) {
                  countWatched++;
                } else {
                  totalProgress += userHistory[ep.id];
                }
              }
            });
            // If all episodes finished: 100%. Otherwise, percentage of episodes finished + partial progress of current episode
            const progressPercent = episodes.length > 0 ? ((countWatched * 100) + totalProgress) / episodes.length : 0;

            // Extract year from series name or title (e.g., "(2026)")
            const extractYear = (str) => {
              const match = str?.match(/\((\d{4})\)/);
              return match ? match[1] : '';
            };
            const extractedYear = extractYear(epWithPoster?.name || epWithPoster?.seriesName) || '';

            return (
              <MediaCard
                key={name}
                media={{
                  name,
                  coverId: epWithPoster?.poster || '',
                  poster:  epWithPoster?.poster ? driveThumb(epWithPoster.poster, 'w800') : '',
                  year:    extractedYear,
                  genres:  epWithPoster?.genres || '',
                  progress: progressPercent
                }}
                onClick={() => openSeries(name, episodes)}
              />
            );
          })}
        </div>
      </div>

      {selectedSeries && (
        <SeriesModal
          seriesName={selectedSeries.name}
          episodes={selectedSeries.episodes}
          onClose={closeSeries}
        />
      )}
      
    </div>
  );
}