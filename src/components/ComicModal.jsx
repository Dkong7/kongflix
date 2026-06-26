import { useState, useEffect, useRef, memo } from 'react';
import { pb } from '../services/pb';
import { useWatchProgress } from '../hooks/useWatchProgress';
import { FaTimes, FaSearchPlus, FaSearchMinus, FaArrowLeft, FaArrowRight, FaSpinner, FaExclamationTriangle, FaHeart, FaRegHeart, FaBookOpen, FaScroll } from 'react-icons/fa';
import ShareButton from './ShareButton';

/** COMPONENTE INTERNO: Renderiza 1 sola página con Lazy Loading para Modo Cascada */
const PdfPage = memo(({ pdfDoc, pageNum, zoom, isTwoPage, onVisible }) => {
  const canvasRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  // Lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '1000px' });
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  // Tracking para guardar progreso
  useEffect(() => {
    const tracker = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && entries[0].intersectionRatio > 0.5) {
        if(onVisible) onVisible(pageNum);
      }
    }, { threshold: 0.5 });
    if (canvasRef.current) tracker.observe(canvasRef.current);
    return () => tracker.disconnect();
  }, [pageNum, onVisible]);

  useEffect(() => {
    let renderTask = null;
    if (isVisible && pdfDoc && canvasRef.current) {
      pdfDoc.getPage(pageNum).then(page => {
        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const ctx = canvas.getContext('2d');
        renderTask = page.render({ canvasContext: ctx, viewport });
      });
    }
    return () => { if(renderTask) renderTask.cancel(); };
  }, [isVisible, pdfDoc, pageNum, zoom]);

  // Si es 2 páginas y no es la portada (página 1), usa width 50%
  const flexWidth = (isTwoPage && pageNum > 1) ? 'w-1/2 md:w-1/2' : 'w-full';

  return (
    <div className={`flex justify-center items-center ${flexWidth} p-1 shrink-0 transition-all`} id={`page-${pageNum}`}>
      <canvas ref={canvasRef} className="shadow-[4px_4px_0_0_#0f0c0a] md:shadow-[8px_8px_0_0_#0f0c0a] bg-[#e8d5b7] max-w-full" style={{ height: 'auto' }}></canvas>
    </div>
  );
});

export default function ComicModal({ comic, onClose, collectionName = 'comics_db' }) {
  const [zoom, setZoom] = useState(0.4); 
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isTwoPage, setIsTwoPage] = useState(false);
  const [readMode, setReadMode] = useState('paginated'); // 'paginated' | 'cascade'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFav, setIsFav] = useState(comic.favorite || false);

  const canvas1Ref = useRef(null);
  const canvas2Ref = useRef(null);
  const pdfDocRef = useRef(null);
  
  const scrollRef = useRef(null);
  const dragState = useRef({ isDown: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });

  // Hook de Progreso Integrado
  const { loadProgress, saveProgress } = useWatchProgress('comic', comic.id);

  // 1. CARGA INICIAL DEL PDF Y EL PROGRESO
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const initViewer = async () => {
      try {
        setLoading(true);
        setError(null);

        const rec = await loadProgress();
        let initialPage = 1;
        if (rec && rec.progress) {
          initialPage = rec.progress;
          setCurrentPage(initialPage);
        }

        const pdfjsLib = window.pdfjsLib;
        if (!pdfjsLib) throw new Error("Motor PDF.js no detectado.");
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const apiKey = "AIzaSyAYHAuZb_neKRSlejQ5qd9RRY3C4FgxAE0"; 
        const driveApiUrl = `https://www.googleapis.com/drive/v3/files/${comic.driveId}?alt=media&key=${apiKey}`;

        const loadingTask = pdfjsLib.getDocument(driveApiUrl);
        const pdf = await loadingTask.promise;
        pdfDocRef.current = pdf;
        
        setTotalPages(pdf.numPages);
        setLoading(false);
        
        if (readMode === 'paginated') {
            renderPages(initialPage, 0.4, isTwoPage);
        } else {
            // Scroll a la página guardada en modo cascada después de un tick
            setTimeout(() => {
                const el = document.getElementById(`page-${initialPage}`);
                if (el && scrollRef.current) {
                    scrollRef.current.scrollTop = el.offsetTop - 100;
                }
            }, 500);
        }

      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    initViewer();

    return () => { document.body.style.overflow = 'auto'; };
  }, [comic.driveId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. GUARDADO AUTOMÁTICO DE PROGRESO AL CAMBIAR DE PÁGINA
  useEffect(() => {
    if (totalPages > 0) {
      saveProgress({
        progress: currentPage,
        total: totalPages,
        title: comic.titleClean || comic.titleOriginal,
        cover_id: comic.coverId || ''
      });
    }
  }, [currentPage, totalPages, saveProgress, comic]);

  // MOTOR DE RENDERIZADO (MODO PAGINADO)
  const renderPages = async (pageNum, currentZoom, twoPageMode) => {
    if (readMode !== 'paginated') return;
    if (!pdfDocRef.current) return;
    try {
      await renderSinglePage(pageNum, canvas1Ref.current, currentZoom);
      if (twoPageMode && pageNum < pdfDocRef.current.numPages) {
        canvas2Ref.current.style.display = 'block';
        await renderSinglePage(pageNum + 1, canvas2Ref.current, currentZoom);
      } else {
        if (canvas2Ref.current) canvas2Ref.current.style.display = 'none';
      }
    } catch (e) {
      console.error(e);
    }
  };

  const renderSinglePage = async (num, canvas, currentZoom) => {
    if (!canvas) return;
    const page = await pdfDocRef.current.getPage(num);
    const viewport = page.getViewport({ scale: currentZoom });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
  };

  // RE-RENDER AL CAMBIAR ZOOM O MODO DOS PÁGINAS
  useEffect(() => {
    if (!loading && pdfDocRef.current && readMode === 'paginated') {
      renderPages(currentPage, zoom, isTwoPage);
    }
  }, [zoom, isTwoPage, readMode]);

  // CONTROLES DE PÁGINA (PAGINADO)
  const handleNext = () => {
    const step = isTwoPage ? 2 : 1;
    if (currentPage + step <= totalPages) {
      const next = currentPage + step;
      setCurrentPage(next);
      renderPages(next, zoom, isTwoPage);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  };

  const handlePrev = () => {
    const step = isTwoPage ? 2 : 1;
    if (currentPage - step >= 1) {
      const prev = currentPage - step;
      setCurrentPage(prev);
      renderPages(prev, zoom, isTwoPage);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  };

  const toggleFav = async () => {
    try {
      const newState = !isFav;
      setIsFav(newState);
      await pb.collection(collectionName).update(comic.id, { favorite: newState });
    } catch (err) { setIsFav(!isFav); }
  };

  const handleZoomOut = () => setZoom(z => Number(Math.max(0.1, z - 0.1).toFixed(2)));
  const handleZoomIn = () => setZoom(z => Number(Math.min(5.0, z + 0.1).toFixed(2)));

  const toggleReadMode = () => {
      setReadMode(prev => prev === 'paginated' ? 'cascade' : 'paginated');
      // Asegurarse que el scroll vuelva a arriba si cambia a paginado
      if (readMode === 'cascade' && scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  // CONTROLES DE ARRASTRE
  const onMouseDown = (e) => {
    if (!scrollRef.current) return;
    dragState.current.isDown = true;
    dragState.current.startX = e.pageX - scrollRef.current.offsetLeft;
    dragState.current.startY = e.pageY - scrollRef.current.offsetTop;
    dragState.current.scrollLeft = scrollRef.current.scrollLeft;
    dragState.current.scrollTop = scrollRef.current.scrollTop;
  };
  const onMouseLeaveOrUp = () => { dragState.current.isDown = false; };
  const onMouseMove = (e) => {
    if (!dragState.current.isDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const y = e.pageY - scrollRef.current.offsetTop;
    const walkX = (x - dragState.current.startX) * 1.5; 
    const walkY = (y - dragState.current.startY) * 1.5;
    scrollRef.current.scrollLeft = dragState.current.scrollLeft - walkX;
    scrollRef.current.scrollTop = dragState.current.scrollTop - walkY;
  };

  // CONTROL DE RUEDA DEL RATÓN PARA ZOOM
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const handleWheel = (e) => {
      if(e.ctrlKey || e.metaKey) {
        e.preventDefault(); 
        setZoom(prevZoom => {
          const zoomDirection = e.deltaY > 0 ? -1 : 1;
          const zoomStep = 0.05; 
          let newZoom = prevZoom + (zoomStep * zoomDirection);
          newZoom = Number(Math.min(Math.max(0.1, newZoom), 5.0).toFixed(2));

          if (newZoom !== prevZoom && scrollRef.current) {
            const rect = scrollRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const scrollLeft = scrollRef.current.scrollLeft;
            const scrollTop = scrollRef.current.scrollTop;
            const scaleChange = newZoom / prevZoom;

            requestAnimationFrame(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollLeft = (scrollLeft + mouseX) * scaleChange - mouseX;
                scrollRef.current.scrollTop = (scrollTop + mouseY) * scaleChange - mouseY;
              }
            });
          }
          return newZoom;
        });
      }
    };
    scrollEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => { scrollEl.removeEventListener('wheel', handleWheel); };
  }, []);

  // Renderizar páginas dinámicamente en Modo Cascada
  const renderCascadePages = () => {
    if (!pdfDocRef.current || totalPages === 0) return null;
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        pages.push(
            <PdfPage 
                key={i} 
                pdfDoc={pdfDocRef.current} 
                pageNum={i} 
                zoom={zoom} 
                isTwoPage={isTwoPage} 
                onVisible={(n) => setCurrentPage(n)}
            />
        );
    }
    return pages;
  };

  return (
    <div className="fixed inset-0 bg-[#1c1714]/95 z-[100] flex flex-col p-2 md:p-4 backdrop-blur-md font-chakra">
      
      {/* ── TOOLBAR SUPERIOR RESPONSIVE ── */}
      <div className="bg-[#29221c] border-2 border-[#5c4a3d] p-3 flex flex-col md:flex-row justify-between items-center shadow-[4px_4px_0_0_#1c1714] mb-2 shrink-0 gap-3 md:gap-2">
        
        <div className="w-full md:w-auto flex justify-between items-center gap-4">
          <div className="text-[#c85a17] font-black uppercase tracking-widest truncate max-w-[200px] md:max-w-none text-xs md:text-sm">
            {comic.titleClean || comic.titleOriginal}
          </div>
          
          <button onClick={onClose} className="md:hidden bg-[#5c4a3d] text-[#e6d5c3] px-3 py-1.5 font-bold hover:bg-[#c85a17] hover:text-[#1c1714] transition-colors flex items-center gap-2 border-2 border-[#1c1714] active:scale-95 text-xs">
            <FaTimes />
          </button>
        </div>
        
        <div className="w-full md:w-auto flex flex-wrap justify-center md:justify-end items-center gap-2 md:gap-4">
          <button onClick={toggleFav} className="text-xl p-2 hover:scale-110 transition-transform">
            {isFav ? <FaHeart className="text-[#c85a17]" /> : <FaRegHeart className="text-[#d4b595]" />}
          </button>

          <button 
            onClick={toggleReadMode} 
            className="bg-[#1c1714] text-[#d4b595] px-3 py-1.5 border border-[#5c4a3d] text-xs font-bold uppercase hover:border-[#c85a17] transition-colors flex items-center gap-2"
          >
            {readMode === 'cascade' ? <FaScroll className="text-[#c85a17]" /> : <FaBookOpen className="text-[#c85a17]" />}
            {readMode === 'cascade' ? 'CASCADA' : 'PAGINADO'}
          </button>

          <button 
            onClick={() => setIsTwoPage(!isTwoPage)} 
            className="bg-[#1c1714] text-[#d4b595] px-3 py-1.5 border border-[#5c4a3d] text-xs font-bold uppercase hover:border-[#c85a17] transition-colors flex items-center gap-2"
          >
            <FaBookOpen />
            {isTwoPage ? '2 PÁG' : '1 PÁG'}
          </button>

          <div className="flex items-center gap-1 text-[#d4b595] font-bold text-xs bg-[#1c1714] px-1 py-1 border border-[#5c4a3d]">
            <button onClick={handleZoomOut} className="p-1 hover:text-[#c85a17]"><FaSearchMinus /></button>
            <span className="w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn} className="p-1 hover:text-[#c85a17]"><FaSearchPlus /></button>
          </div>

          <ShareButton 
            urlToShare={`${window.location.origin}${window.location.pathname}?comicId=${comic.id}`}
            className="hidden md:flex px-4 py-1.5 h-8 border border-transparent hover:border-[#1c1714] bg-[#29221c]"
          />

          <button onClick={onClose} className="hidden md:flex bg-[#5c4a3d] text-[#e6d5c3] px-4 py-1.5 h-8 font-bold hover:bg-[#c85a17] hover:text-[#1c1714] transition-colors items-center gap-2 border-2 border-transparent hover:border-[#1c1714] active:scale-95">
            <FaTimes /> CERRAR
          </button>
        </div>
      </div>

      {/* ── ÁREA DE LECTURA (CANVAS) ── */}
      <div 
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeaveOrUp}
        onMouseUp={onMouseLeaveOrUp}
        onMouseMove={onMouseMove}
        className="flex-1 bg-[#1c1714] border-2 border-[#5c4a3d] overflow-auto cursor-grab active:cursor-grabbing relative shadow-inner"
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#d4b595] bg-[#1c1714] z-10 pointer-events-none gap-4">
            <FaSpinner className="animate-spin text-4xl text-[#c85a17]" />
            <p className="font-mono text-xs font-bold uppercase tracking-widest">DECODIFICANDO ARCHIVO...</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#e63946] bg-[#1c1714] p-8 text-center z-10 pointer-events-none">
            <FaExclamationTriangle className="text-5xl mb-4" />
            <h3 className="font-black text-xl mb-2 uppercase tracking-widest">FALLO CRÍTICO</h3>
            <p className="font-mono text-[10px] max-w-md text-[#d4b595] border border-[#e63946] p-3">{error}</p>
          </div>
        )}
        
        {/* MODO PAGINADO TRADICIONAL */}
        {readMode === 'paginated' && !loading && !error && (
            <div className="inline-flex gap-2 justify-center align-middle pointer-events-none min-h-full min-w-full p-4 md:p-8">
                <canvas ref={canvas1Ref} className="shadow-[4px_4px_0_0_#0f0c0a] md:shadow-[8px_8px_0_0_#0f0c0a] bg-[#e8d5b7]"></canvas>
                <canvas ref={canvas2Ref} className="shadow-[4px_4px_0_0_#0f0c0a] md:shadow-[8px_8px_0_0_#0f0c0a] bg-[#e8d5b7] hidden"></canvas>
            </div>
        )}

        {/* MODO CASCADA DINÁMICO */}
        {readMode === 'cascade' && !loading && !error && (
            <div className="flex flex-wrap justify-center align-middle pointer-events-none min-h-full min-w-full p-4 md:p-8 pb-[80vh]">
                {renderCascadePages()}
            </div>
        )}

      </div>

      {/* ── CONTROLES INFERIORES DE PÁGINA (SOLO MODO PAGINADO) ── */}
      {readMode === 'paginated' && !loading && !error && totalPages > 0 && (
        <div className="bg-[#29221c] border-2 border-[#5c4a3d] p-2 mt-2 flex justify-between items-center shrink-0">
          <button 
            onClick={handlePrev} 
            disabled={currentPage === 1} 
            className="text-[#c85a17] bg-[#1c1714] p-3 border-2 border-[#5c4a3d] hover:bg-[#c85a17] hover:text-[#1c1714] hover:border-[#1c1714] disabled:opacity-30 disabled:hover:bg-[#1c1714] disabled:hover:text-[#c85a17] disabled:hover:border-[#5c4a3d] transition-all active:scale-95"
          >
            <FaArrowLeft size={16} />
          </button>
          
          <div className="text-[#d4b595] font-mono font-bold text-[10px] md:text-xs tracking-widest text-center px-4">
            PÁGINA <span className="text-[#c85a17] text-sm md:text-lg mx-1">{isTwoPage && currentPage < totalPages ? `${currentPage}-${currentPage + 1}` : currentPage}</span> DE {totalPages}
          </div>
          
          <button 
            onClick={handleNext} 
            disabled={currentPage >= totalPages || (isTwoPage && currentPage === totalPages - 1)} 
            className="text-[#c85a17] bg-[#1c1714] p-3 border-2 border-[#5c4a3d] hover:bg-[#c85a17] hover:text-[#1c1714] hover:border-[#1c1714] disabled:opacity-30 disabled:hover:bg-[#1c1714] disabled:hover:text-[#c85a17] disabled:hover:border-[#5c4a3d] transition-all active:scale-95"
          >
            <FaArrowRight size={16} />
          </button>
        </div>
      )}

      {/* ── INDICADOR FLOTANTE DE PÁGINA (SOLO MODO CASCADA) ── */}
      {readMode === 'cascade' && !loading && !error && totalPages > 0 && (
          <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 bg-[#1c1714]/90 border-2 border-[#c85a17] px-4 py-2 pointer-events-none shadow-[4px_4px_0_0_#0f0c0a]">
              <div className="text-[#d4b595] font-mono font-bold text-[10px] md:text-xs tracking-widest text-center">
                 PÁGINA <span className="text-[#c85a17] text-lg mx-1">{currentPage}</span> DE {totalPages}
              </div>
          </div>
      )}
    </div>
  );
}