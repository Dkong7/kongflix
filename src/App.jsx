import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { pb } from './services/pb';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import Movies from './pages/Movies';
import Series from './pages/Series';
import Catalog from './pages/Catalog';
import Documentaries from './pages/Documentaries';
import ComedyPage from './pages/ComedyPage';
import Courses from './pages/Courses';
import Music from './pages/Music';
import Comics from './pages/Comics';
import Games from './pages/Games';
import Concerts from './pages/Concerts';
import KongflixTv from './pages/KongflixTv';
import TvPlayer from './pages/TvPlayer';

import Libros from './pages/Libros';
import Recursos from './pages/Recursos';
import MainHub from './pages/MainHub';
import KongGpt from './pages/KongGpt';

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (pb.authStore.isValid) {
      setUser(pb.authStore.model);
    }
    setAuthChecked(true);

    const unsub = pb.authStore.onChange((token, model) => {
      setUser(model || null);
    });

    return () => unsub();
  }, []);

  const handleLogin = (model) => setUser(model);
  const handleLogout = () => {
    pb.authStore.clear();
    setUser(null);
  };

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: '#1c1714', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#c85a17', letterSpacing: '0.3em' }} className="animate-pulse">
          VERIFICANDO CREDENCIALES...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Home onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#050505] text-white font-chakra">
        <Navbar user={user} onLogout={handleLogout} />

        <main className="pt-20 pb-8">
          <Routes>
            <Route path="/" element={<MainHub />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/series" element={<Series />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/konggpt" element={<KongGpt />} />
            <Route path="/documentaries" element={<Documentaries />} />
            <Route path="/comedy" element={<ComedyPage />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/music" element={<Music />} />
            <Route path="/comics" element={<Comics />} />
            <Route path="/libros" element={<Libros />} />
            <Route path="/games" element={<Games />} />
            <Route path="/recursos" element={<Recursos />} />
            <Route path="/concerts" element={<Concerts />} />
            <Route path="/tv" element={<KongflixTv />} />
            <Route path="/tv/channel/:channelId" element={<TvPlayer />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
