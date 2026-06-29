import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Film, Tv, GraduationCap, Music, BookOpen, Gamepad2, 
  Video, Smile, Mic2, Library, Archive, MonitorPlay, BrainCircuit, PlaySquare
} from 'lucide-react';

const HUB_ITEMS = [
  { id: 'konggpt', label: 'KongGPT', path: '/konggpt', icon: BrainCircuit, color: '#c85a17', dx: 0, dy: 0, isCenter: true },
  
  // Ring 1
  { id: 'movies', label: 'Películas', path: '/movies', icon: Film, color: '#cfaa70', dx: -200, dy: 0 },
  { id: 'series', label: 'Series', path: '/series', icon: Tv, color: '#d4b595', dx: 200, dy: 0 },
  { id: 'courses', label: 'Educación', path: '/courses', icon: GraduationCap, color: '#a0522d', dx: -100, dy: -172 },
  { id: 'music', label: 'Música', path: '/music', icon: Music, color: '#cd853f', dx: 100, dy: -172 },
  { id: 'comics', label: 'Comics', path: '/comics', icon: BookOpen, color: '#d2691e', dx: -100, dy: 172 },
  { id: 'games', label: 'Juegos', path: '/games', icon: Gamepad2, color: '#8b4513', dx: 100, dy: 172 },
  
  // Ring 2
  { id: 'documentaries', label: 'Documentales', path: '/documentaries', icon: Video, color: '#cfaa70', dx: -300, dy: -172 },
  { id: 'comedy', label: 'Comedia', path: '/comedy', icon: Smile, color: '#d4b595', dx: 300, dy: -172 },
  { id: 'concerts', label: 'Conciertos', path: '/concerts', icon: Mic2, color: '#a0522d', dx: -300, dy: 172 },
  { id: 'libros', label: 'Libros', path: '/libros', icon: Library, color: '#cd853f', dx: 300, dy: 172 },
  { id: 'recursos', label: 'Recursos', path: '/recursos', icon: Archive, color: '#d2691e', dx: 0, dy: -344 },
  { id: 'catalog', label: 'Catálogo', path: '/catalog', icon: PlaySquare, color: '#8b4513', dx: 0, dy: 344 },
];

export default function MainHub() {
  const navigate = useNavigate();
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight - 80; 
      // Box limits approx 850x950
      const scaleX = Math.min(1, width / 850);
      const scaleY = Math.min(1, height / 950);
      setScale(Math.min(scaleX, scaleY) * 0.95);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-80px)] overflow-hidden flex items-center justify-center bg-[#050505]">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at center, #c85a17 0%, transparent 50%)'
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
              width: '188px',
              height: '216px',
              left: `${item.dx - 94}px`,
              top: `${item.dy - 108}px`,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}
          >
            {/* Hexagon Background Layer */}
            <div 
              className="absolute inset-0 transition-all duration-300 group-hover:bg-[#c85a17]"
              style={{
                backgroundColor: item.color,
                opacity: item.isCenter ? 1 : 0.9,
                boxShadow: `inset 0 0 20px rgba(0,0,0,0.5)`,
              }}
            />
            
            {/* Hexagon Inner Layer */}
            <div 
              className="absolute inset-[4px] flex flex-col items-center justify-center transition-all duration-300 group-hover:bg-[#4a3525]"
              style={{
                backgroundColor: item.isCenter ? '#2a231f' : '#3d3027',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                backgroundImage: item.isCenter ? 'radial-gradient(circle at center, #3d3027 0%, #1c1714 100%)' : 'none'
              }}
            >
              <item.icon 
                size={item.isCenter ? 56 : 40} 
                color={item.isCenter ? '#c85a17' : item.color} 
                className={`mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:text-[#f0e6d3] ${item.isCenter ? 'animate-pulse' : ''}`}
                style={{ filter: `drop-shadow(0 0 10px ${item.isCenter ? '#c85a17' : item.color})` }}
              />
              <span className={`font-chakra font-bold tracking-wider text-center px-2 leading-tight ${item.isCenter ? 'text-lg text-[#c85a17] group-hover:text-[#f0e6d3]' : 'text-sm text-[#f0e6d3]'}`}>
                {item.label}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
