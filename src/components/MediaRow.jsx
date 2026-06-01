import { useRef, useState, useMemo } from 'react';
import { FaChevronLeft, FaChevronRight, FaCalendarAlt, FaSortAlphaDown } from 'react-icons/fa';

/**
 * Acepta tres formatos de entrada:
 * 1. ID puro de Drive  →  "1-0q59_2nQ04Ab7b4iTBMqkNQ2PSa50V4"
 * 2. URL completa de Drive → "https://drive.google.com/..."
 * 3. Cualquier otra URL externa → se usa directamente
 */
function buildUrlVariants(input) {
  if (!input) return [];

  if (input.startsWith('http')) {
    if (input.includes('drive.google.com') || input.includes('googleusercontent')) {
      const m = input.match(/(?:id=|\/d\/|open\?id=)([a-zA-Z0-9_-]{15,})/);
      if (m) return driveVariants(m[1]);
    }
    return [input];
  }

  if (/^[a-zA-Z0-9_-]{15,}$/.test(input)) {
    return driveVariants(input);
  }

  return [input];
}

function driveVariants(id) {
  return [
    `https://drive.google.com/thumbnail?id=${id}&sz=w800`,
    `https://lh3.googleusercontent.com/d/${id}`,
    `https://drive.google.com/uc?export=view&id=${id}`,
  ];
}

/** Imagen con reintentos en cascada + placeholder visible si todo falla */
function PosterImage({ url, title, year }) {
  const variants = buildUrlVariants(url || '');
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed]   = useState(false);

  if (failed || variants.length === 0) {
    return (
      <div className="absolute inset-0 bg-[#d4b595] flex flex-col items-center justify-center p-3 gap-2">
        <div className="w-6 h-[2px] bg-[#c85a17]" />
        <span className="text-[#1c1714] text-[10px] font-black uppercase text-center leading-tight">
          {title}
        </span>
        <span className="text-[8px] font-mono text-[#5c4a3d]">{year}</span>
        <div className="w-6 h-[2px] bg-[#c85a17]" />
      </div>
    );
  }

  return (
    <img
      src={variants[attempt]}
      alt={title}
      loading="lazy"
      onError={() => {
        if (attempt + 1 < variants.length) setAttempt(a => a + 1);
        else setFailed(true);
      }}
      className="absolute inset-0 w-full h-full object-cover
        group-hover/card:scale-105 transition-transform duration-500"
    />
  );
}

export default function MediaRow({ title, items, onMediaClick }) {
  const rowRef = useRef(null);
  const [sortBy, setSortBy] = useState('YEAR'); // 'YEAR' o 'ALPHA'

  const scroll = (dir) => {
    if (!rowRef.current) return;
    const { scrollLeft, clientWidth } = rowRef.current;
    rowRef.current.scrollTo({
      left: dir === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth,
      behavior: 'smooth',
    });
  };

  // Motor de ordenamiento local para esta fila específica
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === 'ALPHA') {
        const nameA = (a.tmdbTitle || a.name || '').toLowerCase();
        const nameB = (b.tmdbTitle || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      } else {
        // Por defecto: Año más reciente primero
        return (b.year || 0) - (a.year || 0);
      }
    });
  }, [items, sortBy]);

  return (
    <div className="space-y-3 md:space-y-4 group/row relative">
      
      {/* ── CABECERA DE LA FILA ── */}
      <div className="flex items-center gap-0 flex-wrap md:flex-nowrap">
        <div className="w-1 h-5 md:h-7 bg-[#c85a17] mr-2 md:mr-3 flex-shrink-0" />
        <span className="text-[#c85a17] font-black text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] uppercase mr-2 shrink-0">
          SECTOR //
        </span>
        <h3 className="text-[#1c1714] font-black uppercase tracking-widest text-xs md:text-sm leading-none shrink-0">
          {title}
        </h3>
        
        <div className="flex-1 h-px bg-[#5c4a3d]/30 ml-2 md:ml-4 hidden sm:block" />
        
        {/* Controles de la fila (Recuento + Ordenador) */}
        <div className="ml-auto flex items-center gap-3 mt-2 sm:mt-0 w-full sm:w-auto justify-end">
          <span className="text-[#5c4a3d] text-[8px] md:text-[9px] font-mono tracking-widest bg-[#f0e6d3] border border-[#5c4a3d] px-2 py-0.5">
            {items.length} REC
          </span>
          <button 
            onClick={() => setSortBy(s => s === 'YEAR' ? 'ALPHA' : 'YEAR')}
            className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-1 transition-all border border-[#5c4a3d] hover:bg-[#c85a17] hover:text-[#1c1714] hover:border-[#c85a17] text-[#5c4a3d]"
            title="Cambiar orden"
          >
            {sortBy === 'YEAR' ? <FaCalendarAlt size={10} /> : <FaSortAlphaDown size={11} />}
            <span className="hidden sm:inline">{sortBy === 'YEAR' ? 'CRONOLÓGICO' : 'ALFABÉTICO'}</span>
          </button>
        </div>
      </div>

      {/* ── CARRUSEL ── */}
      <div className="relative flex items-center">
        
        {/* Botón Izquierdo (Oculto en móvil) */}
        <button onClick={() => scroll('left')}
          className="absolute left-0 z-40 h-[calc(100%-8px)] w-10
            bg-[#d4b595]/95 hover:bg-[#c85a17] text-[#1c1714] hover:text-white
            hidden md:flex items-center justify-center
            opacity-0 group-hover/row:opacity-100 transition-all duration-200
            border-r border-[#5c4a3d]">
          <FaChevronLeft size={15} />
        </button>

        <div ref={rowRef}
          className="flex gap-2 md:gap-3 overflow-x-auto scroll-smooth pb-3 px-1 scrollbar-hide snap-x md:snap-none">
          {sortedItems.map((item) => (
            <div key={item.id} onClick={() => onMediaClick(item)}
              className="min-w-[125px] sm:min-w-[150px] md:min-w-[190px] aspect-[2/3] flex-shrink-0 snap-start
                cursor-pointer overflow-hidden relative group/card bg-[#d4b595]
                border-2 border-[#5c4a3d] hover:border-[#c85a17]
                shadow-[2px_2px_0_#5c4a3d] hover:shadow-[3px_3px_0_#c85a17]
                transition-all duration-200 hover:-translate-y-1">

              <PosterImage
                url={item.poster?.trim() || item.coverId?.trim() || ''}
                title={item.name || item.tmdbTitle}
                year={item.year}
              />

              {/* Overlay (Se activa al hacer hover en PC o al mantener presionado en móvil) */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent
                opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none" />

              {/* Etiqueta de Año */}
              <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 z-10
                bg-[#c85a17] text-white text-[8px] md:text-[9px] font-black px-1.5 md:px-2 py-0.5 font-mono tracking-widest shadow-sm">
                {item.year || 'N/A'}
              </div>

              {/* Título emergente */}
              <div className="absolute inset-x-0 bottom-0 z-10 p-2 md:p-3
                bg-[#1c1714]/95 border-t-2 border-[#c85a17]
                translate-y-full group-hover/card:translate-y-0
                transition-transform duration-200">
                <span className="text-[9px] md:text-[10px] text-[#d4b595] font-black uppercase block truncate tracking-tight">
                  {item.name || item.tmdbTitle}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Botón Derecho (Oculto en móvil) */}
        <button onClick={() => scroll('right')}
          className="absolute right-0 z-40 h-[calc(100%-8px)] w-10
            bg-[#d4b595]/95 hover:bg-[#c85a17] text-[#1c1714] hover:text-white
            hidden md:flex items-center justify-center
            opacity-0 group-hover/row:opacity-100 transition-all duration-200
            border-l border-[#5c4a3d]">
          <FaChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}