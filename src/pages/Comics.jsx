import { useEffect, useState, useMemo, useRef } from 'react';
import { pb } from '../services/pb';
import { useViewNav } from '../hooks/useViewNav';
import MediaCard from '../components/MediaCard';
import ComicModal from '../components/ComicModal';
import { FaBookOpen, FaExclamationTriangle, FaArrowLeft, FaSpinner, FaDatabase, FaList } from 'react-icons/fa';

export default function Comics() {
  const [comics, setComics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  /* ── NAVEGACIÓN SINCRONIZADA CON URL ── */
  const { params: _nav, set: navTo } = useViewNav();
  const selectedSagaName = _nav.saga || null;

  const [selectedComic, setSelectedComic] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('alfabetico'); // 'alfabetico' o 'recientes'
  const [searchTerm, setSearchTerm] = useState('');

  const [visibleCount, setVisibleCount] = useState(12);
  const loaderRef = useRef(null);

  useEffect(() => {
    pb.collection('comics_db').getFullList({
      sort: 'family,titleClean',
      requestKey: null
    }).then(records => {
      setComics(records);
      setLoading(false);

      const sp = new URLSearchParams(window.location.search);
      const comicId = sp.get('comicId');
      if (comicId) {
        const target = records.find(c => c.id === comicId);
        if (target) setSelectedComic(target);
      }
    }).catch(err => {
      setErrorMsg(err.message);
      setLoading(false);
    });
  }, []);

  const sagasList = useMemo(() => {
    const grouped = comics.reduce((acc, comic) => {
      // Group by saga name
      let sagaName = comic.titleClean || "Desconocido";
      
      // 1. Eliminar firmas como "POR fulano", "BY mengano", y corchetes "[CRG]"
      sagaName = sagaName.replace(/\s+(por|by)\s+.*$/i, '');
      sagaName = sagaName.replace(/\s*\[.*?\]\s*/g, ' ');
      
      // 2. Extraer el nombre antes de indicadores de volumen (Tomo, Vol, N°, #)
      const volMatch = sagaName.match(/^(.*?)\s*(?:-|:)?\s*(?:n[°º]\s*|#\s*|tomo\s+|vol\.?\s+|volumen\s+)\d+/i);
      if (volMatch) {
        sagaName = volMatch[1];
      } else {
        // Fallback: buscar el primer número aislado (que no sea fracción como 1/2)
        const numMatch = sagaName.match(/^(.*?)\s+(?!\d\/\d)\d+/);
        if (numMatch) {
          sagaName = numMatch[1];
        }
      }
      
      // Limpiar guiones o espacios sueltos al final
      sagaName = sagaName.replace(/[-:]\s*$/, '').trim();
      
      if (!acc[sagaName]) acc[sagaName] = [];
      acc[sagaName].push(comic);
      return acc;
    }, {});

    return Object.keys(grouped).map(sagaName => {
      const issues = grouped[sagaName].sort((a, b) => a.titleClean.localeCompare(b.titleClean, undefined, { numeric: true }));

      const firstWithCover = issues.find(c => c.coverId) || issues[0];
      const imgUrl = firstWithCover.coverId
        ? `https://drive.google.com/thumbnail?id=${firstWithCover.coverId}&sz=w600`
        : null;

      // Las categorías principales pueden estar en family (Nuevos aportes) o en folderName (Excel viejo)
      const validCategories = ["DC", "MARVEL", "MANGA", "CARTOONS", "GAMES COMICS", "ART BOOK", "+ HISTORIAS", "OTROS COMICS"];
      let sagaFamily = 'OTROS COMICS';
      for (const c of issues) {
        let f = c.family ? c.family.trim().toUpperCase() : "";
        f = f.replace("Ó", "O").replace("CÓMICS", "COMICS");
        if (validCategories.includes(f)) {
          sagaFamily = f;
          break;
        }
        let fn = c.folderName ? c.folderName.trim().toUpperCase() : "";
        fn = fn.replace("Ó", "O").replace("CÓMICS", "COMICS");
        if (validCategories.includes(fn)) {
          sagaFamily = fn;
          break;
        }
      }
      const latestCreated = Math.max(...issues.map(c => {
        const d = new Date(c.created || c.dateCreated);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      }));

      return {
        id: `saga_${sagaName.replace(/\s+/g, '_')}`,
        title: sagaName,
        name: sagaName,
        type: sagaFamily.toUpperCase(), // Normalize to uppercase
        poster: imgUrl,
        issueCount: issues.length,
        issues: issues,
        latestCreated: latestCreated
      };
    });
  }, [comics]);

  const uniqueFamilies = useMemo(() => {
    const families = new Set(sagasList.map(s => s.type));
    return ['all', ...Array.from(families).sort()];
  }, [sagasList]);

  const selectedSaga = selectedSagaName ? sagasList.find(s => s.title === selectedSagaName) : null;
  const newestSaga = sagasList.length > 0 ? [...sagasList].sort((a, b) => b.latestCreated - a.latestCreated)[0] : null;

  const filteredSagas = useMemo(() => {
    let filtered = sagasList.filter(saga => filterType === 'all' || saga.type === filterType);
    
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(saga => saga.title.toLowerCase().includes(q));
    }
    
    if (sortBy === 'alfabetico') {
      filtered = filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      filtered = filtered.sort((a, b) => b.latestCreated - a.latestCreated);
    }
    return filtered;
  }, [sagasList, filterType, sortBy, searchTerm]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisibleCount(prev => prev + 12);
    }, { rootMargin: '400px' });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [filteredSagas, selectedSaga]);

  useEffect(() => {
    const handlePopState = () => {
      const sp = new URLSearchParams(window.location.search);
      if (!sp.get('comicId')) setSelectedComic(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openComic = (comic) => {
    setSelectedComic(comic);
    const url = new URL(window.location);
    url.searchParams.set('comicId', comic.id);
    window.history.pushState({ modal: true }, '', url.toString());
  };

  const closeComic = () => {
    setSelectedComic(null);
    const sp = new URLSearchParams(window.location.search);
    if (sp.has('comicId')) window.history.back();
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0e6d3] gap-4">
      <FaBookOpen size={48} color="#c85a17" className="animate-bounce" />
      <div className="font-mono text-[11px] text-[#1c1714] tracking-[0.25em] animate-pulse">
        LEYENDO ARCHIVOS DE LA BIBLIOTECA...
      </div>
    </div>
  );

  if (errorMsg) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1c1714] text-[#e63946] p-10 text-center font-chakra">
      <FaExclamationTriangle size={64} className="mb-5 text-[#c85a17]" />
      <h2 className="text-2xl font-bold m-0 uppercase">Error de Base de Datos</h2>
      <code className="bg-black p-3 mt-5 text-[#ff4d4d] border border-[#ff4d4d] text-xs">{errorMsg}</code>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f0e6d3] bg-[url('/grid.png')] bg-repeat font-chakra pb-20">

      {selectedComic && <ComicModal comic={selectedComic} onClose={closeComic} />}

      {/* ══ HERO HEADER ══ */}
      <div className="bg-[#1c1714] border-b-4 border-[#c85a17] px-6 py-10 md:p-12 relative overflow-hidden">
        {/* Fondo del Hero Dinámico */}
        {!selectedSaga && newestSaga && newestSaga.poster && (
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url(${newestSaga.poster})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-[#1c1714] via-[#1c1714]/80 to-transparent"></div>
          </div>
        )}
        
        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="h-1.5 w-24 bg-repeating-linear-gradient(45deg,#cfaa70,#cfaa70_10px,#1c1714_10px,#1c1714_20px) mb-6" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-[8px] md:text-[9px] text-[#c85a17] tracking-[0.3em] font-bold uppercase mb-2">
                <FaBookOpen size={10} /> {!selectedSaga ? 'RECIÉN AÑADIDO A LA BIBLIOTECA' : 'KONGFLIX · BIBLIOTECA GRÁFICA'}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-[5rem] font-black text-[#f0e6d3] uppercase tracking-tighter leading-none m-0 drop-shadow-[3px_3px_0_#c85a17] md:drop-shadow-[4px_4px_0_#c85a17] max-w-4xl">
                {selectedSaga ? selectedSaga.title : (newestSaga ? newestSaga.title : 'Comics')}
              </h1>

              <div className="flex flex-wrap gap-3 md:gap-5 mt-4">
                {!selectedSaga ? (
                  <>
                    <span className="font-mono text-[8px] md:text-[9px] text-[#d4b595] tracking-[0.2em] flex items-center gap-1.5 bg-[#1c1714] border border-[#5c4a3d] px-2 py-1">
                      <FaDatabase size={8} /> {filteredSagas.length} COLECCIONES
                    </span>
                    <span className="font-mono text-[8px] md:text-[9px] text-[#5c4a3d] tracking-[0.15em] flex items-center gap-1.5 px-2 py-1">
                      <FaList size={8} /> {comics.length.toLocaleString()} VOLÚMENES TOTALES
                    </span>
                    {newestSaga && (
                      <button onClick={() => navTo({ saga: newestSaga.title })} className="font-mono text-[8px] md:text-[9px] text-[#1c1714] tracking-[0.2em] bg-[#c85a17] hover:bg-[#d4b595] transition-colors flex items-center gap-1.5 border border-[#5c4a3d] px-4 py-1 font-bold cursor-pointer">
                        LEER AHORA
                      </button>
                    )}
                  </>
                ) : (
                  <span className="font-mono text-[8px] md:text-[9px] text-[#d4b595] tracking-[0.2em] flex items-center gap-1.5 bg-[#1c1714] border border-[#5c4a3d] px-2 py-1">
                    <FaBookOpen size={8} /> {selectedSaga.issueCount} VOLÚMENES DISPONIBLES
                  </span>
                )}
              </div>
            </div>

            {selectedSaga && (
              <button
                onClick={() => window.history.back()}
                className="flex items-center justify-center w-full md:w-auto gap-2 bg-[#f0e6d3] border-2 border-[#f0e6d3] px-4 py-2.5 font-chakra text-[10px] font-black tracking-widest uppercase text-[#1c1714] hover:bg-[#c85a17] hover:text-white hover:border-[#c85a17] transition-colors"
              >
                <FaArrowLeft size={12} /> VOLVER AL CATÁLOGO
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══ TOOLBAR DE FILTROS ══ */}
      {!selectedSaga && (
        <div className="bg-[#e8d5b7] border-b-2 border-[#d4b595] overflow-x-auto scrollbar-hide sticky top-[64px] z-30 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center justify-between min-w-max gap-4">
            <div className="flex items-center">
              {uniqueFamilies.map(type => (
                <button
                  key={type}
                  onClick={() => { setFilterType(type); setVisibleCount(12); }}
                  className={`px-4 md:px-6 py-3 border-none font-mono text-[8px] md:text-[9px] font-bold tracking-widest uppercase cursor-pointer transition-all border-b-[3px] ${
                    filterType === type
                      ? 'border-b-[#c85a17] bg-[#c85a17] text-white'
                      : 'border-b-transparent bg-transparent text-[#5c4a3d] hover:bg-[#d4b595] hover:text-[#1c1714]'
                  }`}
                >
                  {type === 'all' ? 'VER TODO' : type}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 py-2 pr-4">
              <input 
                type="text" 
                placeholder="BUSCAR CÓMIC..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-[#1c1714] text-[#d4b595] border border-[#5c4a3d] px-3 py-1.5 font-mono text-[10px] uppercase font-bold outline-none w-40 md:w-56 focus:border-[#c85a17] transition-colors"
              />
              <span className="font-mono text-[9px] font-bold text-[#5c4a3d] tracking-widest uppercase ml-2 hidden md:inline">Ordenar por:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#1c1714] text-[#d4b595] border border-[#5c4a3d] px-2 py-1.5 font-mono text-[10px] uppercase font-bold outline-none cursor-pointer"
              >
                <option value="alfabetico">ALFABÉTICO</option>
                <option value="recientes">RECIÉN SUBIDOS</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ══ CONTENIDO PRINCIPAL ══ */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 md:py-12">

        {/* CATÁLOGO DE SAGAS */}
        {!selectedSaga && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5">
              {filteredSagas.slice(0, visibleCount).map(saga => (
                <div key={saga.id} className="relative group cursor-pointer h-full" onClick={() => navTo({ saga: saga.title })}>
                  <MediaCard media={{ ...saga, year: '' }} onClick={() => navTo({ saga: saga.title })} />
                  <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 bg-[#c85a17] text-white text-[8px] md:text-[9px] font-black px-1.5 md:px-2 py-0.5 font-mono tracking-widest shadow-sm z-20 group-hover:bg-[#1c1714] transition-colors">
                    {saga.issueCount} VOLS
                  </div>
                </div>
              ))}
            </div>

            <div ref={loaderRef} className="py-12 flex justify-center items-center">
              {visibleCount < filteredSagas.length && (
                <div className="flex items-center gap-3 text-[#c85a17] font-mono text-[10px] font-bold tracking-widest">
                  <FaSpinner className="animate-spin text-lg" /> CARGANDO MÁS...
                </div>
              )}
            </div>
          </>
        )}

        {/* VOLÚMENES */}
        {selectedSaga && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5">
              {selectedSaga.issues.map(comic => {
                const imgUrl = comic.coverId
                  ? `https://drive.google.com/thumbnail?id=${comic.coverId}&sz=w600`
                  : null;

                return (
                  <div key={comic.id} className="w-full h-full">
                    <MediaCard
                      media={{
                        ...comic,
                        title: comic.titleClean,
                        name: comic.titleClean,
                        poster: imgUrl,
                        year: ''
                      }}
                      onClick={() => openComic(comic)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
