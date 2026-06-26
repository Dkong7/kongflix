import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '../services/pb';

export default function KongflixTv() {
  const [channels, setChannels] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadChannels() {
      try {
        const records = await pb.collection('tv_channels').getFullList();
        // Agregamos canales manuales si la DB está vacía para probar el layout
        if (records.length === 0) {
            setChannels([
                { id: 'technical', name: 'Técnico / IT', color: '#D96F26', icon: 'fa-microchip' },
                { id: 'history', name: 'Historia', color: '#1C1714', icon: 'fa-landmark' },
                { id: 'family', name: 'Familiar', color: '#D4B595', icon: 'fa-people-roof' },
                { id: 'pop', name: 'Cultura Pop', color: '#D96F26', icon: 'fa-bolt' },
                { id: 'music', name: 'Música', color: '#1C1714', icon: 'fa-music' },
                { id: 'news', name: 'Noticias', color: '#D4B595', icon: 'fa-newspaper' }
            ]);
        } else {
            setChannels(records);
        }
      } catch (e) {
        console.log(e);
      }
    }
    loadChannels();
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center pt-20 pb-10" style={{ background: 'var(--bg-main)' }}>
      <h1 className="text-4xl font-bold mb-10 text-center" style={{ color: 'var(--text-main)', fontFamily: 'Orbitron, sans-serif' }}>KONGFLIX TV</h1>
      <p className="text-center mb-12 max-w-2xl text-lg" style={{ color: 'var(--text-muted)' }}>
        Selecciona un canal para sintonizar. La inteligencia artificial escoge la programación de la base de memoria.
      </p>

      {/* HONEYCOMB GRID */}
      <div className="honeycomb-grid flex justify-center flex-wrap gap-4 max-w-4xl px-4">
        {channels.map((ch, idx) => (
          <div 
            key={ch.id} 
            className="hexagon-container relative cursor-pointer group transition-transform hover:scale-105"
            onClick={() => navigate(`/tv/channel/${ch.id}`)}
            style={{ 
                width: '180px', 
                height: '200px', 
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                background: ch.color || 'var(--accent-orange)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '-10px', // Acercar para efecto panal
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
            }}
          >
            <i className={`fa-solid ${ch.icon || 'fa-tv'} text-5xl mb-3`} style={{ color: ch.color === '#D4B595' ? '#1C1714' : '#E5D3B3' }}></i>
            <span className="font-bold text-center px-4 leading-tight text-xl" style={{ color: ch.color === '#D4B595' ? '#1C1714' : '#E5D3B3' }}>{ch.name}</span>
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
