import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBars, FaTimes, FaPowerOff } from 'react-icons/fa';

export default function Navbar({ user, onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const menuItems = [
    { path: 'movies', label: 'Movies' },
    { path: 'series', label: 'Series' },
    { path: 'documentaries', label: 'Documentales' },
    { path: 'comedy', label: 'Comedia' },
    { path: 'courses', label: 'Educación' },
    { path: 'concerts', label: 'Conciertos' },
    { path: 'music', label: 'Música' },
    { path: 'comics', label: 'Comics' }, 
    { path: 'games', label: 'Juegos' }
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#1c1714]/95 border-b-2 border-[#5c4a3d] backdrop-blur-md font-chakra">
      <div className="max-w-[1920px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        
        {/* LOGO */}
        <Link to="/" onClick={closeMobileMenu} className="flex items-center group relative transform transition-transform duration-300 hover:scale-110 shrink-0 z-50">
          <img 
            src="/logo.svg" 
            alt="Logo" 
            className="h-12 w-auto object-contain filter drop-shadow-[0_0_8px_var(--eva-orange)] group-hover:drop-shadow-[0_0_20px_var(--eva-green)]" 
          />
        </Link>

        {/* ENLACES DE ESCRITORIO */}
        <div className="hidden lg:flex items-center gap-1 xl:gap-2 font-bold text-[11px] xl:text-[13px] uppercase tracking-wider text-[#e6d5c3]">
          {menuItems.map((item) => {
            const isActive = location.pathname.includes(item.path);
            return (
              <Link 
                key={item.path} 
                to={`/${item.path}`} 
                className={`px-2 xl:px-3 py-1.5 border-b-2 transition-all whitespace-nowrap ${
                  isActive 
                  ? 'border-[#d4b595] text-[#d4b595]' 
                  : 'border-transparent hover:border-[#d4b595] hover:text-[#d4b595]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* BOTONES DERECHA (LOGOUT Y MENÚ MÓVIL) */}
        <div className="flex items-center gap-3 shrink-0 z-50">
          
          {user && (
            <button 
              onClick={onLogout}
              title="Cerrar Sesión"
              className="p-2 border-2 border-[#5c4a3d] text-[#e63946] hover:bg-[#e63946] hover:text-white transition-all shadow-brutal-purple active:translate-y-1 active:shadow-none"
            >
              <FaPowerOff size={14} />
            </button>
          )}

          {/* BOTÓN MENÚ HAMBURGUESA (SÓLO MÓVIL) */}
          <button 
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 border-2 border-[#5c4a3d] text-[#d4b595] hover:bg-[#5c4a3d] transition-all shadow-brutal-purple active:translate-y-1 active:shadow-none"
          >
            {isMobileMenuOpen ? <FaTimes size={16} /> : <FaBars size={16} />}
          </button>
        </div>
      </div>

      {/* MENÚ DESPLEGABLE MÓVIL */}
      <div className={`lg:hidden absolute top-16 left-0 w-full bg-[#1c1714] border-b-2 border-[#5c4a3d] flex flex-col transition-all duration-300 origin-top overflow-hidden ${isMobileMenuOpen ? 'scale-y-100 opacity-100 h-auto py-4' : 'scale-y-0 opacity-0 h-0 py-0'}`}>
        {menuItems.map((item) => {
          const isActive = location.pathname.includes(item.path);
          return (
            <Link 
              key={item.path} 
              to={`/${item.path}`} 
              onClick={closeMobileMenu}
              className={`px-6 py-3 font-bold uppercase tracking-widest border-l-4 transition-all ${
                isActive 
                ? 'border-[#d4b595] text-[#d4b595] bg-[#29221c]' 
                : 'border-transparent text-[#e6d5c3] hover:border-[#c85a17] hover:bg-[#29221c] hover:text-[#c85a17]'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}