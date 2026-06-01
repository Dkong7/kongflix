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

  const [visibleCount, setVisibleCount] = useState(12);
  const loaderRef = useRef(null);

  const MANGA_FAMILIES = ['Ranma ½', 'Dragon Ball', 'Saint Seiya', 'Evangelion'];

  useEffect(() => {
    pb.collection('comics_db').getFullList({
      sort: 'family,titleClean',
      requestKey: null
    }).then(records => {
      setComics(records);
      setLoading(false);
    }).catch(err => {
      setErrorMsg(err.message);
      setLoading(false);
    });
  }, []);

  const sagasList = useMemo(() => {
    const grouped = comics.reduce((acc, comic) => {
      const f = comic.family || "Otros Cómics";
      if (!acc[f]) acc[f] = [];
      acc[f].push(comic);
      return acc;
    }, {});

    return Object.keys(grouped).sort().map(familyName => {
      const issues = grouped[familyName].sort((a, b) => a.titleClean.localeCompare(b.titleClean, undefined, { numeric: true }));

      let type = MANGA_FAMILIES.includes(familyName) ? 'manga' : 'comic';
      const isArtbook = issues.some(c =>
        /art of|artbook|sketchbook|concept|ilustraciones/i.test(`${c.titleClean} ${c.folderName}`)
      );
      if (isArtbook) type = 'artbook';

      const firstWithCover = issues.find(c => c.coverId) || issues[0];
      const imgUrl = firstWithCover.coverId
        ? `https://drive.google.com/thumbnail?id=${firstWithCover.coverId}&sz=w600`
        : null;

      return {
        id: `saga_${familyName}`,
        title: familyName,
        name: familyName,
        type: type,
        poster: imgUrl,
        issueCount: issues.length,
        issues: issues
      };
    });
  }, [comics]);

  /* Derivar selectedSaga del nombre en la URL */
  const selectedSaga = selectedSagaName ? sagasList.find(s => s.title === selectedSagaName) : null;

  const filteredSagas = useMemo(() =>
    sagasList.filter(saga => filterType === 'all' || saga.type === filterType),
    [sagasList, filterType]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisibleCount(prev => prev + 12);
    }, { rootMargin: '400px' });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [filteredSagas, selectedSaga]);

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

      {selectedComic && <ComicModal comic={selectedComic} onClose={() => setSelectedComic(null)} />}

      {/* ══ HERO HEADER ══ */}
      <div className="bg-[#1c1714] border-b-4 border-[#c85a17] px-6 py-10 md:p-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="h-1.5 w-24 bg-repeating-linear-gradient(45deg,#cfaa70,#cfaa70_10px,#1c1714_10px,#1c1714_20px) mb-6" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-[8px] md:text-[9px] text-[#c85a17] tracking-[0.3em] font-bold uppercase mb-2">
                <FaBookOpen size={10} /> KONGFLIX · BIBLIOTECA GRÁFICA
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-[5rem] font-black text-[#f0e6d3] uppercase tracking-tighter leading-none m-0 drop-shadow-[3px_3px_0_#c85a17] md:drop-shadow-[4px_4px_0_#c85a17]">
                {selectedSaga ? selectedSaga.title : 'Comics'}
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
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center min-w-max">
            {['all', 'comic', 'manga', 'artbook'].map(type => (
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
                      onClick={() => setSelectedComic(comic)}
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
