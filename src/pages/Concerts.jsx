import { useState, useEffect, useMemo, useRef } from 'react';
import { pb } from '../services/pb';
import { FaPlay, FaDatabase, FaSearch, FaTimes, FaMusic, FaCompactDisc, FaList, FaTh, FaExternalLinkAlt } from 'react-icons/fa';
import { useWatchProgress } from '../hooks/useWatchProgress';

/* ─────────────────────────────────────────────────────────────
   UTILIDADES
───────────────────────────────────────────────────────────── */
function buildImageUrl(poster) {
  if (!poster || poster.trim() === '') return null;
  const p = poster.trim();
  
  if (p.startsWith('http')) return p;
  if (/^[a-zA-Z0-9_\-]{25,60}$/.test(p)) return `https://drive.google.com/thumbnail?id=${p}&sz=w600`;
  
  return null;
}

function cleanName(name = '') {
  return name
    .replace(/^(\d{1,3}[\s\.\-_]+)/,'')
    .replace(/\.(mp4|mkv|avi|mov|webm)$/i,'')
    .trim();
}

/* ─────────────────────────────────────────────────────────────
   MOTOR DE REPRODUCCIÓN (IFRAME FIRST) PARA CONCIERTOS
───────────────────────────────────────────────────────────── */
function DrivePlayer({ track, concert, initialTime = 0, saveProgress, markFinished }) {
  const videoRef = useRef(null);
  const lastSavedTime = useRef(initialTime);
  const [useIframe, setUseIframe] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const driveId = track.driveId;
  const streamUrl = `https://drive.google.com/uc?export=download&id=${driveId}&confirm=t`;
  const embedUrl  = `https://drive.google.com/file/d/${driveId}/preview?usp=sharing`;
  const viewUrl   = `https://drive.google.com/file/d/${driveId}/view`;

  // Reiniciar estado interno si cambias de pista
  useEffect(() => {
    lastSavedTime.current = initialTime;
    if (videoRef.current) {
      videoRef.current.currentTime = initialTime;
    }
  }, [track.id, initialTime]);

  const syncProgressToDB = async (seconds, isFinished = false) => {
    try {
      const payload = {
        progress: seconds,
        total: videoRef.current?.duration ? Math.floor(videoRef.current.duration) : 0,
        title: `${concert.artist} - ${cleanName(track.trackName)}`,
        cover_id: concert.poster || '',
        episode: track.order // Usamos episode para guardar el track number
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
            title={`track-${track.order}`}
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

/* ─────────────────────────────────────────────────────────────
   CONCERT CARD
───────────────────────────────────────────────────────────── */
function ConcertCard({ concert, onClick }) {
  const [imgErr, setImgErr] = useState(false);
  const src = !imgErr ? buildImageUrl(concert.poster) : null;
  const isMulti = concert.tracks.length > 1;

  const displayTitle = concert.artist === 'General' ? concert.concertName : concert.artist;
  const displaySubtitle = concert.artist === 'General' ? '' : concert.concertName;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-[#e8d5b7] border-2 border-[#5c4a3d] shadow-[4px_4px_0_0_#1c1714] hover:shadow-[6px_6px_0_0_#c85a17] hover:-translate-y-1 transition-all flex flex-col overflow-hidden relative group h-full"
    >
      <div className="relative aspect-square bg-[#1c1714] overflow-hidden flex-shrink-0">
        {src ? (
          <img
            src={src}
            alt={displayTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#1c1714]">
            <FaCompactDisc size={48} color="#5c4a3d" className="animate-[spin_4s_linear_infinite]" />
          </div>
        )}

        <div className="absolute inset-0 bg-[#c85a17]/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-[#c85a17] border-2 border-[#1c1714] shadow-[3px_3px_0_#1c1714] p-3 text-white">
            <FaPlay size={16} />
          </div>
        </div>

        {isMulti && (
          <div className="absolute top-0 right-0 bg-[#c85a17] text-white font-mono text-[8px] font-bold tracking-widest px-2 py-1 flex items-center gap-1.5">
            <FaList size={7} /> {concert.tracks.length} PISTAS
          </div>
        )}
      </div>

      <div className="p-3 border-t-2 border-[#5c4a3d] flex-1 flex flex-col justify-center">
        <h3 className="font-chakra text-[11px] font-black uppercase tracking-wider text-[#1c1714] m-0 line-clamp-2 leading-tight">
          {displayTitle}
        </h3>
        {displaySubtitle && displaySubtitle !== displayTitle && (
          <p className="font-mono text-[8px] text-[#5c4a3d] mt-1 mb-0 tracking-widest truncate">
            {displaySubtitle}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CONCERT MODAL (PLAYER MAESTRO)
───────────────────────────────────────────────────────────── */
function ConcertModal({ concert, onClose }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeTrack = concert.tracks[activeIdx];
  const isMulti = concert.tracks.length > 1;
  const [imgErr, setImgErr] = useState(false);
  const posterSrc = !imgErr ? buildImageUrl(concert.poster) : null;

  const displayTitle = concert.artist === 'General' ? concert.concertName : concert.artist;
  const displaySubtitle = concert.artist === 'General' ? '' : concert.concertName;

  // Integración Historial
  const { loadProgress, saveProgress, markFinished, percent } = useWatchProgress('concert', activeTrack.id);
  const [resumeTime, setResumeTime] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(false);
    loadProgress().then((rec) => {
      if (rec && rec.progress) setResumeTime(rec.progress);
      else setResumeTime(0);
      setIsReady(true);
    });
  }, [activeTrack.id, loadProgress]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-[#1c1714]/85 backdrop-blur-md font-chakra">
      <div className="w-full max-w-[1280px] h-full md:h-[90vh] bg-[#f0e6d3] border-0 md:border-4 border-[#1c1714] md:shadow-[8px_8px_0_0_#c85a17] flex flex-col md:flex-row overflow-hidden relative">

        {/* LADO IZQUIERDO: PLAYER + INFO */}
        <div className="flex-[2] flex flex-col bg-[#e8d5b7] border-b-2 md:border-b-0 md:border-r-[3px] border-[#5c4a3d] overflow-hidden">
          
          <div className="relative w-full aspect-[16/9] md:aspect-auto md:h-[60%] bg-[#1c1714] flex-shrink-0 flex flex-col z-10">
            {!isReady ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
                <div className="w-10 h-10 border-4 border-[#5c4a3d] border-t-[#c85a17] rounded-full animate-spin" />
                <span className="text-[#c85a17] text-[10px] font-black uppercase tracking-widest animate-pulse">
                  CONECTANDO_PUNTO...
                </span>
              </div>
            ) : (
              <DrivePlayer 
                track={activeTrack} 
                concert={concert}
                initialTime={resumeTime} 
                saveProgress={saveProgress} 
                markFinished={markFinished} 
              />
            )}
            
            <div className="absolute top-3 left-3 bg-[#1c1714]/90 border border-[#c85a17] text-[#c85a17] font-mono text-[8px] md:text-[9px] font-bold tracking-widest px-2.5 py-1 flex items-center gap-1.5 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c85a17] animate-pulse" />
              {isMulti ? `PISTA_${String(activeTrack.order || activeIdx + 1).padStart(2,'0')}` : 'SHOW_COMPLETO'}
            </div>
            
            {percent > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1c1714]">
                <div className="h-full bg-[#c85a17]" style={{ width: `${percent}%` }} />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">
            <div className="flex gap-4 md:gap-5 items-start pr-12">
              <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 border-2 border-[#5c4a3d] overflow-hidden bg-[#1c1714]">
                {posterSrc ? (
                  <img src={posterSrc} alt="" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FaCompactDisc size={28} color="#5c4a3d" />
                  </div>
                )}
              </div>
              <div className="border-l-4 border-[#c85a17] pl-3">
                <div className="font-mono text-[8px] md:text-[9px] text-[#c85a17] tracking-[0.2em] mb-1">CONCIERTO EN VIVO</div>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-black uppercase tracking-tighter text-[#1c1714] m-0 leading-tight">
                  {displayTitle}
                </h2>
                {displaySubtitle && displaySubtitle !== displayTitle && (
                  <div className="font-mono text-[9px] md:text-[10px] text-[#5c4a3d] mt-1">{displaySubtitle}</div>
                )}
              </div>
            </div>

            {isMulti && (
              <div className="bg-[#d4b595] border-2 border-[#5c4a3d] p-3 md:p-4 mt-2">
                <div className="font-mono text-[7px] md:text-[8px] text-[#5c4a3d] tracking-[0.2em] mb-1">REPRODUCIENDO</div>
                <div className="font-chakra text-xs md:text-sm font-bold text-[#1c1714]">
                  {String(activeTrack.order || activeIdx + 1).padStart(2,'0')}. {cleanName(activeTrack.trackName)}
                </div>
              </div>
            )}

            {concert.description && concert.description !== 'Sin descripción' && !concert.description.startsWith('Concierto:') && (
              <p className="text-xs md:text-[13px] leading-relaxed text-[#1c1714] border-l-2 border-[#d4b595] pl-3 italic m-0">
                {concert.description}
              </p>
            )}
          </div>
        </div>

        {/* LADO DERECHO: SETLIST */}
        <div className="flex-1 flex flex-col bg-[#f0e6d3] min-w-0 md:max-w-[350px] relative z-20">
          {isMulti ? (
            <>
              <div className="p-3 md:p-4 bg-[#1c1714] border-b-[3px] border-[#c85a17] flex items-center gap-2 shrink-0">
                <FaMusic size={10} color="#c85a17" className="hidden md:block" />
                <span className="font-mono text-[9px] md:text-[10px] font-bold text-[#d4b595] tracking-[0.2em] uppercase">
                  SETLIST // {concert.tracks.length} PISTAS
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                {concert.tracks.map((track, i) => {
                  const isActive = activeIdx === i;
                  return (
                    <button
                      key={track.driveId}
                      onClick={() => setActiveIdx(i)}
                      className={`w-full text-left p-2.5 md:p-3 flex items-center gap-3 cursor-pointer border-none border-l-4 mb-1 transition-all shadow-sm active:scale-[0.98] ${
                        isActive 
                        ? 'border-l-[#c85a17] bg-[#e8d5b7] shadow-[2px_2px_0_0_#5c4a3d]' 
                        : 'border-l-transparent bg-transparent hover:bg-[#e8d5b7]'
                      }`}
                    >
                      <span className={`font-mono text-[9px] md:text-[10px] font-bold min-w-[20px] shrink-0 ${isActive ? 'text-[#c85a17]' : 'text-[#5c4a3d]'}`}>
                        {isActive ? <FaPlay size={8} /> : String(track.order || i+1).padStart(2,'0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className={`font-chakra text-[11px] md:text-xs block truncate ${isActive ? 'font-bold text-[#1c1714]' : 'text-[#1c1714]'}`}>
                          {cleanName(track.trackName)}
                        </span>
                      </div>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#c85a17] shrink-0 animate-pulse ml-2" />}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <FaCompactDisc size={48} color="#d4b595" className="mb-4" />
              <div className="font-mono text-[9px] md:text-[10px] text-[#5c4a3d] tracking-[0.2em] uppercase">
                SHOW COMPLETO<br/>SIN PISTAS SEPARADAS
              </div>
            </div>
          )}
        </div>

        {/* BOTÓN CERRAR (ABSOLUTO Z-999) */}
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

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function Concerts() {
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [dbError, setDbError]       = useState(null);
  const [selected, setSelected]     = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode]     = useState('grid');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    pb.collection('concerts_records').getFullList({ requestKey: null })
      .then(res => setRecords(res))
      .catch(err => {
        console.error('KONGFLIX_CONCERTS:', err);
        setDbError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const concerts = useMemo(() => {
    const groups = {};
    records.forEach(rec => {
      const key = `${rec.artist}_${rec.concertName}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          artist: rec.artist,
          concertName: rec.concertName,
          description: rec.description,
          poster: rec.poster,
          tracks: []
        };
      }
      groups[key].tracks.push(rec);
    });

    return Object.values(groups).map(c => {
      c.tracks.sort((a, b) => (a.order || 0) - (b.order || 0));
      return c;
    }).sort((a, b) => {
      const titleA = a.artist === 'General' ? a.concertName : a.artist;
      const titleB = b.artist === 'General' ? b.concertName : b.artist;
      return titleA.localeCompare(titleB);
    });
  }, [records]);

  const filtered = useMemo(() => {
    return concerts.filter(c => {
      const isMulti = c.tracks.length > 1;
      const matchSearch = c.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.concertName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'ALL' ||
        (filterType === 'MULTI' && isMulti) ||
        (filterType === 'SINGLE' && !isMulti);
      return matchSearch && matchType;
    });
  }, [concerts, searchTerm, filterType]);

  if (dbError) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1c1714] text-[#e63946] p-10 text-center font-chakra">
      <h2 className="text-2xl font-bold m-0">ERROR DE BASE DE DATOS</h2>
      <p className="font-mono text-xs max-w-[600px] text-[#f0e6d3] mt-3">
        No se pudo leer la colección concerts_records.
      </p>
      <code className="bg-black p-3 mt-5 text-[#ff4d4d] border border-[#ff4d4d] text-xs">{dbError}</code>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0e6d3] gap-4">
      <div className="font-mono text-[11px] text-[#1c1714] tracking-[0.25em] animate-pulse">
        &gt; CARGANDO_CONCIERTOS...
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f0e6d3] bg-[url('/grid.png')] bg-repeat font-chakra pb-20">

      {selected && <ConcertModal concert={selected} onClose={() => setSelected(null)} />}

      {/* ══ HERO HEADER ══ */}
      <div className="bg-[#1c1714] border-b-4 border-[#c85a17] px-6 py-10 md:p-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="h-1.5 w-24 bg-repeating-linear-gradient(45deg,#cfaa70,#cfaa70_10px,#1c1714_10px,#1c1714_20px) mb-6" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-[8px] md:text-[9px] text-[#c85a17] tracking-[0.3em] font-bold uppercase mb-2">
                <FaMusic size={10} /> KONGFLIX · ARCHIVO_CONCIERTOS
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-[5rem] font-black text-[#f0e6d3] uppercase tracking-tighter leading-none m-0 drop-shadow-[3px_3px_0_#c85a17] md:drop-shadow-[4px_4px_0_#c85a17]">
                Conciertos
              </h1>
              <div className="flex flex-wrap gap-3 md:gap-5 mt-4">
                <span className="font-mono text-[8px] md:text-[9px] text-[#d4b595] tracking-[0.2em] flex items-center gap-1.5 bg-[#1c1714] border border-[#5c4a3d] px-2 py-1">
                  <FaDatabase size={8} /> {filtered.length} / {concerts.length} SHOWS
                </span>
                <span className="font-mono text-[8px] md:text-[9px] text-[#5c4a3d] tracking-[0.15em] flex items-center gap-1.5 px-2 py-1">
                  {concerts.filter(c => c.tracks.length > 1).length} SETLIST · {concerts.filter(c => c.tracks.length === 1).length} FULL SHOW
                </span>
              </div>
            </div>

            {/* Buscador */}
            <div className="relative w-full md:w-[280px]">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c4a3d] pointer-events-none" size={12} />
              <input
                type="text" placeholder="BUSCAR_ARTISTA..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#f0e6d3] border-2 border-[#5c4a3d] focus:border-[#c85a17] pl-8 pr-8 py-2.5 font-mono text-[9px] md:text-[10px] font-bold text-[#1c1714] tracking-widest uppercase outline-none transition-colors"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#c85a17] cursor-pointer p-1">
                  <FaTimes size={10} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ TOOLBAR ══ */}
      <div className="bg-[#e8d5b7] border-b-2 border-[#d4b595] overflow-x-auto scrollbar-hide">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center min-w-max">
          {[
            { key: 'ALL',    label: '⊞ TODOS' },
            { key: 'MULTI',  label: '♫ CON SETLIST' },
            { key: 'SINGLE', label: '▶ SHOW COMPLETO' },
          ].map(opt => (
            <button key={opt.key} onClick={() => setFilterType(opt.key)} className={`px-4 md:px-6 py-3 border-none font-mono text-[8px] font-bold tracking-widest uppercase cursor-pointer transition-all border-b-[3px] ${filterType===opt.key ? 'border-b-[#c85a17] bg-[#c85a17] text-white' : 'border-b-transparent bg-transparent text-[#5c4a3d] hover:bg-[#d4b595]'}`}>
              {opt.label}
            </button>
          ))}

          <div className="ml-auto flex border-l border-[#d4b595]">
            {[{ key: 'grid', icon: <FaTh size={11}/> }, { key: 'list', icon: <FaList size={11}/> }].map(v => (
              <button key={v.key} onClick={() => setViewMode(v.key)} className={`p-3 md:px-4 border-none cursor-pointer transition-colors ${viewMode === v.key ? 'bg-[#c85a17] text-white' : 'bg-transparent text-[#5c4a3d] hover:bg-[#d4b595]'}`}>
                {v.icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ CONTENIDO PRINCIPAL ══ */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 md:py-12">

        {filtered.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-[#d4b595] flex flex-col items-center gap-3">
            <FaDatabase size={36} color="#d4b595" />
            <div className="font-mono text-[10px] text-[#5c4a3d] tracking-[0.2em]">NO_RECORDS_FOUND</div>
          </div>
        )}

        {/* GRID */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5 animate-fade-in">
            {filtered.map(c => (
              <ConcertCard key={c.id} concert={c} onClick={() => setSelected(c)} />
            ))}
          </div>
        )}

        {/* LIST */}
        {viewMode === 'list' && (
          <div className="flex flex-col gap-2 md:gap-3 animate-fade-in">
            {filtered.map((c, i) => {
              const displayTitle = c.artist === 'General' ? c.concertName : c.artist;
              const displaySubtitle = c.artist === 'General' ? '' : c.concertName;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="flex items-center gap-3 md:gap-5 p-3 md:p-4 cursor-pointer bg-[#e8d5b7] border-2 border-[#5c4a3d] border-l-4 transition-all hover:border-l-[#c85a17] hover:translate-x-1 hover:shadow-[3px_3px_0_0_#1c1714]"
                >
                  <span className="font-mono text-[9px] md:text-[10px] color-[#5c4a3d] min-w-[24px] shrink-0">
                    {String(i+1).padStart(2,'0')}
                  </span>

                  <div className="w-10 h-10 md:w-14 md:h-14 shrink-0 overflow-hidden bg-[#1c1714] border border-[#5c4a3d]">
                    {buildImageUrl(c.poster) ? (
                      <img src={buildImageUrl(c.poster)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaCompactDisc size={20} color="#5c4a3d" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-chakra text-[11px] md:text-[13px] font-bold uppercase text-[#1c1714] truncate">
                      {displayTitle}
                    </div>
                    {displaySubtitle && displaySubtitle !== displayTitle && (
                      <div className="font-mono text-[8px] md:text-[9px] color-[#5c4a3d] truncate mt-0.5">
                        {displaySubtitle}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    {c.tracks.length > 1 ? (
                      <span className="bg-[#c85a17] text-white font-mono text-[7px] md:text-[8px] px-2 py-0.5 flex items-center gap-1.5">
                        <FaList size={7} /> {c.tracks.length}
                      </span>
                    ) : (
                      <span className="border border-[#5c4a3d] text-[#5c4a3d] font-mono text-[7px] md:text-[8px] px-2 py-0.5">
                        FULL
                      </span>
                    )}
                    <FaPlay size={9} color="#c85a17" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}