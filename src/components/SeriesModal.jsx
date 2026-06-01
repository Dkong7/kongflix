import { useState, useMemo, useEffect, useRef } from 'react';
import { FaTimes, FaTerminal, FaPlay, FaDatabase, FaExternalLinkAlt } from 'react-icons/fa';
import { useWatchProgress } from '../hooks/useWatchProgress';

// ─── MOTOR DE REPRODUCCIÓN (IFRAME FIRST) ──────────────
function DrivePlayer({ episode, seriesName, initialTime = 0, saveProgress, markFinished }) {
  const videoRef = useRef(null);
  const lastSavedTime = useRef(initialTime);
  const [useIframe, setUseIframe] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const driveId = episode.driveId;
  const streamUrl = `https://drive.google.com/uc?export=download&id=${driveId}&confirm=t`;
  const embedUrl  = `https://drive.google.com/file/d/${driveId}/preview?usp=sharing`;
  const viewUrl   = `https://drive.google.com/file/d/${driveId}/view`;

  // Reiniciar estado interno si cambias de episodio rápidamente
  useEffect(() => {
    lastSavedTime.current = initialTime;
    if (videoRef.current) {
      videoRef.current.currentTime = initialTime;
    }
  }, [episode.id, initialTime]);

  const syncProgressToDB = async (seconds, isFinished = false) => {
    try {
      const payload = {
        progress: seconds,
        total: videoRef.current?.duration ? Math.floor(videoRef.current.duration) : 0,
        title: `${seriesName} - T${episode.season}E${episode.episode}`,
        cover_id: episode.coverId || episode.poster || '',
        season: episode.season,
        episode: episode.episode
      };

      if (isFinished) {
        await markFinished(payload);
      } else {
        await saveProgress(payload);
      }
    } catch (e) {
      console.warn("NERV_SYNC_ERR:", e.message);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    lastSavedTime.current = current;

    // Guardado automático cada 10 segundos
    if (Math.floor(current) % 10 === 0 && current > 0) {
      syncProgressToDB(Math.floor(current));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && lastSavedTime.current > 0) {
      videoRef.current.currentTime = lastSavedTime.current;
    }
  };

  const handleNetworkDrop = () => {
    console.warn("NERV_WARNING: Stream directo bloqueado. Volviendo a Iframe...");
    setUseIframe(true);
  };

  const handleMarkAsFinished = async () => {
    setIsSaving(true);
    await syncProgressToDB(99999, true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  useEffect(() => {
    return () => {
      if (lastSavedTime.current > 0 && !useIframe) {
        syncProgressToDB(Math.floor(lastSavedTime.current));
      }
    };
  }, [useIframe]);

  if (!driveId) return <div className="text-[#c85a17] p-10 font-bold uppercase flex h-full items-center justify-center">NO_DRIVE_ID_FOUND</div>;

  return (
    <div className="w-full h-full flex flex-col bg-black">
      <div className="relative w-full flex-1 min-h-0 bg-black flex items-center justify-center">
        {!useIframe ? (
          <video
            ref={videoRef}
            src={`https://kongflix-app.duckdns.org/stream/${driveId}`}
            controls
            autoPlay
            playsInline
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={handleNetworkDrop}
            className="w-full h-full outline-none object-contain"
            style={{ filter: 'contrast(1.05)' }} 
          />
        ) : (
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full border-none"
            allow="autoplay; fullscreen"
            allowFullScreen
            title={`episode-${episode.episode}`}
          />
        )}
        
        {!useIframe && (
          <div className="absolute top-4 left-4 z-10 pointer-events-none font-chakra text-[#d4b595] text-[10px] font-bold tracking-widest opacity-60 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#c85a17] rounded-full animate-pulse"></span> DIRECT_LINK
          </div>
        )}
      </div>

      <div className="h-[45px] shrink-0 bg-[#1c1714] border-t-2 border-[#5c4a3d] flex items-center px-4 gap-2 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setUseIframe(!useIframe)}
          className={`px-3 py-1.5 text-[9px] font-black tracking-widest uppercase font-mono transition-colors border shrink-0 ${
            !useIframe 
            ? 'bg-[#5c4a3d] text-[#1c1714] border-[#d4b595]' 
            : 'bg-transparent text-[#c85a17] border-[#c85a17] hover:bg-[#c85a17] hover:text-[#1c1714]'
          }`}
        >
          {!useIframe ? '⟵ VOLVER A MODO SEGURO (IFRAME)' : '⚠ PROBAR MOTOR DIRECTO'}
        </button>

        {useIframe && (
          <button 
            onClick={handleMarkAsFinished}
            className="bg-[#29221c] text-[#d4b595] border border-[#5c4a3d] px-3 py-1.5 text-[9px] font-black tracking-widest uppercase hover:bg-[#d4b595] hover:text-[#1c1714] transition-colors shrink-0 flex items-center gap-2"
          >
            <FaDatabase /> {isSaving ? 'GUARDANDO...' : 'MARCAR COMO VISTO'}
          </button>
        )}

        <div className="flex-1 min-w-[20px]" />

        <a href={viewUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-[#29221c] text-[#d4b595] border border-[#5c4a3d] px-3 py-1.5 text-[9px] font-black tracking-widest uppercase no-underline font-mono whitespace-nowrap hover:bg-[#5c4a3d] transition-colors shrink-0">
          <FaExternalLinkAlt size={10} /> DRIVE_LINK
        </a>
      </div>
    </div>
  );
}

// ─── MODAL PRINCIPAL ───────────────────────────────────────────────────────
export default function SeriesModal({ seriesName, episodes, onClose }) {
  const seasons = useMemo(() => {
    return episodes.reduce((acc, ep) => {
      const s = ep.season || 1;
      if (!acc[s]) acc[s] = [];
      acc[s].push(ep);
      return acc;
    }, {});
  }, [episodes]);

  const seasonNumbers = Object.keys(seasons).sort((a, b) => parseInt(a) - parseInt(b));
  const [activeSeason, setActiveSeason] = useState(seasonNumbers[0]);
  const [currentEp, setCurrentEp] = useState(seasons[activeSeason][0]);

  // Hook de progreso para el episodio activo
  const { loadProgress, saveProgress, markFinished } = useWatchProgress('series', currentEp.id);
  const [resumeTime, setResumeTime] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Al cambiar de episodio, cargar su progreso desde DB
  useEffect(() => {
    setIsReady(false);
    loadProgress().then((rec) => {
      if (rec && rec.progress) {
        setResumeTime(rec.progress);
      } else {
        setResumeTime(0);
      }
      setIsReady(true);
    });
  }, [currentEp.id, loadProgress]);

  // Bloquear scroll trasero al abrir modal
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-[#1c1714]/85 backdrop-blur-md font-chakra">
      
      <div className="w-full max-w-[1280px] h-full md:h-[90vh] bg-[#f0e6d3] border-0 md:border-4 border-[#1c1714] md:shadow-[8px_8px_0_0_#c85a17] flex flex-col md:flex-row overflow-hidden relative">

        {/* ══ LADO IZQUIERDO: PLAYER + INFO ══ */}
        <div className="flex-[2] flex flex-col border-b-2 md:border-b-0 md:border-r-4 border-[#5c4a3d] bg-[#e8d5b7] overflow-hidden">
          
          {/* Player Container */}
          <div className="relative aspect-[16/9] md:aspect-auto md:h-[60%] w-full bg-[#1c1714] flex-shrink-0 flex flex-col z-10">
            {!isReady ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
                <div className="w-10 h-10 border-4 border-[#5c4a3d] border-t-[#c85a17] rounded-full animate-spin" />
                <span className="text-[#c85a17] text-[10px] font-black uppercase tracking-widest animate-pulse">
                  SINCRONIZANDO...
                </span>
              </div>
            ) : (
              <DrivePlayer 
                episode={currentEp} 
                seriesName={seriesName}
                initialTime={resumeTime} 
                saveProgress={saveProgress} 
                markFinished={markFinished} 
              />
            )}
            
            {/* Badge visual (sólo info) */}
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-[#1c1714]/85 border border-[#c85a17] text-[#c85a17] font-mono text-[9px] font-bold tracking-widest px-2.5 py-1 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c85a17] animate-pulse" />
              EP_{String(currentEp.episode).padStart(2,'0')}
            </div>
          </div>

          {/* Info del episodio */}
          <div className="p-4 md:p-6 overflow-y-auto flex-1 shrink-0">
            <div className="border-l-4 border-[#c85a17] pl-3 mb-4">
              <h2 className="text-lg md:text-2xl lg:text-3xl font-black uppercase tracking-tighter text-[#1c1714] m-0 leading-none pr-8">
                {seriesName}
              </h2>
              <div className="font-mono text-[9px] md:text-[10px] text-[#c85a17] tracking-widest mt-2 font-bold uppercase">
                T{String(currentEp.season).padStart(2,'0')} · EP{String(currentEp.episode).padStart(2,'0')}
                {currentEp.tmdbTitle && ` // ${currentEp.tmdbTitle}`}
              </div>
            </div>

            <p className="font-mono text-[10px] md:text-[11px] font-bold text-[#5c4a3d] uppercase tracking-widest mb-3 line-clamp-1">
              {currentEp.name?.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '') || '—'}
            </p>

            <p className="text-xs md:text-[13px] leading-relaxed text-[#1c1714] border-l-2 border-[#d4b595] pl-3 italic line-clamp-4 md:line-clamp-none">
              {currentEp.plot || 'Sinopsis clasificada bajo protocolo KONG.'}
            </p>
          </div>
        </div>

        {/* ══ LADO DERECHO: SELECTOR TEMPORADAS + EPISODIOS ══ */}
        <div className="flex-1 flex flex-col bg-[#f0e6d3] min-w-0 md:max-w-[380px] relative z-20">

          {/* Header */}
          <div className="p-3 md:p-4 bg-[#1c1714] border-b-2 md:border-b-4 border-[#c85a17] flex items-center gap-2 shrink-0">
            <FaTerminal size={10} className="text-[#c85a17] hidden md:block" />
            <span className="font-mono text-[9px] md:text-[10px] font-bold text-[#d4b595] tracking-[0.2em] uppercase truncate">
              ARCHIVO // {seriesName}
            </span>
          </div>

          {/* Tabs temporadas */}
          <div className="flex overflow-x-auto border-b-2 border-[#5c4a3d] bg-[#e8d5b7] shrink-0 scrollbar-hide">
            {seasonNumbers.map(s => (
              <button
                key={s}
                onClick={() => { setActiveSeason(s); setCurrentEp(seasons[s][0]); }}
                className={`px-4 py-2.5 font-mono text-[9px] md:text-[10px] font-bold tracking-[0.15em] uppercase whitespace-nowrap border-r border-[#d4b595] transition-all border-b-4 ${
                  activeSeason === s 
                  ? 'border-b-[#c85a17] bg-[#c85a17] text-white' 
                  : 'border-b-transparent text-[#5c4a3d] hover:bg-[#d4b595]'
                }`}
              >
                T{String(s).padStart(2,'0')}
              </button>
            ))}
          </div>

          {/* Sub-header temporada activa */}
          <div className="p-2 px-4 bg-[#e8d5b7] border-b border-[#d4b595] shrink-0">
            <span className="font-mono text-[8px] md:text-[9px] text-[#5c4a3d] tracking-[0.2em] uppercase font-bold">
              TEMPORADA_{activeSeason} · {seasons[activeSeason]?.length} EPISODIOS
            </span>
          </div>

          {/* Lista episodios */}
          <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
            {seasons[activeSeason]?.map(ep => {
              const isActive = currentEp.id === ep.id;
              return (
                <button
                  key={ep.id}
                  onClick={() => setCurrentEp(ep)}
                  className={`w-full text-left px-3 py-2.5 flex justify-between items-center cursor-pointer border-l-4 mb-1 transition-all shadow-sm active:scale-[0.98] ${
                    isActive 
                    ? 'border-l-[#c85a17] bg-[#e8d5b7] shadow-[2px_2px_0_0_#5c4a3d]' 
                    : 'border-l-transparent bg-transparent hover:bg-[#e8d5b7]'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className={`font-mono text-[8px] md:text-[9px] font-bold tracking-[0.15em] uppercase mb-0.5 ${isActive ? 'text-[#c85a17]' : 'text-[#5c4a3d]'}`}>
                      EP {String(ep.episode).padStart(2,'0')}
                    </span>
                    <span className={`font-chakra text-[11px] md:text-xs truncate ${isActive ? 'font-bold text-[#1c1714]' : 'text-[#1c1714]'}`}>
                      {ep.name?.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '') || `Episodio ${ep.episode}`}
                    </span>
                  </div>
                  {isActive && (
                    <FaPlay size={9} className="text-[#c85a17] shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── BOTÓN CERRAR (CAPA SUPERIOR ABSOLUTA) ── */}
        <button
          onClick={onClose}
          className="absolute top-0 right-0 z-[999] bg-[#c85a17] text-white border-none md:border-l-2 md:border-b-2 border-[#1c1714] px-4 py-3 cursor-pointer transition-colors hover:bg-[#1c1714] shadow-md"
        >
          <FaTimes size={18} />
        </button>

      </div>
    </div>
  );
}