import { Link } from 'react-router-dom';
import { FaPlay, FaExclamationTriangle } from 'react-icons/fa';

export default function ComedyCard({ item }) {
  // Evitamos el error de src vacío: Si no hay imagen, asignamos null o un placeholder
  const bgImage = item.backdrop || item.poster || null;

  return (
    <div className="group relative w-full bg-black border-2 border-yellow-400 overflow-hidden flex flex-col md:flex-row transition-all duration-300 hover:bg-yellow-400 hover:text-black font-mono">
      
      {/* SECCIÓN IMAGEN */}
      <div className="relative w-full md:w-1/3 lg:w-1/4 h-48 md:h-auto overflow-hidden shrink-0 border-b-2 md:border-b-0 md:border-r-2 border-yellow-400 group-hover:border-black flex items-center justify-center bg-zinc-900">
        {bgImage ? (
           <img 
             src={bgImage} 
             alt={item.name} 
             className="w-full h-full object-cover filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 mix-blend-luminosity"
           />
        ) : (
           <div className="text-yellow-400/50 font-black tracking-widest text-sm text-center p-4">
             [ SIN REGISTRO VISUAL ]
           </div>
        )}
        <div className="absolute top-2 left-2 bg-yellow-400 text-black px-2 py-0.5 text-xs font-black tracking-widest uppercase group-hover:bg-black group-hover:text-yellow-400">
          EVA-00_PROTO
        </div>
      </div>

      {/* SECCIÓN INFORMACIÓN */}
      <div className="p-4 md:p-6 flex flex-col justify-between flex-grow relative">
        <span className="absolute top-2 right-4 text-6xl font-black text-yellow-400/10 group-hover:text-black/10 select-none z-0">
          {item.year || '0000'}
        </span>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <FaExclamationTriangle className="text-yellow-400 group-hover:text-black" />
            <span className="text-xs tracking-widest font-bold uppercase text-yellow-400 group-hover:text-black">
              Stand-Up / Comedia
            </span>
          </div>
          
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white group-hover:text-black leading-none mb-2 drop-shadow-md">
            {item.englishTitle || item.name}
          </h2>
          
          <h3 className="text-xs md:text-sm text-yellow-400/80 group-hover:text-black/80 font-bold mb-4 uppercase">
            ALT: {item.tmdbTitle}
          </h3>

          <p className="text-sm md:text-base text-gray-400 group-hover:text-gray-900 line-clamp-3 w-full md:w-4/5">
            {item.plot}
          </p>
        </div>

        {/* CONTROLES / PLAY */}
        <div className="mt-6 flex items-center justify-between border-t-2 border-dashed border-yellow-400/30 group-hover:border-black/30 pt-4 relative z-10">
          <div className="text-xs tracking-widest opacity-50 uppercase">
            ID: {item.driveId.substring(0, 12)}...
          </div>
          
          <Link 
            to={`/play/${item.driveId}`}
            className="flex items-center gap-3 bg-yellow-400 text-black px-6 py-2 font-black uppercase hover:bg-white hover:text-black transition-colors group-hover:bg-black group-hover:text-yellow-400 border border-transparent group-hover:border-yellow-400"
          >
            <FaPlay className="text-sm" />
            <span>Ejecutar</span>
          </Link>
        </div>
      </div>
    </div>
  );
}