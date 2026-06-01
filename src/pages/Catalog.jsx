import { useEffect, useState, useMemo } from 'react';
import { pb } from '../services/pb';
import MediaCard from '../components/MediaCard';
import MediaModal from '../components/MediaModal';
import SeriesModal from '../components/SeriesModal';
import { FaSortAmountDown, FaTerminal, FaSearch, FaFilter } from 'react-icons/fa';

export default function Catalog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sortType, setSortType] = useState('year-desc');
  
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedSeries, setSelectedSeries] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Escaneo Multi-Colección para evitar el error de "0 records"
        const collections = ['movies', 'series', 'documentaries', 'comedia']; //
        let allRecords = [];

        for (const col of collections) {
          try {
            const records = await pb.collection(col).getFullList({ requestKey: null });
            // Inyectamos el tipo manualmente para la lógica de agrupación posterior
            const standardized = records.map(r => ({ ...r, type: col === 'series' ? 'series' : 'movie' }));
            allRecords = [...allRecords, ...standardized];
          } catch (e) {
            console.warn(`NERV_SYNC_SKIP: Colección '${col}' no accesible.`);
          }
        }
        setItems(allRecords);
      } catch (error) {
        console.error("NERV_DATABASE_SYNC_ERROR:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const processedItems = useMemo(() => {
    const groups = items.reduce((acc, item) => {
      if (item.type === 'series') {
        // Agrupación NERV: Limpia nombres como "S01E01" o "Capitulo 1"
        const baseName = item.name.replace(/\s+(capitulo|s\d+e\d+).*/i, '').trim();
        if (!acc[baseName]) {
          acc[baseName] = { 
            ...item, 
            isGroup: true, 
            episodes: [], 
            displayName: baseName 
          };
        }
        acc[baseName].episodes.push(item);
      } else {
        acc[item.id] = { ...item, isGroup: false, displayName: item.name };
      }
      return acc;
    }, {});

    let list = Object.values(groups);

    if (categoryFilter !== "ALL") {
      list = list.filter(i => i.category === categoryFilter);
    }

    if (searchTerm) {
      list = list.filter(i => 
        i.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.tmdbTitle && i.tmdbTitle.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Ordenamiento por metadatos
    if (sortType === 'alpha-asc') list.sort((a, b) => a.displayName.localeCompare(b.displayName));
    if (sortType === 'alpha-desc') list.sort((a, b) => b.displayName.localeCompare(a.displayName));
    if (sortType === 'year-desc') list.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
    if (sortType === 'year-asc') list.sort((a, b) => (Number(a.year) || 0) - (Number(b.year) || 0));

    return list;
  }, [items, searchTerm, categoryFilter, sortType]);

  const handleItemClick = (item) => {
    if (item.isGroup) {
      setSelectedSeries({ name: item.displayName, episodes: item.episodes });
    } else {
      setSelectedMedia(item);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-eva-dark">
      <div className="text-eva-green font-black animate-pulse uppercase tracking-[0.4em]">
        SYNCHRONIZING_WITH_MAGI_SYSTEM...
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 pt-24 bg-eva-dark min-h-screen">
      {selectedMedia && <MediaModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />}
      {selectedSeries && (
        <SeriesModal 
          seriesName={selectedSeries.name} 
          episodes={selectedSeries.episodes} 
          onClose={() => setSelectedSeries(null)} 
        />
      )}

      <div className="mb-10 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-eva-orange pl-4">
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
            <FaTerminal className="inline mr-2 text-eva-green" /> Master_Catalog.os
          </h1>
          <div className="text-[10px] font-mono text-eva-purple font-bold">
            TOTAL_RECORDS_INDEXED: {processedItems.length} // STATUS: ACTIVE
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-eva-gray/50 p-4 border border-eva-purple shadow-brutal-purple">
          <div className="relative flex items-center bg-eva-dark border border-eva-green">
            <FaSearch className="ml-3 text-eva-green" />
            <input 
              type="text" 
              placeholder="SEARCH_ENTITY..."
              className="w-full p-2 bg-transparent text-white font-bold uppercase text-xs focus:outline-none placeholder:text-eva-green/30"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center bg-eva-dark border border-eva-purple px-3">
            <FaFilter className="text-eva-orange mr-2" />
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-transparent text-eva-green font-bold uppercase text-xs p-2 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All_Categories</option>
              <option value="Anime">Anime</option>
              <option value="Series">Series</option>
              <option value="Comedia">Comedia</option>
              <option value="Documental">Documentales</option>
              <option value="Películas">Películas</option>
            </select>
          </div>

          <div className="flex items-center bg-eva-dark border border-eva-purple px-3">
            <FaSortAmountDown className="text-eva-orange mr-2" />
            <select 
              value={sortType}
              onChange={(e) => setSortType(e.target.value)}
              className="w-full bg-transparent text-eva-green font-bold uppercase text-xs p-2 focus:outline-none cursor-pointer"
            >
              <option value="year-desc">Year: Newest</option>
              <option value="year-asc">Year: Oldest</option>
              <option value="alpha-asc">Name: A-Z</option>
              <option value="alpha-desc">Name: Z-A</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {processedItems.map(item => (
          <MediaCard 
            key={item.isGroup ? `group-${item.displayName}` : item.id} 
            media={{ ...item, name: item.displayName }} 
            onClick={() => handleItemClick(item)} 
          />
        ))}
      </div>

      {processedItems.length === 0 && (
        <div className="p-20 text-center border-2 border-dashed border-eva-orange text-eva-orange font-bold uppercase">
          NO_DATA_MATCHES_CURRENT_CRITERIA
        </div>
      )}
    </div>
  );
}