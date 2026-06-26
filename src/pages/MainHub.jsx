import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Film, Tv, GraduationCap, Music, BookOpen, Gamepad2, 
  Video, Smile, Mic2, Library, Archive, MonitorPlay, BrainCircuit, PlaySquare
} from 'lucide-react';

const HUB_ITEMS = [
  { id: 'konggpt', label: 'KongGPT', path: '/konggpt', icon: BrainCircuit, color: '#c85a17', dx: 0, dy: 0, isCenter: true },
  
  // Ring 1
  { id: 'movies', label: 'Películas', path: '/movies', icon: Film, color: '#e63946', dx: -160, dy: 0 },
  { id: 'series', label: 'Series', path: '/series', icon: Tv, color: '#457b9d', dx: 160, dy: 0 },
  { id: 'courses', label: 'Educación', path: '/courses', icon: GraduationCap, color: '#2a9d8f', dx: -80, dy: -138 },
  { id: 'music', label: 'Música', path: '/music', icon: Music, color: '#f4a261', dx: 80, dy: -138 },
  { id: 'comics', label: 'Comics', path: '/comics', icon: BookOpen, color: '#9d4edd', dx: -80, dy: 138 },
  { id: 'games', label: 'Juegos', path: '/games', icon: Gamepad2, color: '#0077b6', dx: 80, dy: 138 },
  
  // Ring 2
  { id: 'documentaries', label: 'Documentales', path: '/documentaries', icon: Video, color: '#6a994e', dx: -240, dy: -138 },
  { id: 'comedy', label: 'Comedia', path: '/comedy', icon: Smile, color: '#e76f51', dx: 240, dy: -138 },
  { id: 'concerts', label: 'Conciertos', path: '/concerts', icon: Mic2, color: '#bc4749', dx: -240, dy: 138 },
  { id: 'libros', label: 'Libros', path: '/libros', icon: Library, color: '#386641', dx: 240, dy: 138 },
  { id: 'recursos', label: 'Recursos', path: '/recursos', icon: Archive, color: '#a2d2ff', dx: 0, dy: -276 },
  { id: 'catalog', label: 'Catálogo General', path: '/catalog', icon: PlaySquare, color: '#ffb703', dx: 0, dy: 276 },
];

export default function MainHub() {
  const navigate = useNavigate();
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight - 80; 
      // Box limits approx 700x800
      const scaleX = Math.min(1, width / 700);
      const scaleY = Math.min(1, height / 800);
      setScale(Math.min(scaleX, scaleY) * 0.95);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-80px)] overflow-hidden flex items-center justify-center bg-[#050505]">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at center, #c85a17 0%, transparent 60%)'
      }} />

      <div 
        className="relative transition-transform duration-300"
        style={{ transform: `scale(${scale})` }}
      >
        {HUB_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`absolute flex flex-col items-center justify-center group transition-all duration-300 hover:z-10 focus:outline-none hover:scale-110`}
            style={{
              width: '150px',
              height: '173px',
              left: `${item.dx - 75}px`,
              top: `${item.dy - 86.5}px`,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}
          >
            {/* Hexagon Background Layer */}
            <div 
              className="absolute inset-0 transition-all duration-300"
              style={{
                backgroundColor: item.color,
                opacity: item.isCenter ? 1 : 0.85,
                boxShadow: `inset 0 0 20px rgba(0,0,0,0.5)`,
              }}
            />
            
            {/* Hexagon Inner Layer (Darker gradient for depth) */}
            <div 
              className="absolute inset-[4px] flex flex-col items-center justify-center transition-all duration-300 group-hover:bg-[#1c1714]/80"
              style={{
                backgroundColor: '#1c1714',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                backgroundImage: item.isCenter ? 'radial-gradient(circle at center, #2a231f 0%, #1c1714 100%)' : 'none'
              }}
            >
              <item.icon 
                size={item.isCenter ? 48 : 32} 
                color={item.color} 
                className={`mb-2 transition-transform duration-300 group-hover:scale-110 ${item.isCenter ? 'animate-pulse' : ''}`}
                style={{ filter: `drop-shadow(0 0 8px ${item.color})` }}
              />
              <span className={`font-chakra font-bold tracking-wider text-center px-2 leading-tight ${item.isCenter ? 'text-sm text-[#d4b595]' : 'text-xs text-white'}`}>
                {item.label}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
