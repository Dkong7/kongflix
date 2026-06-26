import { useEffect, useRef, useCallback } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { pb } from '../services/pb';

export default function VideoPlayer({ src, mediaId, initialTime = 0, disableTracking = false, transcriptionEs = '', transcriptionEn = '' }) {
  const placeholderRef = useRef(null);
  const playerRef = useRef(null);

  // Memoized para que el cleanup del useEffect pueda acceder a ella sin cerrar sobre playerRef
  const saveProgress = useCallback(async (seconds) => {
    try {
      const userId = pb.authStore.model?.id;
      if (disableTracking || !userId || !mediaId || !seconds || seconds < 3) return;

      const existing = await pb.collection('watch_history').getList(1, 1, {
        filter: `user="${userId}" && media_id="${mediaId}"`,
        requestKey: null
      });

      if (existing.items.length > 0) {
        const diff = Math.abs(seconds - existing.items[0].progress);
        if (seconds > existing.items[0].progress || diff > 10) {
          await pb.collection('watch_history').update(existing.items[0].id, {
            progress: seconds
          });
        }
      } else {
        await pb.collection('watch_history').create({
          user: userId,
          media_id: mediaId,
          progress: seconds
        });
      }
    } catch (e) {
      console.warn("NERV_SYNC_WARNING:", e.message);
    }
  }, [mediaId]);

  useEffect(() => {
    // Evita inicializar si no hay src válido o si ya existe el reproductor
    if (!src || playerRef.current || !placeholderRef.current) return;

    // Construye la URL del túnel asumiendo que src es el ID de Drive
    // Si src ya viene con https://, se usa tal cual
    const finalStreamUrl = src.startsWith('http') 
      ? src 
      : `https://kongflix-app.duckdns.org/stream/${src}`;

    const videoElement = document.createElement('video-js');
    videoElement.classList.add(
      'vjs-big-play-centered',
      'vjs-theme-nerv',
      'w-full',
      'h-full'
    );
    placeholderRef.current.appendChild(videoElement);

    const player = (playerRef.current = videojs(videoElement, {
      autoplay: true,
      controls: true,
      responsive: true,
      fluid: true,
      sources: [{ src: finalStreamUrl, type: 'video/mp4' }], // <-- URL INYECTADA
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
      userActions: { hotkeys: true },
      html5: {
        vhs: {
          overrideNative: true
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false
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
          'subsCapsButton',
          'pictureInPictureToggle',
          'fullscreenToggle',
        ],
        volumePanel: { inline: true },
      },
    }));

    player.on('loadedmetadata', () => {
      if (initialTime > 0) player.currentTime(initialTime);
      
      // Inject subtitles if available
      if (transcriptionEs && transcriptionEs.includes('WEBVTT')) {
        const blobEs = new Blob([transcriptionEs], { type: 'text/vtt' });
        const urlEs = URL.createObjectURL(blobEs);
        player.addRemoteTextTrack({
          kind: 'captions',
          srclang: 'es',
          label: 'Español',
          src: urlEs,
          default: true
        }, false);
      }
      
      if (transcriptionEn && transcriptionEn.includes('WEBVTT')) {
        const blobEn = new Blob([transcriptionEn], { type: 'text/vtt' });
        const urlEn = URL.createObjectURL(blobEn);
        player.addRemoteTextTrack({
          kind: 'captions',
          srclang: 'en',
          label: 'English',
          src: urlEn,
          default: false
        }, false);
      }
    });

    // Guardar cada 5 segundos (throttled por módulo)
    player.on('timeupdate', () => {
      const t = Math.floor(player.currentTime());
      if (t % 5 === 0 && t > 0) saveProgress(t);
    });

    // Cleanup local para el player
    return () => {
      if (player && !player.isDisposed()) {
        const finalTime = Math.floor(player.currentTime());
        saveProgress(finalTime);
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [src, initialTime, saveProgress]);

  const togglePiP = () => {
    try {
      const video = placeholderRef.current?.querySelector('video');
      if (!video) return;
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
      } else {
        video.requestPictureInPicture();
      }
    } catch (e) {
      console.error('PiP Error:', e);
    }
  };

  const skip = (sec) => {
    if (playerRef.current) {
      const t = playerRef.current.currentTime();
      playerRef.current.currentTime(t + sec);
    }
  };

  return (
    <div className="relative group bg-black w-full h-full flex items-center justify-center overflow-hidden">
      {/* Contenedor seguro — Video.js inyecta aquí sin tocar el DOM de React */}
      <div ref={placeholderRef} className="w-full h-full" />

      {/* Custom Controls Overlay - Solo visible en hover */}
      <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between px-10 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => skip(-10)} className="pointer-events-auto bg-black/60 hover:bg-[#c85a17]/80 text-white rounded-full p-4 border-2 border-[#d4b595]/50 transition-colors backdrop-blur-sm cursor-pointer" title="Retroceder 10s">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 17l-5-5 5-5"/><path d="M18 17l-5-5 5-5"/></svg>
        </button>
        <button onClick={() => skip(10)} className="pointer-events-auto bg-black/60 hover:bg-[#c85a17]/80 text-white rounded-full p-4 border-2 border-[#d4b595]/50 transition-colors backdrop-blur-sm cursor-pointer" title="Adelantar 10s">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 17l5-5-5-5"/><path d="M6 17l5-5-5-5"/></svg>
        </button>
      </div>

      <div className="absolute top-4 right-6 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={togglePiP} className="pointer-events-auto bg-black/60 hover:bg-[#c85a17] text-white rounded p-2 border border-[#d4b595]/50 transition-colors backdrop-blur-sm cursor-pointer flex items-center gap-2 text-xs font-mono" title="Pantalla Flotante (PiP)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="12" y="11" width="7" height="8" rx="1" ry="1"/></svg>
          PANTALLA FLOTANTE
        </button>
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
        /* Fix captions text styling */
        .video-js .vjs-text-track-display > div > div > div {
          background-color: rgba(0, 0, 0, 0.75) !important;
          color: white !important;
          font-family: 'Outfit', sans-serif !important;
          font-size: 1.2rem !important;
          border-radius: 4px;
          padding: 2px 8px !important;
        }
      `}</style>
    </div>
  );
}