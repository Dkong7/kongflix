import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pb } from '../services/pb';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

export default function TvPlayer() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const videoNodeRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    async function loadMedia() {
      try {
        setLoading(true);
        // Simulamos o buscamos de la DB
        const records = await pb.collection('tv_media').getFullList({
            filter: `channel_id = "${channelId}"`,
            sort: '@random'
        });
        
        // Si está vacío, generamos mock data para probar la UI
        if (records.length === 0) {
            setPlaylist([
                { id: '1', type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', title: 'Video de prueba', aspectRatio: 'landscape', summary: 'Resumen IA 1', tags: ['#demo'] },
                { id: '2', type: 'image', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809', title: 'Imagen vertical', aspectRatio: 'portrait', summary: 'Resumen IA 2', tags: ['#vertical'] },
                { id: '3', type: 'image', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe', title: 'Imagen cuadrada', aspectRatio: 'square', summary: 'Resumen IA 3', tags: ['#abstract'] }
            ]);
        } else {
            setPlaylist(records);
        }
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    }
    loadMedia();
  }, [channelId]);

  const currentMedia = playlist[currentIndex];

  useEffect(() => {
    if (currentMedia && currentMedia.type === 'video') {
      const initPlayer = () => {
        if (!playerRef.current && videoNodeRef.current) {
          playerRef.current = videojs(videoNodeRef.current, {
            controls: true,
            autoplay: true,
            preload: 'auto',
            fluid: false,
            fill: true
          });
          
          playerRef.current.on('ended', handleNext);
        }
        
        if (playerRef.current) {
            let streamUrl = currentMedia.url;
            if (currentMedia.driveId) {
                streamUrl = `https://kongflix-app.duckdns.org/stream/${currentMedia.driveId}`;
            }
            playerRef.current.src({ src: streamUrl, type: 'video/mp4' });
            playerRef.current.play().catch(e => console.log('Autoplay prevent:', e));
        }
      };
      
      initPlayer();
    }
    
    return () => {
      // Limpieza de Video.js para este elemento si cambia
      if (playerRef.current && currentMedia && currentMedia.type !== 'video') {
         playerRef.current.dispose();
         playerRef.current = null;
      }
    };
  }, [currentIndex, currentMedia]);

  const handleNext = () => {
    if (currentIndex < playlist.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Loop
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) return <div className="text-white text-center mt-20">Sintonizando...</div>;
  if (!currentMedia) return <div className="text-white text-center mt-20">Canal sin señal.</div>;

  const bgUrl = currentMedia.type === 'image' ? currentMedia.url : ''; // Si tuvieras un thumbnail de video, lo pones aquí

  return (
    <div className="w-full h-screen relative bg-black overflow-hidden flex flex-col">
      {/* HEADER DE TV */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={() => navigate('/tv')} className="text-white hover:text-[var(--accent-orange)] text-xl font-bold transition-colors">
          <i className="fa-solid fa-arrow-left"></i> Volver a Panal
        </button>
        <div className="text-[var(--accent-orange)] font-bold text-lg font-orbitron">
          <i className="fa-solid fa-tower-broadcast animate-pulse"></i> LIVE: {channelId.toUpperCase()}
        </div>
      </div>

      {/* CONTENEDOR MULTIMEDIA INTELIGENTE */}
      <div className="flex-1 relative flex justify-center items-center">
        {/* Fondo difuminado dinámico (Glassmorphism) */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center blur-2xl opacity-40" 
          style={{ backgroundImage: `url(${bgUrl})` }}
        ></div>

        {/* Reproductor / Imagen (object-fit: contain para no cortar) */}
        <div className="relative z-10 w-full h-full flex justify-center items-center">
          {currentMedia.type === 'image' ? (
             <img 
               src={currentMedia.url || `https://kongflix-app.duckdns.org/stream/${currentMedia.driveId}`} 
               alt={currentMedia.title}
               className="w-full h-full object-contain"
               onClick={handleNext}
             />
          ) : (
             <div className="w-full h-full p-0 m-0 relative">
               <video ref={videoNodeRef} className="video-js vjs-theme-nerv w-full h-full object-contain" crossOrigin="anonymous"></video>
             </div>
          )}
        </div>
      </div>

      {/* OVERLAY DE METADATOS Y TRANSCRIPCIÓN IA */}
      <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-40 text-white flex flex-col md:flex-row justify-between items-end gap-4 pb-20 md:pb-6">
        <div className="flex-1 max-w-3xl">
           <h2 className="text-2xl md:text-3xl font-bold text-[var(--accent-orange)] mb-2">{currentMedia.title}</h2>
           <p className="text-gray-300 text-sm md:text-base mb-2 line-clamp-3 leading-relaxed">
               <i className="fa-solid fa-robot text-xs opacity-50 mr-2"></i>
               {currentMedia.transcription || currentMedia.summary}
           </p>
           <div className="flex flex-wrap gap-2">
             {(currentMedia.tags || []).map((tag, i) => (
                <span key={i} className="text-xs bg-[#2b221a] text-[var(--text-main)] px-2 py-1 rounded-md border border-[var(--border-color)]">
                  {tag}
                </span>
             ))}
           </div>
        </div>

        {/* CONTROLES DE CANAL */}
        <div className="flex gap-4">
           <button onClick={handlePrev} className="bg-white/10 hover:bg-[var(--accent-orange)] text-white w-14 h-14 rounded-full flex justify-center items-center backdrop-blur transition-colors text-xl">
             <i className="fa-solid fa-backward-step"></i>
           </button>
           <button onClick={handleNext} className="bg-white/10 hover:bg-[var(--accent-orange)] text-white w-14 h-14 rounded-full flex justify-center items-center backdrop-blur transition-colors text-xl">
             <i className="fa-solid fa-forward-step"></i>
           </button>
        </div>
      </div>
    </div>
  );
}
