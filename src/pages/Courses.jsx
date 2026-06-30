import { useState, useEffect, useMemo } from 'react';
import { pb } from '../services/pb';
import { useViewNav } from '../hooks/useViewNav';
import { useWatchProgress } from '../hooks/useWatchProgress';
import {
  Cpu, Palette, Video, Headphones, Briefcase, Camera, Gamepad2,
  Box, PenTool, TrendingUp, Shield, DollarSign, Binary,
  BookOpen, Music, Layers, ArrowLeft, Play, ChevronRight,
  Search, X, CheckCircle2, Clock, FolderOpen,
  GraduationCap, Star, BookMarked, Zap, Award, BarChart2,
  PlayCircle, ChevronDown, ChevronUp, MonitorPlay,
  Filter, SlidersHorizontal, CircleDot, Radio,
  Flame, Trophy, Lightbulb
} from 'lucide-react';

const SCHOOL_STYLES = [
  { keys: ['adobe'], Icon: Layers, color: '#c85a17' },
  { keys: ['animación', 'animacion', '3d'], Icon: Box, color: '#264653' },
  { keys: ['audio'], Icon: Headphones, color: '#2a9d8f' },
  { keys: ['audiovisual', 'video', 'cine'], Icon: Video, color: '#7c5cbf' },
  { keys: ['dj'], Icon: Music, color: '#b5838d' },
  { keys: ['diseño', 'diseno', 'graphic'], Icon: Palette, color: '#e63946' },
  { keys: ['economia', 'business', 'trading'], Icon: DollarSign, color: '#6a994e' },
  { keys: ['fotografía', 'fotografia', 'photo'], Icon: Camera, color: '#cfaa70' },
  { keys: ['game'], Icon: Gamepad2, color: '#e76f51' },
  { keys: ['marketing', 'mkt'], Icon: TrendingUp, color: '#80b918' },
  { keys: ['mates', 'math'], Icon: Binary, color: '#457b9d' },
  { keys: ['pentesting', 'hacker', 'security'], Icon: Shield, color: '#9b2226' },
  { keys: ['productividad', 'productivity'], Icon: Zap, color: '#cfaa70' },
  { keys: ['code', 'programacion', 'dev'], Icon: Cpu, color: '#219ebc' },
  { keys: ['dibujo', 'illus'], Icon: PenTool, color: '#a8dadc' },
  { keys: ['musica', 'música', 'music'], Icon: Music, color: '#b5838d' },
];
const FALLBACK_COLORS = ['#c85a17','#7c5cbf','#2a9d8f','#457b9d','#e76f51','#cfaa70','#e63946','#264653','#a8dadc','#6a994e'];

function getAcademyMeta(academyName = '', fallbackIdx = 0) {
  const lower = academyName.toLowerCase().trim();
  for (const style of SCHOOL_STYLES) {
    if (style.keys.some(k => lower.includes(k))) return { Icon: style.Icon, color: style.color };
  }
  return { Icon: BookOpen, color: FALLBACK_COLORS[fallbackIdx % FALLBACK_COLORS.length] };
}

function driveImg(id) {
  if (!id) return null;
  if (id.startsWith('http')) return id;
  if (/^[a-zA-Z0-9_\-]{25,60}$/.test(id.trim()))
    return `https://drive.google.com/thumbnail?id=${id.trim()}&sz=w600`;
  return null;
}

function SchoolCircle({ name, courseCount, meta, onClick }) {
  const { Icon, color } = meta;
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 cursor-pointer bg-transparent border-none p-1 group transition-transform hover:-translate-y-1">
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center relative transition-all" style={{ border: `2px solid ${color}77`, backgroundColor: `${color}15` }}>
        <Icon size={24} color={color} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
        <div className="absolute -top-1 -right-1 bg-[#5c4a3d] group-hover:bg-eva-orange text-white min-w-[20px] h-5 rounded-full px-1.5 font-mono text-[8px] font-bold flex items-center justify-center border-2 border-[#f0e6d3] transition-colors">{courseCount > 99 ? '99+' : courseCount}</div>
      </div>
      <span className="font-chakra text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-[#5c4a3d] group-hover:text-[#1c1714] text-center max-w-[80px] md:max-w-[90px] leading-tight break-words transition-colors">{name}</span>
    </button>
  );
}

function CourseCard({ course, onClick }) {
  const [imgErr, setImgErr] = useState(false);
  const src = !imgErr ? driveImg(course.coverId || course.poster) : null;
  const catMeta = getAcademyMeta(course.academy);
  return (
    <div onClick={onClick} className="cursor-pointer bg-[#e8d5b7] border-2 border-[#5c4a3d] hover:border-[#c85a17] shadow-[3px_3px_0_0_#1c1714] hover:shadow-[5px_5px_0_0_#c85a17] transition-all hover:-translate-y-1 flex flex-col overflow-hidden group h-full">
      <div className="relative aspect-[16/9] bg-[#1c1714] overflow-hidden flex-shrink-0">
        {src ? (<img src={src} alt={course.course_Name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={()=>setImgErr(true)} />) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{background:'linear-gradient(135deg,#1c1714,#2a2018)'}}>
            <catMeta.Icon size={28} color={catMeta.color} strokeWidth={1} />
            <span className="font-mono text-[7px] text-[#5c4a3d] tracking-widest">SIN PORTADA</span>
          </div>
        )}
        <div className="absolute inset-0 bg-[#c85a17]/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-[#c85a17] border-2 border-[#1c1714] shadow-[3px_3px_0_#1c1714] p-2.5 text-white"><Play size={16} fill="currentColor" /></div>
        </div>
        <div className="absolute bottom-1.5 left-1.5 bg-[#1c1714]/90 text-[#d4b595] font-mono text-[7px] font-bold px-2 py-1 flex items-center gap-1.5 border border-[#5c4a3d]">
          <PlayCircle size={8} color="#c85a17" /> {course.lessonCount} LECCIONES
        </div>
        <div className="absolute top-0 right-0 text-white font-mono text-[6px] font-bold px-2 py-0.5 max-w-[100px] truncate" style={{background: catMeta.color}}>{course.academy?.toUpperCase()}</div>
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <h3 className="font-chakra text-[10px] md:text-xs font-black uppercase tracking-wider text-[#1c1714] m-0 line-clamp-2 leading-tight group-hover:text-[#c85a17] transition-colors">{course.course_Name}</h3>
        {course.course_description && !course.course_description.startsWith('Curso de') && (
          <p className="font-chakra text-[9px] md:text-[10px] text-[#5c4a3d] m-0 leading-snug line-clamp-2">{course.course_description}</p>
        )}
        <div className="flex items-center gap-2 mt-auto pt-2">
          <span className="flex items-center gap-1 font-mono text-[8px] text-[#5c4a3d]"><BookMarked size={9} color="#c85a17" /> {course.lessonCount} lecciones</span>
          <span className="ml-auto flex items-center gap-1 font-mono text-[8px] text-[#c85a17] font-bold">VER CURSO <ChevronRight size={9} /></span>
        </div>
      </div>
    </div>
  );
}

function LMSPlayer({ course, lessons, onBack }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = lessons[activeIdx];
  const driveUrl = active ? `https://drive.google.com/file/d/${active.driveId}/preview` : null;
  const mediaId = lessons.length > 0 ? lessons[0].id : 'unknown';
  const { loadProgress, saveProgress, percent } = useWatchProgress('course', mediaId);
  const [watchedSet, setWatchedSet] = useState(new Set());

  useEffect(() => {
    loadProgress().then(rec => {
      if (rec && rec.progress) {
        setActiveIdx(Math.min(rec.progress, lessons.length - 1));
        const initialSet = new Set();
        for (let i = 0; i <= rec.progress; i++) initialSet.add(i);
        setWatchedSet(initialSet);
      }
    });
  }, [mediaId, loadProgress, lessons.length]);

  const markWatched = (idx) => {
    setWatchedSet(prev => {
      const next = new Set([...prev, idx]);
      saveProgress({ progress: Math.max(...Array.from(next)), total: lessons.length, title: course.course_Name, cover_id: course.coverId || course.poster || '' });
      return next;
    });
  };

  const goNext = () => { if (activeIdx < lessons.length - 1) setActiveIdx(i => i + 1); };
  const goPrev = () => { if (activeIdx > 0) setActiveIdx(i => i - 1); };

  const lessonName = active?.lesson_name || `Lección ${activeIdx + 1}`;
  const lessonDesc = active?.lesson_description || '';
  const episodeNum = active?.episode || activeIdx + 1;
  const progressPercent = lessons.length > 0 ? Math.round((watchedSet.size / lessons.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-0 animate-fade-in">
      <div className="flex items-center gap-2 md:gap-4 mb-4 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1.5 bg-transparent border-2 border-[#5c4a3d] px-3 py-1.5 cursor-pointer font-mono text-[9px] font-bold text-[#5c4a3d] tracking-widest uppercase hover:bg-[#1c1714] hover:text-[#d4b595] hover:border-[#1c1714] transition-all"><ArrowLeft size={10} /> VOLVER</button>
        <div className="flex items-center gap-1.5 md:gap-2 font-mono text-[8px] md:text-[9px] text-[#5c4a3d] flex-1 min-w-[150px] truncate">
          <GraduationCap size={10} color="#c85a17" className="shrink-0" /><span className="truncate">{course.academy?.toUpperCase()}</span><ChevronRight size={8} color="#d4b595" className="shrink-0" /><span className="text-[#1c1714] font-bold truncate">{course.course_Name?.toUpperCase()}</span>
        </div>
        <div className="flex gap-1 shrink-0 ml-auto">
          <button onClick={goPrev} disabled={activeIdx === 0} className="p-1.5 md:p-2 border-2 border-[#5c4a3d] bg-transparent disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#5c4a3d] hover:text-white transition-colors"><ChevronDown size={12} className="transform rotate-90" /></button>
          <button onClick={goNext} disabled={activeIdx === lessons.length - 1} className="p-1.5 md:p-2 border-2 border-[#5c4a3d] bg-transparent disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#5c4a3d] hover:text-white transition-colors"><ChevronUp size={12} className="transform rotate-90" /></button>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-0 border-[3px] border-[#1c1714] shadow-[4px_4px_0_0_#c85a17] md:shadow-[6px_6px_0_0_#c85a17] overflow-hidden min-h-[500px]">
        <div className="flex-[2] flex flex-col bg-[#e8d5b7] border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-[#5c4a3d] overflow-hidden">
          <div className="relative w-full aspect-[16/9] bg-[#1c1714] shrink-0">
            {driveUrl && <iframe src={driveUrl} className="absolute inset-0 w-full h-full border-none" allow="autoplay; fullscreen" allowFullScreen onLoad={() => markWatched(activeIdx)} />}
            <div className="absolute top-2 left-2 md:top-3 md:left-3 pointer-events-none"><div className="bg-[#1c1714]/90 border border-[#c85a17] text-[#c85a17] font-mono text-[7px] md:text-[8px] font-bold tracking-[0.2em] px-2 py-1 flex items-center gap-1.5"><Radio size={8} className="animate-pulse" /> EN VIVO</div></div>
            <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3 pointer-events-none"><div className="bg-[#1c1714]/90 text-[#d4b595] font-mono text-[7px] md:text-[8px] font-bold px-2 py-1 flex items-center gap-1.5 border border-[#5c4a3d]"><CircleDot size={8} color="#c85a17" />{String(activeIdx + 1).padStart(2, '0')} / {String(lessons.length).padStart(2, '0')}</div></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">
            <div className="border-l-4 border-[#c85a17] pl-3 md:pl-4">
              <div className="flex items-center gap-1.5 font-mono text-[8px] text-[#c85a17] tracking-[0.2em] mb-1.5"><PlayCircle size={9} /> EP. {String(episodeNum).padStart(2, '0')}</div>
              <h2 className="text-base md:text-xl lg:text-2xl font-black uppercase text-[#1c1714] m-0 leading-tight">{lessonName}</h2>
            </div>
            {lessonDesc && !lessonDesc.startsWith('Lección') && (<p className="text-xs md:text-[13px] leading-relaxed text-[#5c4a3d] border-l-2 border-[#d4b595] pl-3 italic m-0">{lessonDesc}</p>)}
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { icon: <CheckCircle2 size={12} color="#6a994e" />, value: watchedSet.size, label: 'Vistas' },
                { icon: <Clock size={12} color="#c85a17" />, value: lessons.length - watchedSet.size, label: 'Pendientes' },
                { icon: <Trophy size={12} color="#cfaa70" />, value: `${progressPercent}%`, label: 'Progreso' },
              ].map(s => (
                <div key={s.label} className="bg-[#d4b595] border border-[#5c4a3d] p-2 flex flex-col items-center gap-1">
                  {s.icon}<span className="font-chakra text-sm md:text-base font-black text-[#1c1714] leading-none">{s.value}</span><span className="font-mono text-[6px] md:text-[7px] text-[#5c4a3d] tracking-widest uppercase">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-auto pt-2">
              <button onClick={goPrev} disabled={activeIdx === 0} className="flex-1 p-2 border-2 border-[#5c4a3d] bg-transparent disabled:opacity-40 disabled:cursor-not-allowed font-mono text-[8px] md:text-[9px] font-bold text-[#1c1714] flex items-center justify-center gap-1.5 hover:bg-[#1c1714] hover:text-[#d4b595] transition-colors"><ArrowLeft size={10} /> ANTERIOR</button>
              <button onClick={goNext} disabled={activeIdx === lessons.length - 1} className="flex-1 p-2 bg-[#c85a17] border-2 border-[#1c1714] disabled:opacity-50 disabled:bg-[#d4b595] disabled:border-[#5c4a3d] disabled:cursor-not-allowed font-mono text-[8px] md:text-[9px] font-bold text-white flex items-center justify-center gap-1.5 shadow-[2px_2px_0_0_#1c1714] active:translate-y-px active:shadow-none transition-all">SIGUIENTE <ChevronRight size={10} /></button>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col bg-[#f0e6d3] w-full lg:max-w-[320px] lg:min-w-[250px] h-[350px] lg:h-auto">
          <div className="p-3 md:p-4 bg-[#1c1714] border-b-[3px] border-[#c85a17] flex items-center gap-2 shrink-0"><GraduationCap size={12} color="#c85a17" /><span className="font-mono text-[9px] md:text-[10px] font-bold text-[#d4b595] tracking-[0.15em] flex-1">PROGRAMA</span><span className="font-mono text-[8px] text-[#5c4a3d]">{lessons.length}</span></div>
          <div className="p-2.5 md:p-3 bg-[#e8d5b7] border-b-2 border-[#d4b595] shrink-0">
            <div className="flex justify-between items-center mb-1.5"><span className="font-mono text-[7px] text-[#5c4a3d] flex items-center gap-1"><BarChart2 size={8} color="#c85a17" /> PROGRESO</span><span className="font-mono text-[7px] text-[#c85a17] font-bold">{progressPercent}%</span></div>
            <div className="h-1 bg-[#d4b595] w-full relative overflow-hidden"><div className="absolute inset-y-0 left-0 bg-[#c85a17] transition-all duration-500" style={{ width: `${progressPercent}%` }} /></div>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 scrollbar-hide">
            {lessons.map((lesson, idx) => {
              const isActive = idx === activeIdx;
              const isDone = watchedSet.has(idx);
              const lname = lesson.lesson_name || `Lección ${idx + 1}`;
              return (
                <button key={lesson.id || idx} onClick={() => setActiveIdx(idx)} className={`w-full text-left p-2 md:p-2.5 flex items-center gap-2 cursor-pointer border-none border-l-4 mb-1 transition-all ${isActive ? 'border-[#c85a17] bg-[#e8d5b7] shadow-[2px_2px_0_0_#5c4a3d]' : isDone ? 'border-[#6a994e] bg-transparent' : 'border-transparent bg-transparent hover:bg-[#e8d5b7]'}`}>
                  <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full shrink-0 flex items-center justify-center border ${isActive ? 'bg-[#c85a17] border-[#1c1714]' : isDone ? 'bg-[#6a994e] border-transparent' : 'bg-[#d4b595] border-transparent'}`}>
                    {isActive ? <Play size={7} fill="#fff" color="#fff" className="ml-0.5" /> : isDone ? <CheckCircle2 size={10} color="#fff" /> : <span className="font-mono text-[7px] text-[#5c4a3d] font-bold">{String(idx + 1).padStart(2, '0')}</span>}
                  </div>
                  <div className="flex-1 min-w-0 pr-1"><span className={`font-chakra text-[9px] md:text-[10px] block truncate ${isActive ? 'font-bold text-[#1c1714]' : 'text-[#5c4a3d]'}`}>{lname}</span></div>
                  {isActive && <Flame size={9} color="#c85a17" className="shrink-0 animate-pulse" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Courses() {
  /* ── NAVEGACIÓN SINCRONIZADA CON URL ── */
  const { params: _nav, set: navTo } = useViewNav({ view: 'schools' });
  const view = _nav.view || 'schools';
  const _academyName = _nav.academy || null;
  const _courseName = _nav.course || null;

  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('alpha');

  useEffect(() => {
    pb.collection('lms_records').getFullList({ requestKey: null })
      .then(res => setAllRecords(res))
      .catch(e => { console.error('[LMS] Error:', e); setDbError(e.message); })
      .finally(() => setLoading(false));
  }, []);

  const academyMap = useMemo(() => {
    const map = {};
    allRecords.forEach(r => {
      const acadName = (r.academy || 'Sin categoría').trim();
      const courseName = (r.course_Name || 'Sin nombre').trim();
      if (!map[acadName]) map[acadName] = {};
      if (!map[acadName][courseName]) {
        map[acadName][courseName] = { course_Name: courseName, academy: acadName, coverId: r.coverId || r.poster, course_description: r.course_description, lessonCount: 0 };
      }
      map[acadName][courseName].lessonCount++;
    });
    return map;
  }, [allRecords]);

  const academyList = useMemo(() => {
    return Object.keys(academyMap).map((name, idx) => ({ name, courseCount: Object.keys(academyMap[name]).length, meta: getAcademyMeta(name, idx) })).sort((a, b) => a.name.localeCompare(b.name));
  }, [academyMap]);

  const selectedAcademy = _academyName ? academyList.find(a => a.name === _academyName) : null;

  const coursesInAcademy = useMemo(() => {
    if (!_academyName) return [];
    let list = Object.values(academyMap[_academyName] || {});
    if (search) list = list.filter(c => c.course_Name.toLowerCase().includes(search.toLowerCase()));
    if (sortBy === 'alpha') list = [...list].sort((a, b) => a.course_Name.localeCompare(b.course_Name));
    if (sortBy === 'lessons') list = [...list].sort((a, b) => b.lessonCount - a.lessonCount);
    return list;
  }, [academyMap, _academyName, search, sortBy]);

  const selectedCourse = _courseName ? coursesInAcademy.find(c => c.course_Name === _courseName) : null;

  const openAcademy = (acad) => { navTo({ view: 'courses', academy: acad.name }); setSearch(''); };

  const openCourse = (course) => {
    navTo({ view: 'player', course: course.course_Name });
    const recs = allRecords.filter(r => (r.course_Name || '').trim() === course.course_Name && (r.academy || '').trim() === course.academy).sort((a, b) => (a.order || a.episode || 0) - (b.order || b.episode || 0));
    setLessons(recs);
  };

  const goBack = () => { if (view === "player") navBack({ view: "courses", academy: _academyName }); else if (view === "courses") navBack({ view: "schools" }); else navBack({}); };

  const totalCourses = useMemo(() => Object.values(academyMap).reduce((a, s) => a + Object.keys(s).length, 0), [academyMap]);

  if (dbError) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1c1714] text-[#e63946] p-10 text-center font-chakra">
      <Shield size={64} className="mb-5" /><h2 className="text-2xl font-bold m-0">ACCESO DENEGADO (API RULES)</h2>
      <p className="font-mono text-xs max-w-[600px] leading-relaxed text-[#f0e6d3] mt-3">PocketBase está bloqueando la conexión.</p>
      <code className="bg-black p-3 mt-5 text-[#ff4d4d] border border-[#ff4d4d] text-xs">{dbError}</code>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0e6d3] gap-4">
      <GraduationCap size={48} color="#c85a17" className="animate-bounce" />
      <div className="font-mono text-[11px] text-[#1c1714] tracking-[0.25em] animate-pulse">CARGANDO ACADEMIA...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f0e6d3] bg-[url('/grid.png')] bg-repeat font-chakra pb-20">
      <div className="bg-[#1c1714] border-b-4 border-[#c85a17] px-6 py-10 md:p-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="h-1.5 w-24 bg-repeating-linear-gradient(45deg,#cfaa70,#cfaa70_10px,#1c1714_10px,#1c1714_20px) mb-6" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="flex items-center flex-wrap gap-1.5 md:gap-2 font-mono text-[8px] md:text-[9px] text-[#c85a17] tracking-[0.2em] font-bold uppercase mb-2">
                <GraduationCap size={12} className="shrink-0" /><span>KONGFLIX</span><ChevronRight size={9} color="#5c4a3d" className="shrink-0" /><span>ACADEMIA</span>
                {selectedAcademy && (<><ChevronRight size={9} color="#5c4a3d" className="shrink-0" /><span className="text-[#d4b595]">{selectedAcademy.name.toUpperCase()}</span></>)}
                {selectedCourse && (<><ChevronRight size={9} color="#5c4a3d" className="shrink-0" /><span className="text-[#cfaa70] max-w-[150px] md:max-w-[250px] truncate">{selectedCourse.course_Name?.toUpperCase()}</span></>)}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#f0e6d3] uppercase tracking-tighter leading-none m-0 drop-shadow-[3px_3px_0_#c85a17] md:drop-shadow-[4px_4px_0_#c85a17]">
                {view === 'schools' ? 'Academia' : view === 'courses' ? selectedAcademy?.name : selectedCourse?.course_Name}
              </h1>
              <div className="flex flex-wrap gap-3 md:gap-5 mt-4">
                {view === 'schools' && (<><SB icon={<BookOpen size={9} />} text={`${academyList.length} CATEGORÍAS`} /><SB icon={<PlayCircle size={9} />} text={`${totalCourses} CURSOS`} /><SB icon={<Zap size={9} />} text={`${allRecords.length.toLocaleString()} LECCIONES`} /></>)}
                {view === 'courses' && <SB icon={<BookMarked size={9} />} text={`${coursesInAcademy.length} CURSOS`} />}
                {view === 'player' && <SB icon={<PlayCircle size={9} />} text={`${lessons.length} LECCIONES`} />}
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
              {view !== 'schools' && (<button onClick={goBack} className="flex items-center justify-center w-full md:w-auto gap-2 bg-[#f0e6d3] border-2 border-[#f0e6d3] px-4 py-2.5 font-chakra text-[10px] font-black tracking-widest uppercase text-[#1c1714] hover:bg-[#c85a17] hover:text-white hover:border-[#c85a17] transition-colors"><ArrowLeft size={12} /> VOLVER</button>)}
              {view === 'courses' && (
                <div className="relative w-full md:w-[250px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c4a3d] pointer-events-none" size={12} />
                  <input type="text" placeholder="BUSCAR CURSO..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-[#f0e6d3] border-2 border-[#5c4a3d] focus:border-[#c85a17] pl-8 pr-8 py-2.5 font-mono text-[9px] font-bold text-[#1c1714] tracking-widest uppercase outline-none transition-colors" />
                  {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#c85a17] cursor-pointer p-1"><X size={10} /></button>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {view === 'courses' && (
        <div className="bg-[#e8d5b7] border-b-2 border-[#d4b595] overflow-x-auto scrollbar-hide">
          <div className="max-w-[1400px] mx-auto px-6 flex items-center min-w-max">
            <div className="flex items-center gap-1.5 font-mono text-[8px] text-[#5c4a3d] py-3 pr-3 border-r border-[#d4b595] mr-2"><SlidersHorizontal size={10} /> ORDENAR:</div>
            {[{ k: 'alpha', l: 'A → Z' }, { k: 'lessons', l: '+ LECCIONES' }].map(o => (
              <button key={o.k} onClick={() => setSortBy(o.k)} className={`px-4 py-3 border-none font-mono text-[8px] font-bold tracking-widest uppercase cursor-pointer transition-all border-b-[3px] ${sortBy === o.k ? 'border-b-[#c85a17] bg-[#c85a17] text-white' : 'border-b-transparent bg-transparent text-[#5c4a3d] hover:bg-[#d4b595]'}`}>{o.l}</button>
            ))}
            <div className="ml-auto font-mono text-[8px] text-[#5c4a3d] flex items-center gap-1.5 pl-4 border-l border-[#d4b595]"><Filter size={9} /> {coursesInAcademy.length} RESULTADOS</div>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 md:py-12">
        {view === 'schools' && (
          <div className="animate-fade-in">
            <div className="mb-8 md:mb-12 border-l-[5px] border-[#c85a17] pl-4 md:pl-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 font-mono text-[9px] text-[#c85a17] tracking-[0.2em] mb-1"><Lightbulb size={10} /> ELIGE TU RUTA</div>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-[#1c1714] m-0 leading-none">Especializaciones</h2>
              </div>
              <div className="font-mono text-[9px] text-[#5c4a3d] flex items-center gap-1.5 bg-[#e8d5b7] px-3 py-1.5 border border-[#5c4a3d] w-max"><Award size={10} color="#cfaa70" /> {academyList.length} ESCUELAS ACTIVAS</div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-x-4 gap-y-8 md:gap-y-12 mb-16">
              {academyList.map(acad => (<SchoolCircle key={acad.name} name={acad.name} courseCount={acad.courseCount} meta={acad.meta} onClick={() => openAcademy(acad)} />))}
            </div>
            <div className="border-t-2 border-[#d4b595] pt-8 md:pt-10">
              <div className="font-mono text-[9px] text-[#5c4a3d] tracking-[0.2em] mb-4 flex items-center gap-1.5"><BarChart2 size={10} color="#c85a17" /> REPORTE GLOBAL</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                  { icon: <BookOpen size={16} color="#c85a17" />, value: totalCourses, label: 'Cursos', sub: 'en biblioteca' },
                  { icon: <PlayCircle size={16} color="#c85a17" />, value: allRecords.length.toLocaleString(), label: 'Lecciones', sub: 'indexadas' },
                  { icon: <GraduationCap size={16} color="#c85a17" />, value: academyList.length, label: 'Categorías', sub: 'con contenido' },
                  { icon: <Star size={16} color="#cfaa70" />, value: '∞', label: 'Horas de', sub: 'contenido' },
                ].map(s => (
                  <div key={s.label} className="bg-[#e8d5b7] border-2 border-[#5c4a3d] shadow-[2px_2px_0_0_#1c1714] md:shadow-[3px_3px_0_0_#1c1714] p-3 md:p-5 flex items-center gap-3 md:gap-4">
                    <div className="hidden sm:block">{s.icon}</div>
                    <div><div className="font-chakra text-xl md:text-2xl font-black text-[#1c1714] leading-none">{s.value}</div><div className="font-mono text-[7px] md:text-[8px] text-[#5c4a3d] tracking-widest uppercase mt-1">{s.label}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'courses' && (
          <div className="animate-fade-in">
            {coursesInAcademy.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-[#d4b595] flex flex-col items-center gap-3"><FolderOpen size={36} color="#d4b595" /><div className="font-mono text-[10px] text-[#5c4a3d] tracking-[0.2em]">NO_COURSES_FOUND</div></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-5">
                {coursesInAcademy.map(course => (<CourseCard key={course.course_Name} course={course} onClick={() => openCourse(course)} />))}
              </div>
            )}
          </div>
        )}

        {view === 'player' && (
          <div className="animate-fade-in">
            {lessons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3"><MonitorPlay size={36} color="#c85a17" /><div className="font-mono text-[10px] text-[#1c1714] tracking-[0.2em]">SISTEMA SIN LECCIONES REGISTRADAS</div></div>
            ) : (
              <LMSPlayer course={selectedCourse} lessons={lessons} onBack={goBack} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SB({ icon, text }) {
  return (<span className="font-mono text-[8px] md:text-[9px] text-[#d4b595] tracking-[0.15em] flex items-center gap-1.5 shrink-0 bg-[#1c1714] border border-[#5c4a3d] px-2 py-1">{icon} {text}</span>);
}


