import { useState } from 'react';
import JSZip from 'jszip';
import { FaFileArchive, FaImages, FaSpinner, FaDownload } from 'react-icons/fa';

export default function Compiler() {
  const [images, setImages] = useState([]);
  const [comicName, setComicName] = useState('Nuevo_Comic_NERV');
  const [isCompiling, setIsCompiling] = useState(false);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    // Filtrar solo imágenes
    const validImages = files.filter(f => f.type.startsWith('image/'));
    setImages(validImages);
  };

  const compileToCBZ = async () => {
    if (images.length === 0) return;
    setIsCompiling(true);

    try {
      const zip = new JSZip();
      
      // Añadir cada imagen al ZIP
      images.forEach((file, index) => {
        // Formatear el nombre para mantener el orden (ej. 001.jpg, 002.jpg)
        const paddedIndex = String(index + 1).padStart(3, '0');
        const extension = file.name.split('.').pop();
        const fileName = `${paddedIndex}.${extension}`;
        zip.file(fileName, file);
      });

      // Generar el archivo binario final
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Crear enlace de descarga y forzar el clic
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${comicName}.cbz`; // Extensión CBZ obligatoria
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("ERROR EN COMPILACIÓN:", error);
      alert("Fallo crítico al compilar el CBZ.");
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="p-8 pt-24 bg-eva-dark min-h-screen flex flex-col items-center justify-center font-chakra">
      <div className="bg-eva-gray border-2 border-eva-purple max-w-2xl w-full p-8 shadow-[8px_8px_0_0_var(--eva-green)]">
        
        <h1 className="text-3xl font-black text-eva-green uppercase mb-6 flex items-center gap-3 border-b-2 border-eva-purple pb-4">
          <FaFileArchive /> NERV CBZ Compiler
        </h1>

        <div className="space-y-6">
          {/* Nombre del Cómic */}
          <div>
            <label className="block text-eva-orange font-bold uppercase text-xs mb-2">Nombre del Archivo (Sin extensión)</label>
            <input 
              type="text" 
              value={comicName}
              onChange={(e) => setComicName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_'))}
              className="w-full bg-black border border-eva-green p-3 text-white focus:outline-none focus:shadow-[0_0_10px_var(--eva-green)] font-mono"
            />
          </div>

          {/* Subida de Imágenes */}
          <div className="border-2 border-dashed border-eva-purple p-8 text-center bg-black relative">
            <input 
              type="file" 
              multiple 
              accept="image/*"
              onChange={handleImageUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <FaImages className="text-4xl text-eva-purple mx-auto mb-4" />
            <p className="text-white font-bold uppercase">Arrastra las imágenes del cómic aquí</p>
            <p className="text-gray-500 text-xs mt-2 font-mono">Selecciona todas las páginas en orden. Formatos: JPG, PNG, WEBP.</p>
            
            {images.length > 0 && (
              <div className="mt-4 text-eva-green font-bold bg-eva-dark p-2 border border-eva-green inline-block">
                {images.length} PÁGINAS CARGADAS
              </div>
            )}
          </div>

          {/* Botón de Compilación */}
          <button 
            onClick={compileToCBZ}
            disabled={images.length === 0 || isCompiling}
            className="w-full bg-eva-purple text-white font-black uppercase tracking-widest p-4 hover:bg-eva-green hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3 border-2 border-black"
          >
            {isCompiling ? (
              <><FaSpinner className="animate-spin" /> COMPILANDO ESTRUCTURA ZIP...</>
            ) : (
              <><FaDownload /> DESCARGAR .CBZ</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}