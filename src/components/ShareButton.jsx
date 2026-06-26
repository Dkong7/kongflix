import { useState } from 'react';
import { FaLink, FaCheck } from 'react-icons/fa';

export default function ShareButton({ urlToShare, className = "" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    if (e) e.stopPropagation();
    
    // Generar la URL actual si no se pasa explícitamente
    const targetUrl = urlToShare || window.location.href;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(targetUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      // Fallback para navegadores sin clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = targetUrl;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('No se pudo copiar', err);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <button 
      onClick={handleCopy}
      title="Compartir enlace"
      className={`flex items-center justify-center gap-2 bg-[#1c1714] text-[#c85a17] border-2 border-[#5c4a3d] px-3 py-1.5 hover:bg-[#c85a17] hover:text-white hover:border-[#1c1714] transition-colors font-mono text-[9px] font-bold tracking-widest uppercase cursor-pointer ${className}`}
    >
      {copied ? <FaCheck size={10} /> : <FaLink size={10} />}
      {copied ? '¡COPIADO!' : 'COMPARTIR'}
    </button>
  );
}
