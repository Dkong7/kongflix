import { useState } from 'react';
import { FaPlay } from 'react-icons/fa';

/**
 * MediaCard — Rediseño Premium
 * Póster limpio, año y play solo en hover. Sin desenfoques.
 */
export default function MediaCard({ media, onClick }) {
  const title = media.name || "UNKNOWN SUBJECT";
  const [imgError, setImgError] = useState(false);

  // ── URL de portada ──────────────────────────────────────────
  const buildPoster = () => {
    if (imgError) {
      return `https://via.placeholder.com/300x450/1c1714/d4b595?text=NO+DATA`;
    }
    if (media.poster && media.poster.trim() !== "") {
      if (media.poster.startsWith("http")) {
        return media.poster.replace("http://", "https://");
      } else {
        return `https://drive.google.com/thumbnail?id=${media.poster}&sz=w400`;
      }
    }
    if (media.coverId) {
      return `https://drive.google.com/thumbnail?id=${media.coverId}&sz=w400`;
    }
    return `https://via.placeholder.com/300x450/1c1714/d4b595?text=NO+SIGNAL`;
  };

  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer group overflow-hidden rounded-sm flex flex-col h-full bg-[#1c1714] border-2 border-[#5c4a3d] hover:border-[#c85a17] transition-all duration-300 hover:-translate-y-1 shadow-[4px_4px_0_0_#1c1714] hover:shadow-[6px_6px_0_0_#c85a17]"
    >
      {/* ── PORTADA LÍMPIA ── */}
      <div className="relative w-full aspect-[2/3] overflow-hidden bg-[#0d0a08]">
        <img
          src={buildPoster()}
          alt={title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={() => setImgError(true)}
        />

        {/* Overlay HOVER: Animación del Botón Play y Año */}
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-[#c85a17]/15">
          
          {/* Badge del Año (Aparece en hover) */}
          <div className="absolute top-2 left-2 bg-[#c85a17] text-[#fff] font-mono text-[10px] font-bold tracking-widest px-2 py-1 transform -translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            {media.year || "----"}
          </div>

          {/* Botón Play sólido y limpio */}
          <div className="bg-[#c85a17] border-2 border-[#1c1714] p-3 shadow-[3px_3px_0_0_#1c1714] text-[#fff] transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <FaPlay size={16} className="ml-1" />
          </div>
        </div>
      </div>

      {/* ── FOOTER INFO ── */}
      <div className="p-3 flex flex-col flex-1 justify-between bg-[#e8d5b7] border-t-2 border-[#5c4a3d] z-10">
        
        <h3
          className="uppercase font-bold leading-tight truncate text-[#1c1714]"
          style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontSize: '11px',
            letterSpacing: '0.05em',
          }}
          title={title}
        >
          {title}
        </h3>

        <div className="mt-2">
          {media.genres && (
            <p className="font-mono text-[9px] text-[#5c4a3d] tracking-widest uppercase truncate opacity-80">
              {media.genres.split(',')[0].trim()}
            </p>
          )}

          {/* Barra de Progreso */}
          {media.progress > 0 && (
            <div className="w-full bg-[#1c1714] h-1.5 mt-2 rounded-sm overflow-hidden">
              <div 
                className="bg-[#c85a17] h-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(0, media.progress))}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}