import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { pb } from '../services/pb';
import { useViewNav } from '../hooks/useViewNav';
import {
  Play, Pause, SkipForward, SkipBack, Heart, Disc3, Music2,
  List, Folder, ArrowLeft, Search, Plus, Volume2, VolumeX,
  Volume1, Shuffle, Repeat, Repeat1, Clock, ChevronRight,
  MoreHorizontal, X, Check, Radio, Mic2, Library, Headphones,
  PlusSquare, Trash2, ListMusic, PlayCircle, GripVertical,
  Zap, ChevronDown, LayoutGrid, AlignJustify, Flame
} from 'lucide-react';

/* ─── PALETA KONGFLIX ─────────────────────────────────────── */
const C = {
  cream:    '#f0e6d3',
  panel:    '#e8d5b7',
  dark:     '#1c1714',
  brown:    '#5c4a3d',
  orange:   '#c85a17',
  gold:     '#cfaa70',
  sand:     '#d4b595',
  muted:    '#adb5bd',
  green:    '#6a994e',
};

const DRIVE_API_KEY = "AIzaSyAYHAuZb_neKRSlejQ5qd9RRY3C4FgxAE0";

function driveThumb(id, sz = 'w300') {
  if (!id) return null;
  return `https://drive.google.com/thumbnail?id=${id}&sz=${sz}`;
}
function driveStream(id) {
  return `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${DRIVE_API_KEY}`;
}

/* ─── UTILIDADES ─────────────────────────────────────────── */
function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function CoverArt({ coverId, title, size = 'full', className = '' }) {
  const [err, setErr] = useState(false);
  const src = !err && coverId ? driveThumb(coverId) : null;
  if (src) return (
    <img src={src} alt={title}
         className={className}
         style={{ width: size === 'full' ? '100%' : size, height: size === 'full' ? '100%' : size, objectFit: 'cover' }}
         onError={() => setErr(true)} />
  );
  const hue = (title?.charCodeAt(0) || 0) % 360;
  return (
    <div className={className}
         style={{ width: size === 'full' ? '100%' : size, height: size === 'full' ? '100%' : size,
                  background: `hsl(${hue},40%,30%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Music2 size={size === 'full' ? 28 : 14} color={C.sand} strokeWidth={1} />
    </div>
  );
}

/* ─── MAIN ────────────────────────────────────────────────── */
export default function Music() {
  /* ── NAVEGACIÓN SINCRONIZADA CON URL ── */
  const { params: _nav, set: navTo } = useViewNav({ tab: 'discos', view: 'categories' });
  const tab      = _nav.tab || 'discos';
  const view     = _nav.view || 'categories';
  const selCat   = _nav.cat || null;
  const selAlbum = _nav.album || null;

  const [allRecords, setAllRecords]   = useState([]);
  const [tracks, setTracks]           = useState([]);
  const [loading, setLoading]         = useState(true);

  /* Player */
  const [current, setCurrent]   = useState(null);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume]     = useState(0.85);
  const [muted, setMuted]       = useState(false);
  const [shuffle, setShuffle]   = useState(false);
  const [repeat, setRepeat]     = useState('off');
  const [playbackErr, setPlaybackErr] = useState(false);

  /* Queue / next */
  const [queue, setQueue]           = useState([]);
  const [history, setHistory]       = useState([]);
  const [showQueue, setShowQueue]   = useState(false);
  const [showVol, setShowVol]       = useState(false);

  /* Favoritos */
  const [favs, setFavs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kf_music_favs') || '[]'); } catch { return []; }
  });

  /* Playlists */
  const [playlists, setPlaylists] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kf_playlists') || '[]'); } catch { return []; }
  });
  const [selPlaylist, setSelPlaylist]     = useState(null);
  const [showNewPL, setShowNewPL]         = useState(false);
  const [newPLName, setNewPLName]         = useState('');
  const [selectedTracks, setSelectedTracks] = useState(new Set());
  const [addToPLMode, setAddToPLMode]     = useState(false);

  /* Búsqueda global */
  const [searchQ, setSearchQ]         = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  /* Context menu */
  const [ctx, setCtx] = useState(null);

  /* UI */
  const [gridView, setGridView]   = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const audioRef  = useRef(new Audio());
  const progRef   = useRef(null);
  const curRef    = useRef(null);
  const tracksRef = useRef([]);
  const queueRef  = useRef([]);

  /* ── LOAD ── */
  useEffect(() => {
    pb.collection('music_records').getFullList({
      fields: 'id,title,artist,category,album,coverId,section,driveId,trackNum,folderDriveId',
      requestKey: null,
    }).then(res => { setAllRecords(res); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  /* ── AUDIO EVENTS ── */
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const onTime  = () => setProgress(audio.currentTime);
    const onMeta  = () => setDuration(audio.duration || 0);
    const onEnd   = () => handleAutoNext();
    const onErr   = () => { setPlaybackErr(true); setPlaying(false); };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onErr);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onErr);
      audio.pause();
    };
  }, []);

  useEffect(() => { audioRef.current.volume = muted ? 0 : volume; }, [volume, muted]);

  /* ── DATA TREE ── */
  const dataTree = useMemo(() => {
    const tree = {};
    allRecords.forEach(r => {
      const sec = (r.section || 'Discos Completos').trim();
      if (!r.category || !r.album) return;
      if (!tree[sec]) tree[sec] = {};
      if (!tree[sec][r.category]) tree[sec][r.category] = {};
      if (!tree[sec][r.category][r.album]) {
        tree[sec][r.category][r.album] = { coverId: r.coverId, count: 0 };
      }
      tree[sec][r.category][r.album].count++;
    });
    return tree;
  }, [allRecords]);

  const sectionKey = tab === 'discos' ? 'Discos Completos' : 'Ritmos';
  const sectionData = dataTree[sectionKey] || {};

  /* ── SEARCH ── */
  const suggestions = useMemo(() => {
    if (!searchQ || searchQ.length < 2) return [];
    const q = searchQ.toLowerCase();
    return allRecords.filter(r =>
      r.title?.toLowerCase().includes(q) ||
      r.artist?.toLowerCase().includes(q) ||
      r.album?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQ, allRecords]);

  useEffect(() => {
    if (searchQ.length >= 2) {
      setSearchResults(suggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [suggestions]);

  const runSearch = () => {
    if (!searchQ.trim()) return;
    setShowSuggestions(false);
    navTo({ view: 'search' });
  };

  /* ── PLAYER CONTROLS ── */
  const playTrack = useCallback((track, list = tracksRef.current, addHist = true) => {
    setPlaybackErr(false);
    if (addHist && curRef.current) {
      setHistory(h => [...h.slice(-49), curRef.current]);
    }
    setCurrent(track);
    curRef.current = track;
    if (list && list !== tracksRef.current) {
      tracksRef.current = list;
      setTracks(list);
    }
    const audio = audioRef.current;
    audio.pause();
    audio.src = driveStream(track.driveId);
    audio.load();
    audio.play().then(() => setPlaying(true)).catch(() => { setPlaybackErr(true); setPlaying(false); });
  }, []);

  const togglePlay = () => {
    if (!curRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaybackErr(true)); }
  };

  const handleAutoNext = () => {
    if (queueRef.current.length > 0) {
      const [next, ...rest] = queueRef.current;
      queueRef.current = rest;
      setQueue(rest);
      playTrack(next, tracksRef.current);
      return;
    }
    if (repeat === 'one') { audioRef.current.currentTime = 0; audioRef.current.play(); return; }
    const list = tracksRef.current;
    if (!list.length) return;
    let idx = list.findIndex(t => t.id === curRef.current?.id);
    if (shuffle) { idx = Math.floor(Math.random() * list.length); }
    else { idx = idx + 1; }
    if (idx >= list.length) {
      if (repeat === 'all') idx = 0;
      else return;
    }
    playTrack(list[idx], list);
  };

  const handleNext = () => {
    if (queueRef.current.length > 0) {
      const [next, ...rest] = queueRef.current;
      queueRef.current = rest;
      setQueue(rest);
      playTrack(next);
      return;
    }
    const list = tracksRef.current;
    let idx = list.findIndex(t => t.id === curRef.current?.id);
    if (shuffle) idx = Math.floor(Math.random() * list.length);
    else idx = Math.min(idx + 1, list.length - 1);
    if (list[idx]) playTrack(list[idx], list);
  };

  const handlePrev = () => {
    if (audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      playTrack(prev, tracksRef.current, false);
      return;
    }
    const list = tracksRef.current;
    const idx = list.findIndex(t => t.id === curRef.current?.id);
    if (idx > 0) playTrack(list[idx - 1], list);
  };

  const seekTo = (e) => {
    if (!progRef.current || !duration) return;
    const rect = progRef.current.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
  };

  const shufflePlay = (list) => {
    if (!list.length) return;
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    tracksRef.current = shuffled;
    setTracks(shuffled);
    playTrack(shuffled[0], shuffled);
    setShuffle(true);
  };

  const addToQueue = (track) => {
    queueRef.current = [...queueRef.current, track];
    setQueue(q => [...q, track]);
    setCtx(null);
  };

  const playNext = (track) => {
    queueRef.current = [track, ...queueRef.current];
    setQueue(q => [track, ...q]);
    setCtx(null);
  };

  /* ── FAVORITOS ── */
  const isFav = (id) => favs.some(f => f.id === id);
  const toggleFav = (track) => {
    const next = isFav(track.id) ? favs.filter(f => f.id !== track.id) : [...favs, track];
    setFavs(next);
    localStorage.setItem('kf_music_favs', JSON.stringify(next));
    setCtx(null);
  };

  /* ── PLAYLISTS ── */
  const savePlaylists = (list) => {
    setPlaylists(list);
    localStorage.setItem('kf_playlists', JSON.stringify(list));
  };
  const createPlaylist = () => {
    if (!newPLName.trim()) return;
    const pl = { id: Date.now(), name: newPLName.trim(), trackIds: [] };
    savePlaylists([...playlists, pl]);
    setNewPLName('');
    setShowNewPL(false);
  };
  const addToPlaylist = (plId) => {
    const ids = [...selectedTracks];
    savePlaylists(playlists.map(p =>
      p.id === plId ? { ...p, trackIds: [...new Set([...p.trackIds, ...ids])] } : p
    ));
    setSelectedTracks(new Set());
    setAddToPLMode(false);
    setCtx(null);
  };
  const addOneToPlaylist = (plId, track) => {
    savePlaylists(playlists.map(p =>
      p.id === plId ? { ...p, trackIds: [...new Set([...p.trackIds, track.id])] } : p
    ));
    setCtx(null);
  };
  const deletePlaylist = (plId) => savePlaylists(playlists.filter(p => p.id !== plId));
  const getPlaylistTracks = (pl) => allRecords.filter(r => pl.trackIds.includes(r.id));

  const openPlaylist = (pl) => {
    setSelPlaylist(pl);
    const t = getPlaylistTracks(pl);
    setTracks(t);
    tracksRef.current = t;
    navTo({ tab: 'playlists', view: 'tracks', cat: null, album: null });
  };

  /* ── NAVIGATION ── */
  const openAlbum = async (albumName) => {
    navTo({ view: 'tracks', album: albumName });
    setLoading(true);
    try {
      const res = await pb.collection('music_records').getFullList({
        filter: `album="${albumName.replace(/"/g, '\\"')}" && category="${selCat?.replace(/"/g, '\\"')}"`,
        sort: 'trackNum,title', requestKey: null,
      });
      setTracks(res);
      tracksRef.current = res;
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const goBack = () => {
    setSelectedTracks(new Set());
    setAddToPLMode(false);
    window.history.back();
  };

  const openFavs = () => {
    navTo({ tab: 'favorites', view: 'tracks', cat: null, album: null });
    const t = favs;
    setTracks(t); tracksRef.current = t;
  };

  const toggleSelTrack = (id) => {
    setSelectedTracks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── FILTERED DATA ── */
  const filteredCats   = Object.keys(sectionData).filter(c => c.toLowerCase().includes(searchQ.toLowerCase()));
  const filteredAlbums = selCat && sectionData[selCat]
    ? Object.entries(sectionData[selCat]).filter(([n]) => n.toLowerCase().includes(searchQ.toLowerCase()))
    : [];
  const filteredTracks = tracks.filter(t =>
    t.title?.toLowerCase().includes(searchQ.toLowerCase()) ||
    t.artist?.toLowerCase().includes(searchQ.toLowerCase())
  );
  const searchAllTracks = allRecords.filter(r =>
    r.title?.toLowerCase().includes(searchQ.toLowerCase()) ||
    r.artist?.toLowerCase().includes(searchQ.toLowerCase()) ||
    r.album?.toLowerCase().includes(searchQ.toLowerCase())
  ).slice(0, 50);

  /* ── TITLE ── */
  const pageTitle =
    view === 'search' ? `"${searchQ}"` :
    view === 'albums' ? selCat :
    tab === 'favorites' ? 'Favoritos' :
    tab === 'playlists' && view === 'tracks' ? selPlaylist?.name :
    tab === 'playlists' ? 'Mis Playlists' :
    tab === 'discos' ? 'DISCOS' : 'RITMOS';

  /* ── RENDER TRACK ROW ── */
  const TrackRow = ({ track, idx, listRef }) => {
    const isActive = current?.id === track.id;
    const fav      = isFav(track.id);
    const sel      = selectedTracks.has(track.id);
    const artist   = (track.artist && track.artist !== 'Desconocido') ? track.artist : track.album;

    return (
      <div
        onContextMenu={e => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, track }); }}
        onClick={() => addToPLMode ? toggleSelTrack(track.id) : playTrack(track, listRef || tracks)}
        style={{
          display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 12,
          borderBottom: `1px solid ${C.sand}`,
          background: isActive ? C.orange : sel ? `${C.orange}22` : 'transparent',
          cursor: 'pointer', transition: 'background 0.1s',
          borderLeft: isActive ? `4px solid ${C.dark}` : '4px solid transparent',
        }}
        onMouseEnter={e => { if (!isActive && !sel) e.currentTarget.style.background = C.panel; }}
        onMouseLeave={e => { if (!isActive && !sel) e.currentTarget.style.background = 'transparent'; }}
      >
        {addToPLMode && (
          <div style={{ width: 20, height: 20, border: `2px solid ${C.brown}`,
                        background: sel ? C.orange : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {sel && <Check size={12} color="#fff" />}
          </div>
        )}
        <span style={{ width: 28, fontFamily: "'Space Mono',monospace", fontSize: 10,
                       color: isActive ? '#fff' : C.brown, textAlign: 'right', flexShrink: 0 }}>
          {isActive && playing ? <Flame size={12} color="#fff" style={{margin:'0 auto'}} /> :
           (track.trackNum > 0 ? track.trackNum : idx + 1)}
        </span>
        <div style={{ width: 40, height: 40, flexShrink: 0, overflow: 'hidden', border: `1px solid ${C.brown}` }}>
          <CoverArt coverId={track.coverId} title={track.title} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 12, fontWeight: 700,
                      textTransform: 'uppercase', color: isActive ? '#fff' : C.dark,
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', margin: 0 }}>
            {track.title}
          </p>
          <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 9,
                      color: isActive ? 'rgba(255,255,255,0.75)' : C.brown,
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', margin: 0 }}>
            {artist}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); toggleFav(track); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: fav ? '#e63946' : C.brown }}>
            <Heart size={14} fill={fav ? '#e63946' : 'none'} />
          </button>
          <button onClick={e => { e.stopPropagation(); setCtx({ x: e.clientX, y: e.clientY, track }); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.brown }}>
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
    );
  };

  /* ════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', background: C.cream,
                  fontFamily: "'Chakra Petch',sans-serif", position: 'relative', overflow: 'hidden' }}>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
             style={{ position: 'fixed', inset: 0, background: 'rgba(28,23,20,0.5)', zIndex: 30 }} />
      )}

      {/* ══ SIDEBAR ══ */}
      <div style={{
        width: 220, flexShrink: 0,
        background: C.dark, borderRight: `3px solid ${C.orange}`,
        display: 'flex', flexDirection: 'column', zIndex: 31,
        position: 'relative',
        ...(typeof window !== 'undefined' && window.innerWidth < 768 ? {
          position: 'fixed', top: 0, left: 0, height: '100%',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s',
        } : {}),
      }}>
        <div style={{ padding: '20px 16px 14px', borderBottom: `2px solid ${C.orange}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Headphones size={18} color={C.orange} />
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700,
                           color: C.orange, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              KONGFLIX · AUDIO
            </span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { id: 'discos',    label: 'Discos',     Icon: Disc3 },
            { id: 'ritmos',    label: 'Ritmos',     Icon: Radio },
            { id: 'favorites', label: 'Favoritos',  Icon: Heart, action: openFavs },
            { id: 'playlists', label: 'Playlists',  Icon: ListMusic },
          ].map(item => (
            <button key={item.id}
              onClick={() => {
                setSidebarOpen(false);
                if (item.action) { item.action(); return; }
                navTo({ tab: item.id, view: 'categories', cat: null, album: null });
                setSearchQ('');
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', border: 'none', borderRadius: 0,
                background: tab === item.id ? C.orange : 'transparent',
                color: tab === item.id ? '#fff' : C.sand,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                borderLeft: tab === item.id ? `3px solid #fff` : '3px solid transparent',
                fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}
              onMouseEnter={e => { if (tab !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if (tab !== item.id) e.currentTarget.style.background = 'transparent'; }}>
              <item.Icon size={14} />
              {item.label}
            </button>
          ))}

          <div style={{ height: 1, background: C.brown, margin: '8px 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px 6px' }}>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.brown,
                           letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              MIS LISTAS
            </span>
            <button onClick={() => setShowNewPL(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.orange, padding: 0 }}>
              <Plus size={12} />
            </button>
          </div>

          {playlists.map(pl => (
            <button key={pl.id} onClick={() => openPlaylist(pl)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
                color: selPlaylist?.id === pl.id ? C.gold : C.sand,
                fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: '0.05em',
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: '100%',
              }}>
              <ListMusic size={11} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{pl.name}</span>
            </button>
          ))}

          {playlists.length === 0 && (
            <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.brown,
                        padding: '4px 12px', letterSpacing: '0.08em' }}>
              Sin playlists...
            </p>
          )}
        </nav>
      </div>

      {/* ══ MAIN AREA ══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* ── TOPBAR ── */}
        <div style={{
          background: C.dark, borderBottom: `3px solid ${C.orange}`,
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
                  style={{ display: 'none', background: 'none', border: 'none', color: C.gold, cursor: 'pointer' }}
                  className="mobile-menu-btn">
            <AlignJustify size={18} />
          </button>

          {(view !== 'categories' || tab === 'favorites' || tab === 'playlists') && (
            <button onClick={goBack}
                    style={{ background: 'none', border: `2px solid ${C.brown}`, padding: '5px 10px',
                             cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                             color: C.sand, fontFamily: "'Space Mono',monospace", fontSize: 9,
                             fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                             transition: 'all 0.12s', flexShrink: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.orange; e.currentTarget.style.color = C.orange; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.brown; e.currentTarget.style.color = C.sand; }}>
              <ArrowLeft size={12} />
              <span style={{ display: 'none' }} className="btn-text">VOLVER</span>
            </button>
          )}

          <h2 style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 'clamp(1rem,3vw,1.8rem)',
                       fontWeight: 900, color: C.cream, textTransform: 'uppercase',
                       letterSpacing: '-0.02em', margin: 0, flex: 1, minWidth: 0,
                       overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                       textShadow: `2px 2px 0 ${C.orange}` }}>
            {pageTitle}
          </h2>

          {view === 'tracks' && tracks.length > 0 && (
            <button onClick={() => shufflePlay(tracks)}
                    style={{ background: C.orange, border: `2px solid ${C.dark}`,
                             boxShadow: `2px 2px 0 ${C.dark}`,
                             padding: '6px 12px', cursor: 'pointer',
                             display: 'flex', alignItems: 'center', gap: 6,
                             color: '#fff', fontFamily: "'Space Mono',monospace", fontSize: 9,
                             fontWeight: 700, letterSpacing: '0.1em', flexShrink: 0,
                    }}>
              <Shuffle size={12} /> <span style={{ display: 'none' }} className="btn-text">ALEATORIA</span>
            </button>
          )}

          {view === 'tracks' && tracks.length > 0 && playlists.length > 0 && (
            <button onClick={() => setAddToPLMode(!addToPLMode)}
                    style={{ background: addToPLMode ? C.gold : 'transparent',
                             border: `2px solid ${C.gold}`,
                             padding: '6px 10px', cursor: 'pointer',
                             display: 'flex', alignItems: 'center', gap: 6,
                             color: addToPLMode ? C.dark : C.gold,
                             fontFamily: "'Space Mono',monospace", fontSize: 9,
                             fontWeight: 700, letterSpacing: '0.1em', flexShrink: 0,
                    }}>
              <PlusSquare size={12} />
            </button>
          )}

          {addToPLMode && selectedTracks.size > 0 && (
            <div style={{ position: 'relative' }}>
              <button style={{ background: C.orange, border: `2px solid ${C.dark}`,
                               boxShadow: `2px 2px 0 ${C.dark}`,
                               padding: '6px 12px', cursor: 'pointer',
                               color: '#fff', fontFamily: "'Space Mono',monospace", fontSize: 9,
                               fontWeight: 700, letterSpacing: '0.1em', flexShrink: 0,
                               display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                <Plus size={12} /> {selectedTracks.size}
              </button>
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4,
                            background: C.dark, border: `2px solid ${C.orange}`,
                            boxShadow: `4px 4px 0 ${C.dark}`, zIndex: 50, minWidth: 160 }}>
                {playlists.map(pl => (
                  <button key={pl.id} onClick={() => addToPlaylist(pl.id)}
                          style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                                   cursor: 'pointer', textAlign: 'left', color: C.sand,
                                   fontFamily: "'Space Mono',monospace", fontSize: 9,
                                   borderBottom: `1px solid ${C.brown}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ListMusic size={10} /> {pl.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(view === 'categories' || view === 'albums') && (
            <button onClick={() => setGridView(!gridView)}
                    style={{ background: 'none', border: `2px solid ${C.brown}`, padding: '5px 8px',
                             cursor: 'pointer', color: C.sand }}>
              {gridView ? <AlignJustify size={14} /> : <LayoutGrid size={14} />}
            </button>
          )}
        </div>

        {/* ── SEARCH BAR ── */}
        <div style={{ background: C.panel, borderBottom: `2px solid ${C.sand}`,
                      padding: '10px 20px', flexShrink: 0 }}>
          <div style={{ position: 'relative', maxWidth: 480 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                             color: C.brown, pointerEvents: 'none' }} size={13} />
            <input type="text"
                   placeholder={view === 'tracks' ? 'FILTRAR PISTAS...' : 'BUSCAR EN TODA LA LIBRERÍA...'}
                   value={searchQ}
                   onChange={e => setSearchQ(e.target.value)}
                   onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}
                   style={{
                     width: '100%', background: C.cream, border: `2px solid ${C.brown}`,
                     padding: '8px 36px 8px 34px',
                     fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700,
                     color: C.dark, letterSpacing: '0.1em', textTransform: 'uppercase',
                     outline: 'none', boxSizing: 'border-box',
                   }}
                   onFocus={e => { e.target.style.borderColor = C.orange; setShowSuggestions(true); }}
                   onBlur={e => { e.target.style.borderColor = C.brown; setTimeout(() => setShowSuggestions(false), 200); }}
            />
            {searchQ && (
              <button onClick={() => { setSearchQ(''); setShowSuggestions(false); }}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                               background: 'none', border: 'none', color: C.orange, cursor: 'pointer', padding: 0 }}>
                <X size={12} />
              </button>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 2,
                            background: C.dark, border: `2px solid ${C.orange}`,
                            boxShadow: `4px 4px 0 ${C.dark}`, zIndex: 100 }}>
                {suggestions.map(track => (
                  <button key={track.id} onClick={() => { playTrack(track, [track]); setSearchQ(''); setShowSuggestions(false); }}
                          style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none',
                                   cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                                   borderBottom: `1px solid ${C.brown}`, textAlign: 'left',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = C.orange + '33'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <div style={{ width: 30, height: 30, flexShrink: 0, overflow: 'hidden', border: `1px solid ${C.brown}` }}>
                      <CoverArt coverId={track.coverId} title={track.title} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 11, fontWeight: 700,
                                  color: C.cream, textTransform: 'uppercase', margin: 0,
                                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {track.title}
                      </p>
                      <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.gold, margin: 0 }}>
                        {track.artist || track.album}
                      </p>
                    </div>
                    <Play size={12} color={C.orange} style={{ marginLeft: 'auto', flexShrink: 0 }} />
                  </button>
                ))}
                <button onClick={runSearch}
                        style={{ width: '100%', padding: '8px 14px', background: `${C.orange}22`,
                                 border: 'none', cursor: 'pointer', color: C.orange,
                                 fontFamily: "'Space Mono',monospace", fontSize: 9, fontWeight: 700,
                                 letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>
                  VER TODOS LOS RESULTADOS
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 140px' }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 40,
                          fontFamily: "'Space Mono',monospace", fontSize: 11, color: C.brown,
                          letterSpacing: '0.2em' }}>
              <Music2 size={20} color={C.orange} style={{ animation: 'spin 1s linear infinite' }} />
              CARGANDO LIBRERÍA...
            </div>
          )}

          {/* CATEGORÍAS */}
          {view === 'categories' && tab !== 'favorites' && tab !== 'playlists' && !loading && (
            <div style={{ display: 'grid',
                          gridTemplateColumns: gridView ? 'repeat(auto-fill,minmax(180px,1fr))' : '1fr',
                          gap: gridView ? 16 : 4 }}>
              {filteredCats.map(cat => (
                <div key={cat} onClick={() => navTo({ view: 'albums', cat })}
                     style={{ cursor: 'pointer', border: `2px solid ${C.brown}`,
                       background: C.panel, boxShadow: `3px 3px 0 ${C.dark}`,
                       display: 'flex', alignItems: 'center', gap: 12, padding: 14, transition: 'all 0.12s',
                     }}
                     onMouseEnter={e => { e.currentTarget.style.boxShadow = `3px 3px 0 ${C.orange}`; e.currentTarget.style.borderColor = C.orange; }}
                     onMouseLeave={e => { e.currentTarget.style.boxShadow = `3px 3px 0 ${C.dark}`; e.currentTarget.style.borderColor = C.brown; }}>
                  <div style={{ width: 44, height: 44, background: C.dark, border: `2px solid ${C.orange}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Folder size={20} color={C.orange} />
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: C.dark, margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 120 }}>{cat}</p>
                    <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.orange, margin: '2px 0 0', letterSpacing: '0.1em' }}>{Object.keys(sectionData[cat] || {}).length} ÁLBUMES</p>
                  </div>
                  <ChevronRight size={14} color={C.brown} style={{ marginLeft: 'auto' }} />
                </div>
              ))}
              {filteredCats.length === 0 && <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: C.brown, gridColumn: '1/-1' }}>SIN RESULTADOS</p>}
            </div>
          )}

          {/* PLAYLISTS VIEW */}
          {tab === 'playlists' && view === 'categories' && !loading && (
            <div>
              <button onClick={() => setShowNewPL(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.orange, border: `2px solid ${C.dark}`, boxShadow: `3px 3px 0 ${C.dark}`, padding: '10px 20px', cursor: 'pointer', marginBottom: 20, fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                <Plus size={14} /> NUEVA PLAYLIST
              </button>
              {playlists.length === 0 && <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: "'Space Mono',monospace", fontSize: 10, color: C.brown }}>NO HAY PLAYLISTS AÚN</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
                {playlists.map(pl => {
                  const pTracks = getPlaylistTracks(pl);
                  const cover = pTracks.find(t => t.coverId)?.coverId;
                  return (
                    <div key={pl.id} style={{ border: `2px solid ${C.brown}`, background: C.panel, boxShadow: `3px 3px 0 ${C.dark}`, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.12s' }}
                         onMouseEnter={e => { e.currentTarget.style.boxShadow = `3px 3px 0 ${C.orange}`; e.currentTarget.style.borderColor = C.orange; }}
                         onMouseLeave={e => { e.currentTarget.style.boxShadow = `3px 3px 0 ${C.dark}`; e.currentTarget.style.borderColor = C.brown; }}>
                      <div onClick={() => openPlaylist(pl)} style={{ aspectRatio: '1', background: C.dark, overflow: 'hidden', position: 'relative' }}>
                        <CoverArt coverId={cover} title={pl.name} />
                        <div style={{ position: 'absolute', bottom: 8, right: 8, background: `${C.dark}cc`, padding: '2px 8px', fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.sand }}>{pTracks.length} PISTAS</div>
                      </div>
                      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div onClick={() => openPlaylist(pl)} style={{ flex: 1 }}>
                          <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: C.dark, margin: 0 }}>{pl.name}</p>
                        </div>
                        <button onClick={() => deletePlaylist(pl.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.brown, padding: 4 }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ÁLBUMES */}
          {view === 'albums' && !loading && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <button onClick={async () => {
                  const all = [];
                  for (const [name] of filteredAlbums) {
                    const res = await pb.collection('music_records').getFullList({ filter: `album="${name.replace(/"/g,'\\"')}" && category="${selCat?.replace(/"/g,'\\"')}"`, sort: 'trackNum,title', requestKey: null });
                    all.push(...res);
                  }
                  if (all.length) { tracksRef.current = all; setTracks(all); playTrack(all[0], all); }
                }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.orange, border: `2px solid ${C.dark}`, boxShadow: `2px 2px 0 ${C.dark}`, padding: '8px 16px', cursor: 'pointer', color: '#fff', fontFamily: "'Space Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em' }}>
                  <PlayCircle size={14} /> REPRODUCIR TODO
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: gridView ? 'repeat(auto-fill,minmax(150px,1fr))' : '1fr', gap: gridView ? 14 : 2 }}>
                {filteredAlbums.map(([albumName, data]) => (
                  <div key={albumName} onClick={() => openAlbum(albumName)} style={{ cursor: 'pointer', border: `2px solid ${C.brown}`, background: C.panel, boxShadow: `3px 3px 0 ${C.dark}`, overflow: 'hidden', transition: 'all 0.12s', display: gridView ? 'flex' : 'flex', flexDirection: gridView ? 'column' : 'row', alignItems: gridView ? 'stretch' : 'center' }}
                       onMouseEnter={e => { e.currentTarget.style.boxShadow = `3px 3px 0 ${C.orange}`; e.currentTarget.style.borderColor = C.orange; }}
                       onMouseLeave={e => { e.currentTarget.style.boxShadow = `3px 3px 0 ${C.dark}`; e.currentTarget.style.borderColor = C.brown; }}>
                    <div style={{ ...(gridView ? { aspectRatio: '1' } : { width: 56, height: 56, flexShrink: 0 }), background: C.dark, overflow: 'hidden', borderRight: !gridView ? `2px solid ${C.brown}` : 'none' }}>
                      <CoverArt coverId={data.coverId} title={albumName} />
                    </div>
                    <div style={{ padding: gridView ? '10px 10px 12px' : '0 12px', flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.dark, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{albumName}</p>
                      <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.orange, margin: '3px 0 0', letterSpacing: '0.08em' }}>{data.count} PISTAS</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TRACKS */}
          {view === 'tracks' && !loading && (
            <div>
              {selAlbum && tab !== 'favorites' && tab !== 'playlists' && (
                <div style={{ display: 'flex', gap: 20, marginBottom: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ width: 120, height: 120, flexShrink: 0, border: `3px solid ${C.dark}`, boxShadow: `4px 4px 0 ${C.orange}`, overflow: 'hidden' }}>
                    <CoverArt coverId={tracks.find(t=>t.coverId)?.coverId} title={selAlbum} />
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.orange, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 4px' }}>{selCat}</p>
                    <h3 style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 'clamp(1rem,3vw,1.6rem)', fontWeight: 900, textTransform: 'uppercase', color: C.dark, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{selAlbum}</h3>
                    <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.brown, margin: 0 }}>{tracks.length} PISTAS</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={() => tracks.length && playTrack(tracks[0], tracks)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.orange, border: `2px solid ${C.dark}`, boxShadow: `2px 2px 0 ${C.dark}`, padding: '8px 16px', cursor: 'pointer', color: '#fff', fontFamily: "'Space Mono',monospace", fontSize: 9, fontWeight: 700 }}>
                        <Play size={12} fill="currentColor" /> PLAY
                      </button>
                      <button onClick={() => shufflePlay(tracks)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: `2px solid ${C.brown}`, padding: '8px 16px', cursor: 'pointer', color: C.brown, fontFamily: "'Space Mono',monospace", fontSize: 9, fontWeight: 700 }}>
                        <Shuffle size={12} /> ALEATORIA
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div style={{ border: `2px solid ${C.brown}`, overflow: 'hidden', boxShadow: `4px 4px 0 ${C.dark}` }}>
                {filteredTracks.length === 0 ? (
                  <p style={{ padding: 30, fontFamily: "'Space Mono',monospace", fontSize: 10, color: C.brown, textAlign: 'center' }}>SIN PISTAS</p>
                ) : filteredTracks.map((track, idx) => (
                  <TrackRow key={track.id} track={track} idx={idx} />
                ))}
              </div>
            </div>
          )}

          {/* SEARCH RESULTS */}
          {view === 'search' && (
            <div>
              <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.brown, letterSpacing: '0.15em', marginBottom: 12, textTransform: 'uppercase' }}>
                {searchAllTracks.length} RESULTADOS PARA "{searchQ}"
              </p>
              <div style={{ border: `2px solid ${C.brown}`, overflow: 'hidden', boxShadow: `4px 4px 0 ${C.dark}` }}>
                {searchAllTracks.map((track, idx) => (
                  <TrackRow key={track.id} track={track} idx={idx} listRef={searchAllTracks} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ QUEUE DRAWER ══ */}
      <div style={{ position: 'fixed', top: 0, right: 0, height: 'calc(100vh - 100px)', width: 280, background: C.dark, borderLeft: `3px solid ${C.orange}`, zIndex: 40, display: 'flex', flexDirection: 'column', transform: showQueue ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
        <div style={{ padding: '16px', borderBottom: `2px solid ${C.orange}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ListMusic size={14} color={C.orange} />
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700, color: C.cream, letterSpacing: '0.15em', textTransform: 'uppercase' }}>COLA · {queue.length}</span>
          </div>
          <button onClick={() => setShowQueue(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sand }}><X size={16} /></button>
        </div>
        {current && (
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.brown}`, background: `${C.orange}22` }}>
            <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: C.orange, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 4px' }}>REPRODUCIENDO</p>
            <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 11, fontWeight: 700, color: C.cream, textTransform: 'uppercase', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{current.title}</p>
          </div>
        )}
        {queue.length > 0 && (
          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.brown}` }}>
            <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>PRÓXIMAS</p>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {queue.map((t, i) => (
            <div key={i} onClick={() => { const rest = queue.filter((_, idx) => idx !== i); queueRef.current = rest; setQueue(rest); playTrack(t); }}
                 style={{ padding: '10px 14px', borderBottom: `1px solid ${C.brown}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                 onMouseEnter={e => e.currentTarget.style.background = `${C.orange}22`}
                 onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.brown, width: 16 }}>{i+1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 10, fontWeight: 700, color: C.sand, textTransform: 'uppercase', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.title}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); const r = queue.filter((_,j)=>j!==i); queueRef.current=r; setQueue(r); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.brown }}><X size={10} /></button>
            </div>
          ))}
          {queue.length === 0 && <p style={{ padding: 20, fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.brown, textAlign: 'center', letterSpacing: '0.1em' }}>LA COLA ESTÁ VACÍA</p>}
        </div>
        {tracksRef.current.length > 0 && current && (
          <div style={{ borderTop: `2px solid ${C.brown}` }}>
            <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.brown}` }}>
              <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: C.muted, letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>SIGUIENTE DEL ÁLBUM</p>
            </div>
            {(() => {
              const idx = tracksRef.current.findIndex(t => t.id === current?.id);
              return tracksRef.current.slice(idx + 1, idx + 4).map((t, i) => (
                <div key={t.id} onClick={() => playTrack(t)}
                     style={{ padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.brown}` }}
                     onMouseEnter={e => e.currentTarget.style.background = `${C.orange}22`}
                     onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: C.brown }}>{idx + i + 2}</span>
                  <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', margin: 0, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.title}</p>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* ══ CONTEXT MENU ══ */}
      {ctx && (
        <>
          <div onClick={() => setCtx(null)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div style={{ position: 'fixed', top: ctx.y, left: ctx.x, zIndex: 100, background: C.dark, border: `2px solid ${C.orange}`, boxShadow: `4px 4px 0 ${C.dark}`, minWidth: 190 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.brown}`, background: `${C.orange}22` }}>
              <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 10, fontWeight: 700, color: C.cream, textTransform: 'uppercase', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{ctx.track.title}</p>
            </div>
            {[
              { label: 'Reproducir ahora', Icon: Play, action: () => { playTrack(ctx.track); setCtx(null); } },
              { label: 'Reproducir después', Icon: Zap, action: () => playNext(ctx.track) },
              { label: 'Añadir a la cola', Icon: Plus, action: () => addToQueue(ctx.track) },
              { label: isFav(ctx.track.id) ? 'Quitar de favs' : 'A favoritos', Icon: Heart, action: () => toggleFav(ctx.track) },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                      style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.brown}`, color: C.sand, fontFamily: "'Space Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.orange; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = C.sand; }}>
                <item.Icon size={12} /> {item.label}
              </button>
            ))}
            {playlists.length > 0 && (
              <>
                <div style={{ padding: '6px 12px', borderBottom: `1px solid ${C.brown}` }}>
                  <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: C.brown, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>AÑADIR A PLAYLIST</p>
                </div>
                {playlists.map(pl => (
                  <button key={pl.id} onClick={() => addOneToPlaylist(pl.id, ctx.track)}
                          style={{ width: '100%', padding: '8px 14px 8px 24px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${C.brown}40`, color: C.sand, fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: '0.06em' }}
                          onMouseEnter={e => e.currentTarget.style.background = `${C.orange}33`}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <ListMusic size={10} /> {pl.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {/* ══ NEW PLAYLIST MODAL ══ */}
      {showNewPL && (
        <>
          <div onClick={() => setShowNewPL(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(28,23,20,0.7)', zIndex: 200 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, background: C.dark, border: `3px solid ${C.orange}`, boxShadow: `6px 6px 0 ${C.orange}`, padding: 28, width: 320 }}>
            <h3 style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', color: C.cream, margin: '0 0 16px', letterSpacing: '-0.02em' }}>NUEVA PLAYLIST</h3>
            <input type="text" placeholder="NOMBRE DE LA PLAYLIST..." value={newPLName} onChange={e => setNewPLName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createPlaylist()} autoFocus
                   style={{ width: '100%', background: C.cream, border: `2px solid ${C.brown}`, padding: '10px 14px', fontFamily: "'Space Mono',monospace", fontSize: 11, fontWeight: 700, color: C.dark, textTransform: 'uppercase', letterSpacing: '0.1em', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
                   onFocus={e => e.target.style.borderColor = C.orange} onBlur={e => e.target.style.borderColor = C.brown} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={createPlaylist} style={{ flex: 1, padding: '10px', background: C.orange, border: `2px solid ${C.dark}`, boxShadow: `3px 3px 0 ${C.dark}`, cursor: 'pointer', color: '#fff', fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>CREAR</button>
              <button onClick={() => setShowNewPL(false)} style={{ padding: '10px 16px', background: 'transparent', border: `2px solid ${C.brown}`, cursor: 'pointer', color: C.sand, fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700 }}>X</button>
            </div>
          </div>
        </>
      )}

      {/* ══ PLAYER GLOBAL ══ */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: C.dark, borderTop: `3px solid ${C.orange}`, boxShadow: `0 -3px 0 ${C.brown}`, zIndex: 50, height: 'auto' }}>
        <div ref={progRef} onClick={seekTo} style={{ width: '100%', height: 4, background: C.brown, cursor: 'pointer', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: duration ? `${(progress / duration) * 100}%` : '0%', background: C.orange, transition: 'width 0.1s' }} />
          <div style={{ position: 'absolute', top: -3, height: 10, width: 10, borderRadius: '50%', background: C.orange, border: `2px solid ${C.dark}`, left: duration ? `calc(${(progress / duration) * 100}% - 5px)` : 0, transition: 'left 0.1s' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 12 }}>
          <div style={{ flex: '0 0 auto', width: '25%', minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, flexShrink: 0, border: `2px solid ${C.brown}`, overflow: 'hidden' }}>
              {current ? <CoverArt coverId={current.coverId} title={current.title} /> : <div style={{ width: '100%', height: '100%', background: C.brown, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music2 size={16} color={C.sand} strokeWidth={1} /></div>}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: current ? C.cream : C.brown, margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{playbackErr ? '⚠ ' : ''}{current?.title || 'STANDBY'}</p>
              <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.gold, margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{current ? ((current.artist && current.artist !== 'Desconocido') ? current.artist : current.album) : '—'}</p>
            </div>
            <button onClick={() => current && toggleFav(current)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: current && isFav(current.id) ? '#e63946' : C.brown, flexShrink: 0 }}>
              <Heart size={14} fill={current && isFav(current.id) ? '#e63946' : 'none'} />
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => setShuffle(!shuffle)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: shuffle ? C.orange : C.brown, transition: 'color 0.12s' }}><Shuffle size={15} /></button>
              <button onClick={handlePrev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sand }} onMouseEnter={e => e.currentTarget.style.color = C.cream} onMouseLeave={e => e.currentTarget.style.color = C.sand}><SkipBack size={20} /></button>
              <button onClick={togglePlay} style={{ width: 48, height: 48, borderRadius: '50%', background: C.orange, border: `2px solid ${C.dark}`, boxShadow: `0 0 0 2px ${C.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.12s', color: '#fff' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
              </button>
              <button onClick={handleNext} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sand }} onMouseEnter={e => e.currentTarget.style.color = C.cream} onMouseLeave={e => e.currentTarget.style.color = C.sand}><SkipForward size={20} /></button>
              <button onClick={() => setRepeat(r => r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: repeat !== 'off' ? C.orange : C.brown }}>{repeat === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}</button>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.brown }}>{formatTime(progress)}</span>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.brown }}>/</span>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.brown }}>{formatTime(duration)}</span>
            </div>
          </div>
          <div style={{ flex: '0 0 auto', width: '25%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setMuted(!muted)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.brown }}>
                {muted || volume === 0 ? <VolumeX size={16} /> : volume < 0.5 ? <Volume1 size={16} /> : <Volume2 size={16} />}
              </button>
              <input type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume} onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false); }} style={{ width: 70, accentColor: C.orange, cursor: 'pointer' }} />
            </div>
            <button onClick={() => setShowQueue(!showQueue)} style={{ background: showQueue ? `${C.orange}33` : 'none', border: 'none', cursor: 'pointer', color: showQueue ? C.orange : C.brown, padding: '6px 8px', transition: 'all 0.12s' }}><ListMusic size={16} /></button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          .btn-text { display: none !important; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.dark}; }
        ::-webkit-scrollbar-thumb { background: ${C.brown}; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.orange}; }
      `}</style>
    </div>
  );
}
