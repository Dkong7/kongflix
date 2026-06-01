import { useEffect, useRef, useCallback } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { pb } from '../services/pb';

export default function VideoPlayer({ src, mediaId, initialTime = 0 }) {
  const placeholderRef = useRef(null);
  const playerRef = useRef(null);

  // Memoized para que el cleanup del useEffect pueda acceder a ella sin cerrar sobre playerRef
  const saveProgress = useCallback(async (seconds) => {
    try {
      const userId = pb.authStore.model?.id;
      if (!userId || !mediaId || !seconds || seconds < 3) return;

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
      controlBar: {
        children: [
          'playToggle',
          'volumePanel',
          'currentTimeDisplay',
          'timeDivider',
          'durationDisplay',
          'progressControl',
          'playbackRateMenuButton',
          'fullscreenToggle',
        ],
      },
    }));

    player.on('loadedmetadata', () => {
      if (initialTime > 0) player.currentTime(initialTime);
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

  return (
    <div className="vhs-overlay border-2 border-[#5c4a3d] relative group shadow-brutal-purple bg-black w-full h-full flex items-center justify-center">
      {/* Contenedor seguro — Video.js inyecta aquí sin tocar el DOM de React */}
      <div ref={placeholderRef} className="w-full h-full" />

      {/* HUD Overlay */}
      <div className="absolute top-4 left-6 z-10 pointer-events-none font-chakra text-[#d4b595] text-xs font-bold tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#c85a17] rounded-full animate-pulse" />
          <span>NERV_STREAM</span>
        </div>
        <div className="mt-1 font-mono text-[10px] text-[#c85a17]">CH_01 // LIVE</div>
      </div>

      <div className="absolute bottom-14 right-6 z-10 pointer-events-none font-mono text-[9px] text-[#d4b595]/40 uppercase tracking-tighter">
        SYNC_LINK_ESTABLISHED
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
      `}</style>
    </div>
  );
}