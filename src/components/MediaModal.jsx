import { useState, useEffect, useRef, useCallback } from 'react';
import { FaTimes, FaDatabase, FaCalendarAlt, FaSignal, FaBiohazard, FaExternalLinkAlt } from 'react-icons/fa';
import { useWatchProgress } from '../hooks/useWatchProgress';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

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

// ─── PROXY PLAYER CON VIDEO.JS + ATAJOS YOUTUBE ──────────────
function ProxyPlayer({ media, initialTime = 0, saveProgress, markFinished }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const lastSavedTime = useRef(initialTime);

  const driveId = media.driveId;
  const streamUrl = `/stream/${driveId}`;

  const syncProgressToDB = useCallback(async (seconds, isFinished = false) => {
    try {
      const payload = {
        progress: seconds,
        total: playerRef.current?.duration?.() ? Math.floor(playerRef.current.duration()) : 0,
        title: media.tmdbTitle || media.name || media.title,
        cover_id: media.coverId || media.poster || ''
      };
      if (isFinished) await markFinished(payload);
      else await saveProgress(payload);
    } catch (e) {
      console.warn("NERV_SYNC_ERR:", e.message);
    }
  }, [media, saveProgress, markFinished]);

  const syncProgressToDBRef = useRef(syncProgressToDB);
  useEffect(() => {
    syncProgressToDBRef.current = syncProgressToDB;
  }, [syncProgressToDB]);

  useEffect(() => {
    if (!driveId || !containerRef.current || playerRef.current) return;

    const videoEl = document.createElement('video-js');
    videoEl.classList.add('vjs-big-play-centered', 'vjs-theme-nerv', 'w-full', 'h-full');
    containerRef.current.appendChild(videoEl);

    const player = playerRef.current = videojs(videoEl, {
      autoplay: false,       // NO autoplay → usuario da click → audio habilitado
      controls: true,
      responsive: true,
      fluid: false,
      fill: true,
      preload: 'metadata',   // Solo metadata primero → Range requests para playback
      sources: [{ src: streamUrl, type: 'video/mp4' }],
      playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      userActions: { hotkeys: false },
      html5: {
        vhs: { overrideNative: false },
        nativeAudioTracks: true,
        nativeVideoTracks: true,
        nativeTextTracks: true,
      },
      controlBar: {
        children: [
          'playToggle',
          'volumePanel',
          'currentTimeDisplay',
          'timeDivider',
          'durationDisplay',
          'progressControl',
          'playbackRateMenuButton',
          'pictureInPictureToggle',
          'fullscreenToggle',
        ],
        volumePanel: { inline: true },
      },
    });

    // Restaurar posición guardada
    player.on('loadedmetadata', () => {
      if (initialTime > 0) player.currentTime(initialTime);
    });

    // Guardar progreso cada 10s
    player.on('timeupdate', () => {
      const t = Math.floor(player.currentTime());
      if (t !== lastSavedTime.current) {
        lastSavedTime.current = t;
        if (t % 10 === 0 && t > 0) syncProgressToDBRef.current(t);
      }
    });

    // ── RECUPERACIÓN DE BUFFERING ──
    player.on('waiting', () => {
      console.log('[NERV] Buffering...');
    });

    player.on('error', () => {
      const err = player.error();
      console.error('[NERV] Player error:', err);
      // Si es error de red, intentar re-cargar desde la posición actual
      if (err && err.code === 2) { // MEDIA_ERR_NETWORK
        const ct = lastSavedTime.current;
        setTimeout(() => {
          player.src({ src: streamUrl, type: 'video/mp4' });
          player.one('loadedmetadata', () => {
            player.currentTime(ct);
            player.play();
          });
        }, 2000);
      }
    });

    // ── ATAJOS DE TECLADO ESTILO YOUTUBE ──
    const handleKeyDown = (e) => {
      if (!playerRef.current || playerRef.current.isDisposed()) return;
      const p = playerRef.current;
      const dur = p.duration() || 0;
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      switch (e.key) {
        // ── PLAY / PAUSE ──
        case ' ':
        case 'k':
          e.preventDefault();
          p.paused() ? p.play() : p.pause();
          break;

        // ── SEEK ──
        case 'ArrowLeft':
          e.preventDefault();
          p.currentTime(Math.max(0, p.currentTime() - 5));
          break;
        case 'ArrowRight':
          e.preventDefault();
          p.currentTime(Math.min(dur, p.currentTime() + 5));
          break;
        case 'j':
          e.preventDefault();
          p.currentTime(Math.max(0, p.currentTime() - 10));
          break;
        case 'l':
          e.preventDefault();
          p.currentTime(Math.min(dur, p.currentTime() + 10));
          break;

        // ── VOLUMEN ──
        case 'ArrowUp':
          e.preventDefault();
          p.volume(Math.min(1, p.volume() + 0.05));
          p.muted(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          p.volume(Math.max(0, p.volume() - 0.05));
          break;
        case 'm':
          e.preventDefault();
          p.muted(!p.muted());
          break;

        // ── PORCENTAJE 0-9 (como YouTube) ──
        case '0': case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
          e.preventDefault();
          if (dur > 0) p.currentTime(dur * (parseInt(e.key) / 10));
          break;

        // ── FRAME A FRAME (punto = adelante, coma = atrás) ──
        case '.':
          e.preventDefault();
          p.pause();
          p.currentTime(p.currentTime() + (1 / 24));
          break;
        case ',':
          e.preventDefault();
          p.pause();
          p.currentTime(Math.max(0, p.currentTime() - (1 / 24)));
          break;

        // ── VELOCIDAD ──
        case '>':
          e.preventDefault();
          p.playbackRate(Math.min(4, p.playbackRate() + 0.25));
          break;
        case '<':
          e.preventDefault();
          p.playbackRate(Math.max(0.25, p.playbackRate() - 0.25));
          break;

        // ── FULLSCREEN ──
        case 'f':
          e.preventDefault();
          p.isFullscreen() ? p.exitFullscreen() : p.requestFullscreen();
          break;

        // ── HOME / END ──
        case 'Home':
          e.preventDefault();
          p.currentTime(0);
          break;
        case 'End':
          e.preventDefault();
          if (dur > 0) p.currentTime(dur - 1);
          break;

        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (player && !player.isDisposed()) {
        syncProgressToDBRef.current(Math.floor(player.currentTime()));
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [driveId, initialTime, streamUrl]);

  return (
    <div className="w-full h-full relative bg-black">
      <div ref={containerRef} className="w-full h-full" />

      {/* HUD Overlay */}
      <div className="absolute top-4 left-6 z-10 pointer-events-none font-chakra text-[#d4b595] text-xs font-bold tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#c85a17] rounded-full animate-pulse" />
          <span>PROXY_STREAM</span>
        </div>
        <div className="mt-1 font-mono text-[10px] text-[#c85a17]">CH_01 // LIVE</div>
      </div>

      <style>{`
        .vjs-theme-nerv .vjs-control-bar {
          background: rgba(28, 23, 20, 0.95) !important;
          border-top: 1px solid #5c4a3d;
          font-family: 'Chakra Petch', sans-serif;
        }
        .vjs-theme-nerv .vjs-play-progress { background: #c85a17 !important; }
        .vjs-theme-nerv .vjs-slider { background: rgba(92, 74, 61, 0.4); }
        .vjs-theme-nerv .vjs-load-progress div { background: rgba(212,181,149,0.2) !important; }
        .vjs-theme-nerv .vjs-big-play-button {
          background-color: rgba(200, 90, 23, 0.85) !important;
          border: 2px solid #d4b595 !important;
          border-radius: 0 !important;
        }
        .vjs-theme-nerv .vjs-time-control { color: #d4b595; }
        .vjs-theme-nerv .vjs-volume-bar.vjs-slider-bar { background: rgba(200,90,23,0.3); }
        .vjs-theme-nerv .vjs-volume-level { background: #c85a17; }
        .vjs-theme-nerv .vjs-playback-rate .vjs-playback-rate-value { color: #c85a17; font-weight: 900; }
        .vjs-theme-nerv .vjs-menu-content { background: rgba(28,23,20,0.97) !important; border: 1px solid #5c4a3d; }
        .vjs-theme-nerv .vjs-menu li { color: #d4b595 !important; font-size: 11px; }
        .vjs-theme-nerv .vjs-menu li.vjs-selected { background: #c85a17 !important; color: #1c1714 !important; }
        .vjs-theme-nerv .vjs-menu li:hover { background: #5c4a3d !important; }
      `}</style>
    </div>
  );
}

// ─── MOTOR DE REPRODUCCIÓN (PROXY FIRST) ──────────────
function DrivePlayer({ media, initialTime = 0, saveProgress, markFinished }) {
  const [useIframe, setUseIframe] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [proxyKey, setProxyKey] = useState(0);

  const driveId = media.driveId;
  const embedUrl = `https://drive.google.com/file/d/${driveId}/preview?usp=sharing`;
  const viewUrl  = `https://drive.google.com/file/d/${driveId}/view`;

  const handleMarkAsFinished = async () => {
    setIsSaving(true);
    try {
      await markFinished({
        progress: 99999,
        total: 0,
        title: media.tmdbTitle || media.name || media.title,
        cover_id: media.coverId || media.poster || ''
      });
    } catch (e) {
      console.warn("NERV_SYNC_ERR:", e.message);
    }
    setTimeout(() => setIsSaving(false), 1000);
  };

  const toggleMode = () => {
    setUseIframe(prev => {
      if (prev) setProxyKey(k => k + 1);
      return !prev;
    });
  };

  if (!driveId) return <div className="text-[#c85a17] p-10 font-bold uppercase flex h-full items-center justify-center">NO_DRIVE_ID_FOUND</div>;

  return (
    <div className="w-full h-full flex flex-col bg-black">
      <div className="relative w-full flex-1 min-h-0 bg-black flex items-center justify-center group">
        {!useIframe ? (
          <ProxyPlayer
            key={proxyKey}
            media={media}
            initialTime={initialTime}
            saveProgress={saveProgress}
            markFinished={markFinished}
          />
        ) : (
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full border-none"
            allow="autoplay; fullscreen"
            allowFullScreen
            title="video-player"
          />
        )}
      </div>

      <div className="h-[45px] shrink-0 bg-[#1c1714] border-t-2 border-[#5c4a3d] flex items-center px-4 gap-2 overflow-x-auto scrollbar-hide">
        <button
          onClick={toggleMode}
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

// ─── POSTER DEL MODAL ──────────────────────────────────────────────────────
function PosterImageModal({ input, alt, className }) {
  const variants = buildUrlVariants(input);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed || !variants.length) {
    return (
      <div className={`bg-[#29221c] flex items-center justify-center ${className}`}>
        <span className="text-[#5c4a3d] text-xs font-mono uppercase px-3 text-center">{alt}</span>
      </div>
    );
  }
  return (
    <img
      src={variants[attempt]}
      alt={alt}
      onError={() => attempt + 1 < variants.length ? setAttempt(a => a + 1) : setFailed(true)}
      className={className}
    />
  );
}

// ─── MODAL MAESTRO ─────────────────────────
export default function MediaModal({ media, onClose }) {
  const [resumeTime, setResumeTime] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const mediaType = media.collectionName === 'series' ? 'series' : 'movie';
  const { loadProgress, saveProgress, markFinished, percent } = useWatchProgress(mediaType, media.id);

  // Borra el cache del VPS al cerrar
  const cleanupCache = useCallback(() => {
    if (media.driveId) {
      fetch(`/stream/${media.driveId}`, { method: 'DELETE' }).catch(() => {});
    }
  }, [media.driveId]);

  const handleClose = useCallback(() => {
    cleanupCache();
    onClose();
  }, [cleanupCache, onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    loadProgress().then((rec) => {
      if (rec && rec.progress) {
        setResumeTime(rec.progress);
      }
      setIsReady(true);
    });

    // Cleanup al desmontar (por si navega sin cerrar el modal)
    return () => {
      document.body.style.overflow = 'auto';
      cleanupCache();
    };
  }, [media.id, loadProgress, cleanupCache]);

  if (!media) return null;
  const posterInput = media.coverId?.trim() || media.poster?.trim() || '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-[#1c1714]/95 backdrop-blur-md font-chakra">
      <div className="relative w-full max-w-[1300px] h-full md:h-[85vh] bg-[#1c1714] border-2 border-[#5c4a3d] shadow-[6px_6px_0_0_#5c4a3d] flex flex-col md:flex-row overflow-hidden">

        <button onClick={handleClose} className="absolute top-4 right-4 z-[110] bg-[#c85a17] text-[#1c1714] px-3 py-1.5 border-2 border-[#1c1714] font-black text-[10px] tracking-widest uppercase hover:bg-[#d4b595] transition-colors shadow-[2px_2px_0_0_#1c1714] flex items-center gap-2">
          <FaTimes /> ABORT_MISSION
        </button>

        {/* SIDEBAR */}
        <div className="hidden lg:flex flex-col bg-[#29221c] border-r-2 border-[#5c4a3d] p-5 gap-4 overflow-y-auto w-[280px] shrink-0">
          <div className="relative border-2 border-[#5c4a3d] overflow-hidden aspect-[2/3] vhs-overlay">
            <PosterImageModal
              input={posterInput}
              alt={media.tmdbTitle || media.name || media.title || ''}
              className="absolute inset-0 w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
            />
            {percent > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#1c1714]">
                <div className="h-full bg-[#c85a17]" style={{ width: `${percent}%` }} />
              </div>
            )}
          </div>

          <div className="bg-[#1c1714] p-3 border-l-4 border-[#c85a17]">
            <p className="text-[#c85a17] text-[9px] font-black uppercase tracking-widest mb-1">DESIGNATION</p>
            <h2 className="text-sm font-black text-white uppercase leading-tight">
              {media.tmdbTitle || media.name || media.title}
            </h2>
          </div>
          <div className="flex items-center gap-2 bg-[#1c1714]/60 p-2 border border-[#5c4a3d]">
            <FaCalendarAlt className="text-[#d4b595] text-xs" />
            <span className="text-[10px] font-black uppercase text-white">AÑO: {media.year}</span>
          </div>
          <div className="flex items-center gap-2 bg-[#1c1714]/60 p-2 border border-[#5c4a3d]">
            <FaDatabase className="text-[#d4b595] text-xs" />
            <span className="text-[10px] font-black uppercase text-white truncate">{media.category}</span>
          </div>
          <div className="flex items-center gap-2 bg-[#c85a17]/10 p-2 border border-[#c85a17]/40">
            <FaSignal className="text-[#c85a17] text-xs animate-pulse" />
            <span className="text-[9px] font-black uppercase text-[#c85a17]">DATA_LINK: STABLE</span>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black">
          <div className="warning-stripe h-1.5 shrink-0" />
          <div className="flex items-center gap-3 px-5 py-3 bg-[#1c1714] border-b-2 border-[#5c4a3d] shrink-0">
            <FaBiohazard className="text-[#c85a17] text-base animate-spin" style={{ animationDuration: '4s' }} />
            <span className="text-[#d4b595] text-[11px] font-black tracking-widest uppercase">NERV_DECRYPTOR_V11</span>
            <div className="h-4 w-px bg-[#5c4a3d]" />
            <span className="text-white/40 text-[10px] font-mono">{media.driveId?.slice(0, 16)}...</span>
          </div>

          <div className="flex-1 min-h-0 flex flex-col bg-black relative overflow-hidden">
            {!isReady ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
                <div className="w-12 h-12 border-4 border-[#5c4a3d] border-t-[#c85a17] rounded-full animate-spin" />
                <span className="text-[#c85a17] text-[10px] font-black uppercase tracking-widest animate-pulse">
                  CALCULANDO_SINCRONIZACIÓN...
                </span>
              </div>
            ) : (
              <DrivePlayer
                media={media}
                initialTime={resumeTime}
                saveProgress={saveProgress}
                markFinished={markFinished}
              />
            )}
          </div>

          <div className="bg-[#1c1714] border-t-2 border-[#5c4a3d] p-5 overflow-y-auto shrink-0 max-h-[140px]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-[2px] bg-[#d4b595]" />
              <span className="text-[#d4b595] text-[10px] font-black uppercase tracking-[0.25em]">MISSION_BRIEFING</span>
            </div>
            <p className="text-[#e6d5c3]/80 text-sm leading-relaxed italic">
              {media.plot || 'No official records found in the current archive.'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
