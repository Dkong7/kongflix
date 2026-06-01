import { useEffect, useState, useMemo } from 'react';
import { pb } from '../services/pb';
import { FaGamepad, FaTimes, FaSearch, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';

// ─── CONFIGURACIÓN DE NÚCLEO ──────────────────────────────────────────────────
const GOOGLE_API_KEY = "AIzaSyAYHAuZb_neKRSlejQ5qd9RRY3C4FgxAE0"; 
const PSX_BIOS_DRIVE_ID = "1rIXkvgtgXoaneYKjT5nps-ze7"; // <--- REEMPLAZA ESTO

// ─── COMPONENTE DE IMAGEN (NUBE) ──────────────────────────────────────────────
function CoverImage({ coverId, title }) {
  const [failed, setFailed] = useState(false);
  const [src, setSrc] = useState(coverId ? `https://drive.google.com/thumbnail?id=${coverId}&sz=w400` : null);

  const handleError = () => {
    if (src && src.includes('thumbnail')) {
      setSrc(`https://drive.google.com/uc?export=view&id=${coverId}`);
    } else {
      setFailed(true);
    }
  };

  if (!coverId || failed) {
    return (
      <div className="w-full h-full bg-[#29221c] flex items-center justify-center p-2 border border-[#5c4a3d]">
        <span className="text-[#5c4a3d] text-[9px] text-center font-mono uppercase leading-tight">
          {title.slice(0, 20)}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title}
      onError={handleError}
      loading="lazy"
      className="w-full h-full object-cover transition-opacity duration-300"
    />
  );
}

// ─── COMPONENTE REPRODUCTOR (MOTOR WEBASSEMBLY EN NUBE) ──────────────────────
function EmulatorModal({ game, onClose }) {
  const getCore = (platform) => {
    const map = { 'GBA': 'gba', 'SNES': 'snes', 'NDS': 'nds', 'PSX': 'psx', 'PSP': 'psp', 'N64': 'n64' };
    return map[platform.toUpperCase()] || 'gba';
  };

  const core = getCore(game.platform);
  const romUrl = `https://www.googleapis.com/drive/v3/files/${game.driveId}?alt=media&key=${GOOGLE_API_KEY}`;
  const biosUrl = `https://www.googleapis.com/drive/v3/files/${PSX_BIOS_DRIVE_ID}?alt=media&key=${GOOGLE_API_KEY}`;

  const iframeContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #0f0c0a; overflow: hidden; font-family: sans-serif; }
            #game { width: 100%; height: 100%; }
        </style>
    </head>
    <body>
        <div id="game"></div>
        <script>
            window.EJS_player = '#game';
            window.EJS_core = '${core}';
            window.EJS_gameUrl = '${romUrl}';
            ${core === 'psx' ? `window.EJS_biosUrl = '${biosUrl}';` : ''}
            window.EJS_pathtodata = 'https://cdn.jsdelivr.net/gh/ethanaobrien/emulatorjs@main/data/';
            window.EJS_color = '#c85a17'; 
            window.EJS_startOnLoaded = true;
        </script>
        <script src="https://cdn.jsdelivr.net/gh/ethanaobrien/emulatorjs@main/data/loader.js"></script>
    </body>
    </html>
  `;

  return (
    <div className="fixed inset-0 bg-[#1c1714]/98 z-50 flex flex-col p-0 md:p-4 backdrop-blur-md">
      {/* HEADER EMULADOR */}
      <div className="bg-[#29221c] border-b-2 md:border-2 border-[#5c4a3d] p-2 md:p-3 flex justify-between items-center md:mb-2 shadow-md">
        <div className="text-eva-green font-black uppercase flex items-center gap-2 md:gap-3 tracking-widest text-xs md:text-base truncate pr-2">
          <FaGamepad className="text-eva-orange text-lg md:text-xl shrink-0" />
          <span className="truncate">{game.title}</span> 
          <span className="text-[#a89078] text-[9px] md:text-xs font-mono hidden sm:inline shrink-0">
            [{game.platform} // RAM STREAMING]
          </span>
        </div>
        <button 
          onClick={onClose} 
          className="bg-[#5c4a3d] text-[#e6d5c3] px-3 md:px-5 py-1.5 font-bold hover:bg-eva-orange hover:text-[#0f0c0a] border-2 border-transparent transition-colors flex items-center gap-2 uppercase text-[10px] md:text-xs shadow-md active:scale-95 shrink-0"
        >
          <FaTimes /> <span className="hidden sm:inline">ABORTAR_SISTEMA</span>
        </button>
      </div>

      {/* CONTENEDOR IFRAME */}
      <div className="flex-1 bg-[#0f0c0a] md:border-2 border-[#5c4a3d] relative shadow-inner overflow-hidden flex items-center justify-center">
        <iframe 
          srcDoc={iframeContent} 
          className="w-full h-full border-none"
          title="EmulatorJS Engine"
          allow="gamepad; autoplay"
        />
      </div>
    </div>
  );
}

// ─── VISTA PRINCIPAL (LIBRERÍA CLOUD) ─────────────────────────────────────────
export default function Games() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [activePlatform, setActivePlatform] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGame, setActiveGame] = useState(null);

  // CONEXIÓN A POCKETBASE
  useEffect(() => {
    pb.collection('games_db').getFullList({ 
      sort: 'platform,title',
      requestKey: null 
    })
    .then(records => {
      setGames(records);
      setLoading(false);
    })
    .catch(err => {
      setErrorMsg(err.message);
      setLoading(false);
    });
  }, []);

  const platformsList = useMemo(() => {
    const pl = new Set(games.map(g => g.platform));
    return ['ALL', ...Array.from(pl).sort()];
  }, [games]);

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const matchesPlatform = activePlatform === 'ALL' || game.platform === activePlatform;
      const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPlatform && matchesSearch;
    });
  }, [games, activePlatform, searchQuery]);

  if (loading) return (
    <div className="p-20 text-eva-green font-bold uppercase bg-[#1c1714] min-h-screen flex flex-col items-center justify-center gap-4">
      <FaSpinner className="animate-spin text-5xl text-eva-orange" />
      <div className="text-center">
        <p className="tracking-widest">CONECTANDO_CON_GAMES_DATABASE...</p>
        <p className="text-xs text-[#5c4a3d] mt-2 font-mono">SINCRONIZANDO DRIVE</p>
      </div>
    </div>
  );

  if (errorMsg) return (
    <div className="p-20 text-eva-orange font-bold bg-[#1c1714] min-h-screen flex flex-col items-center justify-center">
      <FaExclamationTriangle size={50} className="mb-4" />
      <p className="uppercase tracking-tighter text-2xl text-center">FALLO_CRÍTICO_SISTEMA</p>
      <p className="font-mono text-sm mt-4 text-gray-500 text-center">{errorMsg}</p>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen pt-16 bg-[#1c1714] text-[#e6d5c3] font-chakra overflow-hidden">
      
      {/* ─── FILTROS / SIDEBAR ─── */}
      <div className="w-full md:w-64 bg-[#29221c] border-b-2 md:border-b-0 md:border-r-2 border-[#5c4a3d] flex flex-row md:flex-col shadow-xl z-10 shrink-0">
        
        {/* Título (Fijo en desktop, pegado a la izquierda en mobile) */}
        <div className="p-3 md:p-6 border-r-2 md:border-r-0 md:border-b-2 border-[#5c4a3d] bg-[#1c1714]/50 flex items-center justify-center md:justify-start shrink-0">
          <h1 className="text-sm md:text-2xl font-black text-eva-green uppercase tracking-widest flex items-center gap-2 md:gap-3 drop-shadow-md">
            <FaGamepad className="text-eva-orange" /> <span className="hidden sm:inline md:inline">LIBRERÍA</span>
          </h1>
        </div>

        {/* Lista de Plataformas (Scroll horizontal en mobile, vertical en desktop) */}
        <div className="flex flex-row md:flex-col flex-1 overflow-x-auto md:overflow-y-auto p-2 md:p-3 space-x-2 md:space-x-0 md:space-y-1.5 items-center md:items-stretch scrollbar-hide">
          <p className="text-[#a89078] text-[10px] md:text-[11px] font-bold uppercase md:mb-4 tracking-widest pl-2 md:pl-3 md:mt-3 hidden md:block">
            Sistemas
          </p>
          {platformsList.map(sys => (
            <button
              key={sys}
              onClick={() => setActivePlatform(sys)}
              className={`shrink-0 md:w-full text-center md:text-left px-3 md:px-4 py-1.5 md:py-2.5 font-bold uppercase text-[10px] md:text-xs tracking-wider transition-all border-b-2 md:border-b-0 md:border-l-4 rounded-sm md:rounded-r-sm md:rounded-l-none ${
                activePlatform === sys 
                ? 'border-eva-green bg-[#1c1714] text-eva-green shadow-inner' 
                : 'border-transparent text-[#e6d5c3] hover:bg-[#5c4a3d]/50 hover:text-white'
              }`}
            >
              {sys}
              {sys !== 'ALL' && (
                <span className="ml-1 md:float-right opacity-40 text-[9px] md:mt-0.5">
                  ({games.filter(g => g.platform === sys).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── ÁREA DE CATÁLOGO ─── */}
      <div className="flex-1 flex flex-col bg-[#1c1714] bg-[url('/grid.png')] bg-repeat overflow-hidden">
        
        {/* BARRA SUPERIOR (Búsqueda) */}
        <div className="h-12 md:h-16 border-b-2 border-[#5c4a3d] bg-[#29221c]/50 flex items-center justify-between px-3 md:px-8 backdrop-blur-sm shadow-md z-10 shrink-0">
          <div className="flex items-center bg-[#0f0c0a] border border-[#5c4a3d] px-3 py-1.5 w-full max-w-xs md:max-w-sm shadow-inner rounded-sm">
            <FaSearch className="text-[#a89078] mr-2 md:mr-2.5 text-xs md:text-base" />
            <input 
              type="text" 
              placeholder="Buscar ROM..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-eva-green w-full font-mono text-[10px] md:text-xs placeholder-[#5c4a3d] uppercase tracking-wider"
            />
          </div>
          <div className="hidden md:block font-mono text-[10px] text-[#a89078] uppercase text-right leading-tight bg-[#1c1714] p-2 border border-[#5c4a3d]">
            Registros Encontrados: <span className="text-eva-green font-bold text-xs">{filteredGames.length}</span><br/>
            Engine: Cloud_WASM_Stream
          </div>
        </div>

        {/* GRID DE JUEGOS */}
        <div className="flex-1 p-3 md:p-8 overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 md:gap-6 pb-10">
            {filteredGames.map(game => (
              <div 
                key={game.id} 
                onClick={() => setActiveGame(game)}
                className="group cursor-pointer relative animate-fade-in flex flex-col h-full"
              >
                {/* CAJA DEL JUEGO */}
                <div className="w-full aspect-[3/4] bg-[#0f0c0a] border-2 border-[#5c4a3d] group-hover:border-eva-orange transition-all flex items-center justify-center relative overflow-hidden shadow-[4px_4px_0_0_#0a0a0a] md:shadow-[6px_6px_0_0_#0a0a0a] group-hover:shadow-[4px_4px_0_0_var(--eva-purple)] md:group-hover:shadow-[6px_6px_0_0_var(--eva-purple)] group-hover:-translate-y-1">
                  
                  {/* ETIQUETA DE SISTEMA */}
                  <div className="absolute top-0 right-0 bg-[#5c4a3d] text-[#e6d5c3] text-[8px] md:text-[9px] font-black px-1.5 md:px-2 py-0.5 md:py-1 uppercase z-20 group-hover:bg-eva-orange group-hover:text-[#0f0c0a] transition-colors">
                    {game.platform}
                  </div>
                  
                  {/* IMAGEN DEL POSTER (DRIVE) */}
                  <div className="w-full h-full relative z-10">
                     <CoverImage coverId={game.coverId} title={game.title} />
                  </div>

                  {/* FONDO ALTERNATIVO SI NO HAY IMAGEN */}
                  <FaGamepad className="text-[#5c4a3d] text-3xl md:text-4xl absolute z-0 opacity-50" />
                </div>
                
                {/* TÍTULO */}
                <div className="mt-2 md:mt-3 text-center bg-[#29221c] p-1.5 border border-[#5c4a3d] group-hover:border-eva-green flex-grow flex items-center justify-center min-h-[40px] md:min-h-[48px]">
                  <p className="text-[9px] md:text-xs font-bold text-[#e6d5c3] uppercase tracking-tight group-hover:text-eva-green line-clamp-2 leading-snug">
                    {game.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {/* MENSAJE SI NO HAY RESULTADOS */}
          {filteredGames.length === 0 && (
            <div className="text-center mt-20 text-[#5c4a3d] font-mono text-xs uppercase tracking-widest">
              NO_RECORDS_FOUND
            </div>
          )}
        </div>
      </div>

      {activeGame && <EmulatorModal game={activeGame} onClose={() => setActiveGame(null)} />}
    </div>
  );
}