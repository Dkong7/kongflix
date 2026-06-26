import { useEffect, useState, useMemo } from 'react';
import { pb } from '../services/pb';
import { FaToolbox, FaExclamationTriangle, FaDownload, FaDesktop, FaPalette, FaMusic, FaFont, FaCube, FaPaintBrush, FaTimes, FaFolderOpen, FaFileAlt } from 'react-icons/fa';

export default function Recursos() {
  const [recursos, setRecursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Modal State
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    pb.collection('recursos_db').getFullList({
      sort: 'folderName,titleClean',
      requestKey: null
    }).then(records => {
      setRecursos(records);
      setLoading(false);
    }).catch(err => {
      setErrorMsg(err.message);
      setLoading(false);
    });
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(recursos.map(r => r.category || 'Otros'));
    return ['All', ...Array.from(cats).sort()];
  }, [recursos]);

  const filteredRecursos = useMemo(() => {
    if (activeCategory === 'All') return recursos;
    return recursos.filter(r => (r.category || 'Otros') === activeCategory);
  }, [recursos, activeCategory]);

  // Agrupamos los recursos por "folderName" (Simula la carpeta original de Drive)
  const groupedRecursos = useMemo(() => {
    const groups = {};
    filteredRecursos.forEach(r => {
      const groupName = r.folderName && r.folderName !== "Raíz" && r.folderName !== r.category ? r.folderName : r.titleClean;
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(r);
    });

    return Object.keys(groups).map(folderName => {
      const files = groups[folderName];
      const mainCat = files[0].category || 'Otros';
      const dev = files[0].developer || 'Desarrollador';
      
      // Buscamos un archivo que tenga iconId para usar de portada de la carpeta
      const iconFile = files.find(f => f.iconId);
      const iconId = iconFile ? iconFile.iconId : null;

      // Si hay más de 1 archivo, es un "Paquete" / Carpeta
      return {
        id: files[0].id,
        folderName: folderName,
        category: mainCat,
        developer: dev,
        iconId: iconId,
        files: files
      };
    }).sort((a, b) => a.folderName.localeCompare(b.folderName));
  }, [filteredRecursos]);

  const getCategoryIcon = (cat) => {
    const lower = cat.toLowerCase();
    if (lower.includes('audio')) return <FaMusic />;
    if (lower.includes('visual')) return <FaDesktop />;
    if (lower.includes('blender')) return <FaCube />;
    if (lower.includes('dibujo')) return <FaPaintBrush />;
    if (lower.includes('adobe')) return <FaPalette />;
    if (lower.includes('fuentes')) return <FaFont />;
    return <FaToolbox />;
  };

  const handleDownload = (driveId) => {
    // Descarga directa utilizando el motor uc?export=download de Drive
    window.open(`https://drive.google.com/uc?export=download&id=${driveId}&confirm=t`, '_blank');
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#111111] gap-4">
      <FaToolbox size={48} color="#00ffcc" className="animate-pulse" />
      <div className="font-mono text-xs text-[#00ffcc] tracking-widest">
        CARGANDO RECURSOS...
      </div>
    </div>
  );

  if (errorMsg) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#111111] text-[#ff4d4d] p-10 text-center font-mono">
      <FaExclamationTriangle size={64} className="mb-5 text-[#ff4d4d]" />
      <h2 className="text-2xl font-bold uppercase">Error del Servidor</h2>
      <code className="bg-black p-3 mt-5 border border-[#ff4d4d] text-xs">{errorMsg}</code>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex pt-[64px] font-sans">
      
      {/* SIDEBAR LATERAL OSCURO (Estilo G-Meh) */}
      <aside className="w-64 bg-[#111111] border-r border-[#222222] p-6 hidden md:block shrink-0 h-[calc(100vh-64px)] overflow-y-auto sticky top-[64px]">
        <div className="mb-8">
          <h2 className="text-xs font-black tracking-widest text-[#555555] uppercase mb-4">Categorías</h2>
          <nav className="flex flex-col gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all text-sm font-bold ${
                  activeCategory === cat 
                    ? 'bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/30' 
                    : 'text-[#888888] hover:bg-[#222222] hover:text-white'
                }`}
              >
                {cat !== 'All' ? getCategoryIcon(cat) : <FaToolbox />}
                {cat}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-6 md:p-10 relative">
        
        {/* SELECTOR MÓVIL */}
        <div className="md:hidden mb-6">
          <select 
            value={activeCategory} 
            onChange={(e) => setActiveCategory(e.target.value)}
            className="w-full bg-[#111111] border border-[#333333] text-white p-3 rounded-lg font-bold"
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <header className="mb-10">
          <h1 className="text-3xl md:text-5xl font-black mb-2 tracking-tight">Recursos y Software</h1>
          <p className="text-[#888888] text-sm md:text-base max-w-2xl">Descarga herramientas, plugins, texturas y assets organizados por paquete o carpeta.</p>
        </header>

        {/* TARJETAS DE PAQUETES (AGRUPADAS) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {groupedRecursos.map(group => {
            const iconUrl = group.iconId 
              ? `https://drive.google.com/thumbnail?id=${group.iconId}&sz=w200` 
              : '/logo.svg';

            return (
              <div 
                key={group.id} 
                onClick={() => setSelectedGroup(group)}
                className="bg-[#151515] border border-[#222222] rounded-xl overflow-hidden hover:border-[#00ffcc]/50 hover:shadow-[0_0_20px_rgba(0,255,204,0.1)] transition-all cursor-pointer group flex flex-col h-full"
              >
                
                <div className="p-6 flex-1">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-[#222222] border border-[#333333] flex items-center justify-center shrink-0 overflow-hidden p-2 group-hover:scale-105 transition-transform">
                      <img src={iconUrl} alt={group.folderName} className="w-full h-full object-contain" />
                    </div>
                    
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold leading-tight group-hover:text-[#00ffcc] transition-colors truncate">{group.folderName}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] bg-[#222222] text-[#aaaaaa] px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                          {group.files.length} {group.files.length === 1 ? 'Archivo' : 'Archivos'}
                        </span>
                        <span className="text-xs text-[#666666] truncate">{group.developer}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#0a0a0a] border-t border-[#222222] flex items-center justify-between">
                  <span className="text-xs text-[#555555] font-mono tracking-wider flex items-center gap-1.5">
                    {getCategoryIcon(group.category)} {group.category.toUpperCase()}
                  </span>
                  <span className="text-[#00ffcc] font-bold text-sm group-hover:underline flex items-center gap-2">
                    <FaFolderOpen /> Ver Contenido
                  </span>
                </div>

              </div>
            );
          })}
        </div>
        
        {groupedRecursos.length === 0 && (
          <div className="text-center py-20 text-[#555555]">
            <FaToolbox size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">No hay paquetes en esta categoría.</p>
          </div>
        )}

      </main>

      {/* MODAL DE DESCARGA BONITO */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
            
            {/* Header del Modal */}
            <div className="p-6 border-b border-[#222222] flex gap-4 items-center bg-[#151515]">
              <div className="w-16 h-16 rounded-xl bg-[#0a0a0a] border border-[#222222] flex items-center justify-center shrink-0 p-2">
                <img 
                  src={selectedGroup.iconId ? `https://drive.google.com/thumbnail?id=${selectedGroup.iconId}&sz=w200` : '/logo.svg'} 
                  alt={selectedGroup.folderName} 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-black text-white truncate">{selectedGroup.folderName}</h2>
                <p className="text-[#00ffcc] text-sm font-mono tracking-wider mt-1 flex items-center gap-2">
                  <FaFolderOpen /> Paquete de {selectedGroup.category}
                </p>
              </div>
              <button 
                onClick={() => setSelectedGroup(null)}
                className="w-10 h-10 rounded-full bg-[#222222] hover:bg-[#ff4d4d] hover:text-white flex items-center justify-center transition-colors text-[#aaaaaa]"
              >
                <FaTimes />
              </button>
            </div>

            {/* Lista de Archivos */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a]">
              <h3 className="text-xs font-bold text-[#666666] uppercase tracking-widest mb-4">Contenido del paquete</h3>
              <div className="flex flex-col gap-3">
                {selectedGroup.files.map((file, idx) => (
                  <div key={idx} className="bg-[#151515] border border-[#222222] rounded-lg p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:border-[#333333] transition-colors">
                    
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded bg-[#222222] flex items-center justify-center text-[#aaaaaa] shrink-0">
                        <FaFileAlt size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm truncate" title={file.titleOriginal || file.titleClean}>
                          {file.titleOriginal || file.titleClean}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-[#333333] text-white px-1.5 py-0.5 rounded font-mono uppercase">
                            {file.format || 'FILE'}
                          </span>
                          <span className="text-xs text-[#666666]">
                            {new Date(file.dateCreated || file.created).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDownload(file.driveId)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/30 hover:bg-[#00ffcc] hover:text-black font-bold px-4 py-2.5 rounded-lg text-sm transition-all shrink-0"
                    >
                      <FaDownload /> Bajar
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
