import { useState, useMemo, useEffect, useRef } from 'react';
import { FaTimes, FaTerminal, FaPlay, FaDatabase, FaExternalLinkAlt } from 'react-icons/fa';
import { useWatchProgress } from '../hooks/useWatchProgress';
import ShareButton from './ShareButton';

// ─── MOTOR DE REPRODUCCIÓN (IFRAME FIRST) ──────────────
function DrivePlayer({ episode, seriesName, initialTime = 0, saveProgress, markFinished, onVideoEnded, onNext, onPrev, hasNext, hasPrev, isAutoplay, setIsAutoplay }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const lastSavedTime = useRef(initialTime);
  const hasResumed = useRef(false);
  const [forceRender, setForceRender] = useState(false);
  const [useIframe, setUseIframe] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [subtitleUrl, setSubtitleUrl] = useState(null);
  const [subtitlesActive, setSubtitlesActive] = useState(true);

  useEffect(() => {
    if (episode.subtitleId) {
      // Forzar mime type correcto para subtitulos VTT interceptando el stream de drive y creando un objeto Blob
      fetch(`https://kongflix-app.duckdns.org/stream/${episode.subtitleId}`)
        .then(res => {
            if (!res.ok) throw new Error("Status " + res.status);
            return res.text();
        })
        .then(text => {
           console.log("Subtitle downloaded, first 100 chars:", text.substring(0, 100));
           if (!text.includes('WEBVTT') && text.includes('-->')) {
               console.log("Converting SRT to VTT on the fly...");
               text = 'WEBVTT\n\n' + text.replace(/,/g, '.');
           }
           const vttBlob = new Blob([text], { type: 'text/vtt' });
           setSubtitleUrl(URL.createObjectURL(vttBlob));
        })
        .catch(err => console.error("No se pudieron cargar los subtítulos", err));
    } else {
      setSubtitleUrl(null);
    }
  }, [episode.subtitleId]);

  // Robustamente forzar el track mode a showing cuando la URL del subtitulo está lista
  useEffect(() => {
    if (subtitleUrl && videoRef.current) {
      const forceMode = () => {
         const tracks = videoRef.current.textTracks;
         if (tracks && tracks.length > 0) {
             for (let i = 0; i < tracks.length; i++) {
                 tracks[i].mode = subtitlesActive ? 'showing' : 'hidden';
             }
         }
      };
      forceMode();
      setTimeout(forceMode, 100);
      setTimeout(forceMode, 500);
      setTimeout(forceMode, 1000);
    }
  }, [subtitleUrl, subtitlesActive]);

  const driveId = episode.driveId;
  const viewUrl   = `https://drive.google.com/file/d/${driveId}/view`;

  // Reiniciar estado interno si cambias de episodio rápidamente
  useEffect(() => {
    lastSavedTime.current = initialTime;
    hasResumed.current = false;
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
    window._nervCurrentTime = Math.floor(current);

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

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const copyUrl = (withTime = false) => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('id', episode.id);
    if (withTime && window._nervCurrentTime) {
      url.searchParams.set('t', window._nervCurrentTime);
    }
    navigator.clipboard.writeText(url.toString());
    closeContextMenu();
  };

  const toggleFullscreen = () => {
    const el = containerRef.current; // Element to make fullscreen
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen(); // Safari
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (videoRef.current.requestPictureInPicture) {
      await videoRef.current.requestPictureInPicture();
    }
  };

  const toggleSubtitles = () => {
    if (!videoRef.current) return;
    const tracks = videoRef.current.textTracks;
    if (tracks && tracks.length > 0) {
      const isShowing = tracks[0].mode === 'showing';
      tracks[0].mode = isShowing ? 'hidden' : 'showing';
      setSubtitlesActive(!isShowing);
      setForceRender(prev => !prev);
    }
  };

  useEffect(() => {
    return () => {
      if (lastSavedTime.current > 0 && !useIframe) {
        syncProgressToDB(Math.floor(lastSavedTime.current));
      }
    };
  }, [useIframe]);

  // Integrar MediaSession API para soportar botones Siguiente/Anterior en Video Flotante (PiP) y control de medios del sistema
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${seriesName} - T${String(episode.season).padStart(2,'0')}E${String(episode.episode).padStart(2,'0')}`,
        artist: 'Kongflix',
        album: seriesName,
        artwork: [
          { src: episode.poster || episode.coverId || 'https://via.placeholder.com/512x512', sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      if (hasPrev) {
        navigator.mediaSession.setActionHandler('previoustrack', onPrev);
      } else {
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }

      if (hasNext) {
        navigator.mediaSession.setActionHandler('nexttrack', onNext);
      } else {
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }
    }
  }, [episode, seriesName, hasPrev, hasNext, onPrev, onNext]);

  if (!driveId) return <div className="text-[#c85a17] p-10 font-bold uppercase flex h-full items-center justify-center">NO_DRIVE_ID_FOUND</div>;

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col bg-black" onClick={closeContextMenu}>
      <div 
        className="relative w-full flex-1 min-h-0 bg-black flex items-center justify-center group"
        onContextMenu={handleContextMenu}
      >
        {!useIframe ? (
          <video
            ref={videoRef}
            src={`https://kongflix-app.duckdns.org/stream/${driveId}`}
            autoPlay={isAutoplay}
            controls
            playsInline
            crossOrigin="anonymous"
            controlsList="nodownload"
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={async () => {
              await syncProgressToDB(Math.floor(videoRef.current.currentTime), true);
              if (onVideoEnded) onVideoEnded();
            }}
            onContextMenu={(e) => { e.preventDefault(); handleContextMenu(e); }}
            onError={handleNetworkDrop}
            className="w-full h-full outline-none object-contain"
            style={{ filter: 'contrast(1.05)' }} 
          >
            {subtitleUrl && (
              <track 
                 kind="subtitles" 
                 src={subtitleUrl} 
                 srcLang="es" 
                 label="Español" 
                 default 
              />
            )}
          </video>
        ) : (
          <iframe
            src={`https://drive.google.com/file/d/${driveId}/preview?usp=sharing`}
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



        {contextMenu && (
          <div 
            className="fixed z-[9999] bg-[#29221c] border border-[#5c4a3d] shadow-[4px_4px_0_0_#1c1714] flex flex-col py-2 w-64"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); copyUrl(false); }}
              className="text-left px-4 py-2 text-[11px] font-black uppercase text-[#d4b595] hover:bg-[#c85a17] hover:text-[#1c1714] transition-colors"
            >
              Copiar URL del episodio
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); copyUrl(true); }}
              className="text-left px-4 py-2 text-[11px] font-black uppercase text-[#d4b595] hover:bg-[#c85a17] hover:text-[#1c1714] transition-colors"
            >
              Copiar URL en el momento actual
            </button>
          </div>
        )}
      </div>

      <div className="min-h-[45px] py-2 md:py-0 shrink-0 bg-[#1c1714] border-t-2 border-[#5c4a3d] flex flex-wrap md:flex-nowrap items-center px-2 md:px-4 gap-2">
        <button
          onClick={() => setUseIframe(!useIframe)}
          className={`px-2 md:px-3 py-1.5 text-[9px] font-black tracking-widest uppercase font-mono transition-colors border shrink-0 ${
            !useIframe 
            ? 'bg-[#5c4a3d] text-[#1c1714] border-[#d4b595]' 
            : 'bg-transparent text-[#c85a17] border-[#c85a17] hover:bg-[#c85a17] hover:text-[#1c1714]'
          }`}
        >
          {!useIframe ? <><span className="hidden md:inline">⟵ VOLVER A MODO SEGURO (IFRAME)</span><span className="md:inline hidden">⟵ MODO SEGURO</span><span className="md:hidden">IFRAME</span></> : <><span className="hidden md:inline">⚠ PROBAR MOTOR DIRECTO</span><span className="md:hidden">⚠ DIRECTO</span></>}
        </button>

        {useIframe && (
          <button 
            onClick={handleMarkAsFinished}
            className="bg-[#29221c] text-[#d4b595] border border-[#5c4a3d] px-2 md:px-3 py-1.5 text-[9px] font-black tracking-widest uppercase hover:bg-[#d4b595] hover:text-[#1c1714] transition-colors shrink-0 flex items-center gap-1 md:gap-2"
          >
            <FaDatabase /> <span className="hidden md:inline">{isSaving ? 'GUARDANDO...' : 'MARCAR COMO VISTO'}</span><span className="md:hidden">{isSaving ? 'OK...' : 'VISTO'}</span>
          </button>
        )}

        <div className="flex-1 min-w-[5px] md:min-w-[20px]" />

        {/* CONTROLES DE PANTALLA Y AUTOPLAY JUNTO AL DRIVE LINK */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3 shrink-0 mr-1 md:mr-2 pr-1 md:pr-4 border-r border-[#5c4a3d]">
          
            {/* Controles Prev / Next */}
            <div className="flex items-center gap-1 bg-[#1c1714] border border-[#5c4a3d] rounded p-0.5">
              <button onClick={onPrev} disabled={!hasPrev} className={`p-1.5 transition-colors rounded ${hasPrev ? 'text-[#c85a17] hover:text-white hover:bg-[#5c4a3d]' : 'text-[#5c4a3d] opacity-50 cursor-not-allowed'}`} title="Anterior">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
              </button>
              <button onClick={onNext} disabled={!hasNext} className={`p-1.5 transition-colors rounded ${hasNext ? 'text-[#c85a17] hover:text-white hover:bg-[#5c4a3d]' : 'text-[#5c4a3d] opacity-50 cursor-not-allowed'}`} title="Siguiente">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              </button>
            </div>

            <div className="w-[1px] h-4 bg-[#5c4a3d] mx-0.5 md:mx-1"></div>

            <div className="flex items-center gap-1">
              <button onClick={toggleSubtitles} disabled={useIframe} className={`border border-[#5c4a3d] rounded p-1 transition-colors flex items-center justify-center w-7 h-7 ${useIframe ? 'text-[#5c4a3d] opacity-50 cursor-not-allowed bg-[#29221c]' : (subtitlesActive ? 'bg-[#c85a17] text-white border-[#c85a17]' : 'bg-[#29221c] text-[#d4b595] hover:bg-[#5c4a3d]')}`} title="Subtítulos (CC)">
                 <span className="text-[10px] font-black font-sans leading-none pt-[1px]">CC</span>
              </button>
              <button onClick={togglePiP} disabled={useIframe} className={`bg-[#29221c] border border-[#5c4a3d] rounded p-1.5 transition-colors ${useIframe ? 'text-[#5c4a3d] opacity-50 cursor-not-allowed' : 'hover:text-[#1c1714] hover:bg-[#c85a17] text-[#d4b595]'}`} title="Pantalla Flotante (PiP)">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="12" y="11" width="7" height="8" rx="1" ry="1"/></svg>
              </button>
              <button onClick={toggleFullscreen} className="bg-[#29221c] border border-[#5c4a3d] rounded hover:text-[#1c1714] hover:bg-[#c85a17] text-[#d4b595] transition-colors p-1.5" title="Pantalla Completa">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              </button>
            </div>

            <div className="w-[1px] h-4 bg-[#5c4a3d] mx-0.5 md:mx-1 hidden md:block"></div>

            <label className="flex items-center gap-1 md:gap-2 cursor-pointer group">
              <span className="font-mono text-[8px] md:text-[9px] text-[#d4b595] font-bold uppercase tracking-widest group-hover:text-white transition-colors">Auto</span>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={isAutoplay} onChange={(e) => setIsAutoplay(e.target.checked)} />
                <div className={`block w-7 h-4 md:w-8 rounded-full transition-colors ${isAutoplay ? 'bg-[#c85a17]' : 'bg-[#5c4a3d]'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-[#1c1714] w-2 h-2 rounded-full transition-transform ${isAutoplay ? 'transform translate-x-3 md:translate-x-4' : ''}`}></div>
              </div>
            </label>
        </div>

        <a href={viewUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 md:gap-2 bg-[#29221c] text-[#d4b595] border border-[#5c4a3d] px-2 md:px-3 py-1.5 text-[9px] font-black tracking-widest uppercase no-underline font-mono whitespace-nowrap hover:bg-[#5c4a3d] transition-colors shrink-0">
          <FaExternalLinkAlt size={10} /> <span className="hidden md:inline">DRIVE_LINK</span><span className="md:hidden">DRIVE</span>
        </a>
      </div>
    </div>
  );
}

// ─── MODAL PRINCIPAL ───────────────────────────────────────────────────────
export default function SeriesModal({ seriesName, episodes, startEpId, onClose }) {
  const seasons = useMemo(() => {
    return episodes.reduce((acc, ep) => {
      const s = ep.season || 1;
      if (!acc[s]) acc[s] = [];
      acc[s].push(ep);
      return acc;
    }, {});
  }, [episodes]);

  const seasonNumbers = Object.keys(seasons).sort((a, b) => parseInt(a) - parseInt(b));
  
  // Find initial episode based on startEpId or default to the first one
  const initialEp = useMemo(() => {
    if (startEpId) {
      const found = episodes.find(e => e.id === startEpId);
      if (found) return found;
    }
    return seasons[seasonNumbers[0]][0];
  }, [episodes, startEpId, seasons, seasonNumbers]);

  const sortedEpisodes = useMemo(() => {
    return [...episodes].sort((a, b) => {
      const sA = a.season || 1;
      const sB = b.season || 1;
      if (sA !== sB) return sA - sB;
      return a.episode - b.episode;
    });
  }, [episodes]);

  const [activeSeason, setActiveSeason] = useState(initialEp.season || seasonNumbers[0]);
  const [currentEp, setCurrentEp] = useState(initialEp);
  const [isAutoplay, setIsAutoplay] = useState(true);

  const currentIndex = sortedEpisodes.findIndex(e => e.id === currentEp.id);
  const hasNext = currentIndex >= 0 && currentIndex < sortedEpisodes.length - 1;
  const hasPrev = currentIndex > 0;

  const handleNext = () => {
    if (hasNext) {
      const nextEp = sortedEpisodes[currentIndex + 1];
      setActiveSeason(nextEp.season || 1);
      setCurrentEp(nextEp);
    }
  };

  const handlePrev = () => {
    if (hasPrev) {
      const prevEp = sortedEpisodes[currentIndex - 1];
      setActiveSeason(prevEp.season || 1);
      setCurrentEp(prevEp);
    }
  };

  // Hook de progreso para el episodio activo
  const { loadProgress, saveProgress, markFinished } = useWatchProgress('series', currentEp.id);
  const [resumeTime, setResumeTime] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Update URL to match selected episode
  useEffect(() => {
    if (currentEp) {
      const url = new URL(window.location);
      url.searchParams.set('id', currentEp.id);
      window.history.replaceState({ modal: true }, '', url.toString());
    }
  }, [currentEp]);

  // Al cambiar de episodio, cargar su progreso desde DB
  useEffect(() => {
    setIsReady(false);
    
    // URL override for initial time
    const searchParams = new URLSearchParams(window.location.search);
    const urlTime = parseInt(searchParams.get('t'), 10) || 0;

    loadProgress().then((rec) => {
      if (urlTime > 0) {
        setResumeTime(urlTime);
      } else if (rec && rec.progress) {
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
                onVideoEnded={() => {
                  if (isAutoplay && hasNext) {
                    handleNext();
                  }
                }}
                onNext={handleNext}
                onPrev={handlePrev}
                hasNext={hasNext}
                hasPrev={hasPrev}
                isAutoplay={isAutoplay}
                setIsAutoplay={setIsAutoplay}
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
              {currentEp.titleClean?.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '') || currentEp.name?.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '') || '—'}
            </p>

            <p className="text-xs md:text-[13px] leading-relaxed text-[#1c1714] border-l-2 border-[#d4b595] pl-3 italic line-clamp-4 md:line-clamp-none">
              {currentEp.plot || 'Sinopsis clasificada bajo protocolo KONG.'}
            </p>
          </div>
        </div>

        {/* ══ LADO DERECHO: SELECTOR TEMPORADAS + EPISODIOS ══ */}
        <div className="flex-1 flex flex-col bg-[#f0e6d3] min-h-0 min-w-0 md:max-w-[380px] relative z-20">

          {/* Header */}
          <div className="p-3 md:p-4 bg-[#1c1714] border-b-2 md:border-b-4 border-[#c85a17] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 overflow-hidden">
              <FaTerminal size={10} className="text-[#c85a17] hidden md:block shrink-0" />
              <span className="font-mono text-[9px] md:text-[10px] font-bold text-[#d4b595] tracking-[0.2em] uppercase truncate">
                ARCHIVO // {seriesName}
              </span>
            </div>
          </div>

          {/* Tabs temporadas */}
          <div className="flex flex-wrap border-b-2 border-[#5c4a3d] bg-[#e8d5b7] shrink-0">
            {seasonNumbers.map(s => (
              <button
                key={s}
                onClick={() => { setActiveSeason(s); setCurrentEp(seasons[s][0]); }}
                className={`px-4 py-2.5 font-mono text-[9px] md:text-[10px] font-bold tracking-[0.15em] uppercase whitespace-nowrap border-r border-[#d4b595] transition-all border-b-4 flex-1 md:flex-none ${
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
                      {ep.titleClean?.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '') || ep.name?.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '') || `Episodio ${ep.episode}`}
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
        <div className="absolute top-0 right-0 z-[999] flex gap-0">
          <ShareButton 
            urlToShare={`${window.location.origin}${window.location.pathname}?id=${currentEp.id}&t=${window._nervCurrentTime || 0}`}
            className="border-none md:border-l-2 md:border-b-2 border-[#1c1714] bg-[#29221c] px-4 py-3 h-[42px]"
          />
          <button
            onClick={onClose}
            className="bg-[#c85a17] text-white border-none md:border-l-2 md:border-b-2 border-[#1c1714] px-4 py-3 cursor-pointer transition-colors hover:bg-[#1c1714] shadow-md h-[42px] flex items-center justify-center"
          >
            <FaTimes size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}