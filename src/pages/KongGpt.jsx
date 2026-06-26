import { useState } from 'react';
import { BrainCircuit, Send, Loader2 } from 'lucide-react';

export default function KongGpt() {
  const [messages, setMessages] = useState([
    { id: 1, type: 'ai', text: '¡Hola! Soy KongGPT. Estoy conectado a la base de datos de Kongflix. Puedes preguntarme sobre películas, series, documentales o los módulos de los cursos que estamos agregando. ¿En qué te puedo ayudar hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: userMsg }]);
    setLoading(true);

    // Simulate AI response for now
    // TODO: Connect to backend or local AI endpoint with PocketBase context
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        type: 'ai', 
        text: 'Todavía estoy en fase de entrenamiento, pero pronto podré procesar los metadatos de PocketBase (lms_records) para responder tus consultas exactas sobre los cursos y catálogos.' 
      }]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col bg-[#1c1714] border-2 border-[#5c4a3d] mt-4 shadow-[4px_4px_0_0_#000]">
      {/* Header */}
      <div className="bg-[#c85a17] p-4 flex items-center gap-3 border-b-2 border-[#1c1714]">
        <BrainCircuit size={28} className="text-[#1c1714] animate-pulse" />
        <div>
          <h1 className="font-chakra font-black text-xl text-[#1c1714] m-0 leading-none">KONG GPT</h1>
          <p className="font-mono text-[10px] text-[#1c1714]/80 m-0 font-bold tracking-widest uppercase">Asistente de Inteligencia Artificial</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#050505] custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 border-2 ${
              msg.type === 'user' 
                ? 'bg-[#2a231f] border-[#d4b595] text-[#e6d5c3] rounded-tl-xl rounded-bl-xl rounded-tr-xl' 
                : 'bg-[#1c1714] border-[#c85a17] text-[#d4b595] rounded-tr-xl rounded-br-xl rounded-tl-xl shadow-[2px_2px_0_0_#5c4a3d]'
            }`}>
              <p className="m-0 font-chakra text-sm md:text-base leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#1c1714] border-2 border-[#c85a17] p-3 rounded-tr-xl rounded-br-xl rounded-tl-xl flex items-center gap-2">
              <Loader2 size={16} className="text-[#c85a17] animate-spin" />
              <span className="font-mono text-xs text-[#d4b595]">Procesando metadatos...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 bg-[#1c1714] border-t-2 border-[#5c4a3d] flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta sobre cursos, series o películas..."
          className="flex-1 bg-[#050505] border-2 border-[#5c4a3d] text-[#e6d5c3] font-chakra px-4 py-3 focus:outline-none focus:border-[#c85a17] placeholder-[#5c4a3d] transition-colors"
          disabled={loading}
        />
        <button 
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-[#c85a17] text-[#1c1714] px-6 flex items-center justify-center border-2 border-[#c85a17] hover:bg-[#d4b595] hover:border-[#d4b595] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
