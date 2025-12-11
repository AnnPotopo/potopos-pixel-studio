import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Download, Save, FolderOpen, RefreshCw, ZoomIn, ZoomOut, Image as ImageIcon, Grid, Trash2, Layers, Minimize2, Maximize2, Move, X, CheckSquare, Square, Settings } from 'lucide-react';

const PixelForge = () => {
  const [activeTab, setActiveTab] = useState('scaler'); // 'scaler' or 'atlas'

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-purple-500 selection:text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-lg">
              <Grid size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              PixelForge Studio
            </h1>
          </div>
          
          <div className="flex bg-slate-700 rounded-lg p-1 gap-1">
            <button
              onClick={() => setActiveTab('scaler')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'scaler' 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'text-slate-300 hover:bg-slate-600'
              }`}
            >
              <ImageIcon size={16} className="inline mr-2" />
              Escalador / Pixelador
            </button>
            <button
              onClick={() => setActiveTab('atlas')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'atlas' 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Layers size={16} className="inline mr-2" />
              Atlas de Texturas
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {activeTab === 'scaler' ? <PixelScaler /> : <TextureAtlasGenerator />}
      </main>
      
      <footer className="text-center text-slate-500 text-sm py-8 border-t border-slate-800 mt-8">
        <p>Generado con Potopo´s Pixel Studio • Todo el procesamiento es local</p>
      </footer>
    </div>
  );
};

// ==========================================
// MÓDULO 1: ESCALADOR Y PIXELADOR
// ==========================================

const PixelScaler = () => {
  const [originalImage, setOriginalImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [mode, setMode] = useState('upscale'); // 'upscale' (agrandar) o 'downscale' (pixelar)
  
  // Upscale State
  const [scaleFactor, setScaleFactor] = useState(4);
  
  // Downscale State
  const [targetSize, setTargetSize] = useState(32); // e.g. 32px
  
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
  const [finalSize, setFinalSize] = useState({ w: 0, h: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const canvasRef = useRef(null);

  const processImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImageSize({ w: img.width, h: img.height });
        setOriginalImage(img);
        setPreviewUrl(img.src);
        // Si la imagen es grande, sugerimos modo downscale por defecto
        if (img.width > 128 || img.height > 128) {
            setMode('downscale');
        } else {
            setMode('upscale');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e) => processImage(e.target.files[0]);

  // Drag and Drop Handlers
  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processImage(e.dataTransfer.files[0]);
    }
  };

  // Calcular el tamaño final y dibujar en el canvas
  useEffect(() => {
    if (!originalImage || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    // CRÍTIC: Desactivar suavizado para pixel art
    ctx.imageSmoothingEnabled = false;
    canvasRef.current.style.imageRendering = 'pixelated';

    let newW, newH;

    if (mode === 'upscale') {
      // MODO 1: Agrandar (Nearest Neighbor)
      newW = originalImage.width * scaleFactor;
      newH = originalImage.height * scaleFactor;
    } else {
      // MODO 2: Pixelar (Downscale)
      // Calculamos la altura proporcional basada en el targetSize (que actúa como ancho)
      const aspectRatio = originalImage.height / originalImage.width;
      newW = targetSize;
      newH = Math.round(targetSize * aspectRatio);
    }

    // Actualizar estado del tamaño final
    setFinalSize({ w: newW, h: newH });

    // Configurar y dibujar en el canvas
    canvasRef.current.width = newW;
    canvasRef.current.height = newH;
    
    // Volver a asegurar que el contexto no suavice, por si acaso
    ctx.imageSmoothingEnabled = false;
    
    if (mode === 'upscale') {
        ctx.drawImage(originalImage, 0, 0, newW, newH);
    } else {
        // Dibujamos pequeño (esto elimina información y crea el pixel art)
        ctx.drawImage(originalImage, 0, 0, newW, newH);
    }

  }, [originalImage, scaleFactor, mode, targetSize]);

  const downloadImage = () => {
    if (!canvasRef.current) return;
    const filename = mode === 'upscale' 
        ? `pixelart_x${scaleFactor}.png` 
        : `pixelart_${finalSize.w}x${finalSize.h}.png`;
        
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="grid md:grid-cols-3 gap-6 animate-fade-in">
      {/* Sidebar de Controles */}
      <div className="md:col-span-1 space-y-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
            <RefreshCw size={20} className="text-purple-400" />
            Configuración
          </h2>
          
          <div className="space-y-6">
            {/* Zona de Carga (Drag & Drop) */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                1. Imagen de Origen
              </label>
              <div 
                className={`relative group border-2 border-dashed rounded-lg transition-all ${
                    isDragging 
                        ? 'border-purple-400 bg-purple-500/10' 
                        : 'border-slate-600 hover:border-purple-500 hover:bg-slate-700/50'
                }`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="scaler-upload"
                />
                <label
                  htmlFor="scaler-upload"
                  className="flex flex-col items-center justify-center w-full p-8 cursor-pointer text-center"
                >
                  <Upload size={24} className={`mb-2 ${isDragging ? 'text-purple-400' : 'text-slate-400'}`} />
                  <span className="text-sm text-slate-300 font-medium">
                    {isDragging ? '¡Suelta aquí!' : 'Haz clic o arrastra aquí'}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">Soporta PNG, JPG</span>
                </label>
              </div>
            </div>

            {originalImage && (
              <>
                <div className="bg-slate-900/50 p-3 rounded-lg text-sm border border-slate-700">
                  <p className="text-slate-400">Tamaño Original:</p>
                  <p className="text-white font-mono">{imageSize.w} x {imageSize.h} px</p>
                </div>

                {/* Selector de Modo */}
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                        2. ¿Qué deseas hacer?
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-lg">
                        <button 
                            onClick={() => setMode('upscale')}
                            className={`flex items-center justify-center gap-2 py-2 rounded text-xs font-bold transition-colors ${mode === 'upscale' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Maximize2 size={14} />
                            Agrandar
                        </button>
                        <button 
                            onClick={() => setMode('downscale')}
                            className={`flex items-center justify-center gap-2 py-2 rounded text-xs font-bold transition-colors ${mode === 'downscale' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Minimize2 size={14} />
                            Pixelar
                        </button>
                    </div>
                </div>

                {/* Controles Específicos según Modo */}
                {mode === 'upscale' ? (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Factor de Escalado (x{scaleFactor})
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="16"
                            step="1"
                            value={scaleFactor}
                            onChange={(e) => setScaleFactor(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono">
                            <span>1x</span>
                            <span>16x</span>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-top-2">
                         <label className="block text-sm font-medium text-slate-400 mb-2">
                            Ancho Objetivo (Píxeles)
                        </label>
                        <div className="flex gap-2 mb-2">
                            {[16, 32, 64, 128].map(size => (
                                <button
                                    key={size}
                                    onClick={() => setTargetSize(size)}
                                    className={`flex-1 py-1 rounded text-xs font-mono border ${
                                        targetSize === size 
                                            ? 'bg-purple-600/20 border-purple-500 text-purple-300' 
                                            : 'bg-slate-700 border-transparent text-slate-400 hover:bg-slate-600'
                                    }`}
                                >
                                    {size}px
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number"
                                value={targetSize}
                                onChange={(e) => setTargetSize(parseInt(e.target.value) || 16)}
                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none"
                            />
                            <span className="text-slate-500 text-sm">px</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            La imagen se reducirá a este tamaño manteniendo la proporción.
                        </p>
                    </div>
                )}

                <div className="bg-slate-900/50 p-3 rounded-lg text-sm border border-slate-700">
                  <p className="text-slate-400">Resultado Final:</p>
                  <p className="text-purple-300 font-mono font-bold">
                    {finalSize.w} x {finalSize.h} px
                  </p>
                </div>

                <button
                  onClick={downloadImage}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={20} />
                  Descargar PNG
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Área de Visualización */}
      <div className="md:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl flex flex-col gap-6">
        {!originalImage ? (
          <div 
            className={`flex-1 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed rounded-lg min-h-[400px] transition-colors ${isDragging ? 'border-purple-500 bg-slate-700/50' : 'border-slate-700'}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <ImageIcon size={64} className="mb-4 opacity-50" />
            <p>Arrastra una imagen aquí o usa el panel lateral</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8 h-full">
            {/* Comparación */}
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Antes */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Original</span>
                <div className="flex-1 bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center p-4 overflow-hidden relative checkerboard-bg group">
                   <img 
                    src={previewUrl} 
                    alt="Original" 
                    className="max-w-full max-h-full object-contain shadow-lg pixelated"
                   />
                   <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
                        {imageSize.w}x{imageSize.h}
                   </div>
                </div>
              </div>

              {/* Después */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                    {mode === 'upscale' ? 'Escalado' : 'Pixelado (Zoom Preview)'}
                </span>
                <div className="flex-1 bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center p-4 overflow-hidden checkerboard-bg relative">
                  {/* Canvas real usado para descarga */}
                  <canvas 
                    ref={canvasRef} 
                    // Si estamos en modo downscale, forzamos un ancho visual grande con CSS para que se vea el pixelado
                    // Si estamos en modo upscale, dejamos que se contenga normalmente
                    className={`object-contain shadow-xl pixelated ${mode === 'downscale' ? 'w-full h-full' : 'max-w-full max-h-full'}`}
                    style={{ 
                        // En modo downscale, queremos que el canvas pequeño ocupe espacio para verlo
                        width: mode === 'downscale' ? 'auto' : undefined,
                        height: mode === 'downscale' ? 'auto' : undefined,
                        maxWidth: '100%',
                        maxHeight: '100%'
                    }} 
                  />
                  {mode === 'downscale' && (
                       <div className="absolute top-2 right-2 bg-purple-900/80 text-purple-100 text-[10px] px-2 py-1 rounded backdrop-blur-sm border border-purple-500/30">
                           Vista Previa Ampliada
                       </div>
                  )}
                </div>
              </div>
            </div>
            
            <p className="text-center text-slate-500 text-xs">
              {mode === 'downscale' 
                ? "* Estás viendo una previsualización ampliada. El archivo descargado tendrá el tamaño pequeño real (ej. 32x32) y será perfectamente pixelado."
                : "* El archivo descargado será idéntico a la imagen de la derecha."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// MÓDULO 2: GENERADOR DE ATLAS
// ==========================================

const TextureAtlasGenerator = () => {
  const [atlasSize, setAtlasSize] = useState({ w: 512, h: 512 });
  const [textures, setTextures] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  
  // Nuevos estados para la configuración del grid y padding
  const [tileSize, setTileSize] = useState({ w: 16, h: 16 });
  const [padding, setPadding] = useState(0);
  const [useGrid, setUseGrid] = useState(true);
  const [draggedTextureId, setDraggedTextureId] = useState(null);

  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);

  // Dibujar el atlas cuando cambian las texturas, el tamaño o el padding
  useEffect(() => {
    drawAtlas();
    // Recalcular el tamaño del canvas para compensar el padding si es necesario
    if (textures.length > 0) {
        const adjustCanvasSize = () => {
            let maxW = 0;
            let maxH = 0;
            textures.forEach(tex => {
                maxW = Math.max(maxW, tex.x + tex.w);
                maxH = Math.max(maxH, tex.y + tex.h);
            });
            // Solo ajustar si el contenido excede el tamaño actual o si se quiere ajustar al contenido
            // Por ahora, mantenemos el tamaño manual pero aseguramos que todo quepa
             setAtlasSize(prev => ({
                w: Math.max(prev.w, maxW + padding),
                h: Math.max(prev.h, maxH + padding)
            }));
        };
        // Descomentar para ajustar automáticamente el canvas al contenido
        // adjustCanvasSize();
    }

  }, [textures, atlasSize.w, atlasSize.h, padding]);

  const drawAtlas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Asegurar pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;
    canvas.style.imageRendering = 'pixelated';

    canvas.width = atlasSize.w;
    canvas.height = atlasSize.h;
    
    // Limpiar con color transparente
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar una cuadrícula guía si está activada (opcional, solo visual)
    if (useGrid && zoom > 0.5) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        const effectiveCellSizeX = tileSize.w + padding;
        const effectiveCellSizeY = tileSize.h + padding;
        
        ctx.beginPath();
        for (let x = padding; x < canvas.width; x += effectiveCellSizeX) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
        }
        for (let y = padding; y < canvas.height; y += effectiveCellSizeY) {
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
    }

    // Dibujar texturas
    textures.forEach((tex) => {
      const img = new Image();
      img.src = tex.data;
      // Usar una función para dibujar para manejar tanto la carga inicial como imágenes ya cacheadas
      const draw = () => {
          ctx.imageSmoothingEnabled = false;
          // Aplicar padding al dibujar
          ctx.drawImage(img, tex.x + padding, tex.y + padding);
      };

      if (img.complete) {
        draw();
      } else {
        img.onload = draw;
      }
    });
  };

  // ... (Funciones de carga de archivos: processFiles, handleFileUpload, onDragOverFiles, onDragLeaveFiles, onDropFiles - sin cambios mayores)
  const processFiles = (fileList) => {
    const files = Array.from(fileList);
    files.forEach(file => {
        if(!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                setTextures(prev => [...prev, {
                    id: Date.now() + Math.random(),
                    name: file.name,
                    data: ev.target.result,
                    w: img.width,
                    h: img.height,
                    x: 0, // Posición inicial temporal
                    y: 0
                }]);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (e) => processFiles(e.target.files);
  const onDragOverFiles = (e) => { e.preventDefault(); setIsDraggingFiles(true); };
  const onDragLeaveFiles = (e) => { e.preventDefault(); setIsDraggingFiles(false); };
  const onDropFiles = (e) => {
    e.preventDefault();
    setIsDraggingFiles(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
    }
  };

  // Organizar automáticamente con soporte para Grid y Padding
  const autoArrange = () => {
    let currentX = 0;
    let currentY = 0;
    let nextRowY = 0;
    
    const effectiveTileW = useGrid ? tileSize.w : 0;
    const effectiveTileH = useGrid ? tileSize.h : 0;
    const spacing = padding;

    const newTextures = textures.map(tex => {
      // Determinar el ancho y alto que ocupará la textura
      const occupiedW = useGrid ? Math.ceil(tex.w / effectiveTileW) * effectiveTileW : tex.w;
      const occupiedH = useGrid ? Math.ceil(tex.h / effectiveTileH) * effectiveTileH : tex.h;

      // Si no cabe en la fila actual, pasar a la siguiente
      if (currentX + occupiedW > atlasSize.w) {
        currentX = 0;
        currentY = nextRowY + spacing;
      }

      const updatedTex = { ...tex, x: currentX, y: currentY };

      // Actualizar punteros para la siguiente textura
      currentX += occupiedW + spacing;
      if (currentY + occupiedH > nextRowY) {
        nextRowY = currentY + occupiedH;
      }
      return updatedTex;
    });
    setTextures(newTextures);
  };

  // Funciones para manipulación individual de texturas
  const deleteTexture = (id) => {
      setTextures(textures.filter(tex => tex.id !== id));
  };

  const updateTexturePos = (id, axis, value) => {
      const numValue = parseInt(value) || 0;
      setTextures(textures.map(tex => 
          tex.id === id ? { ...tex, [axis]: numValue } : tex
      ));
  };

  // Drag and Drop en el Canvas
  const handleCanvasDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
  };

  const handleCanvasDrop = (e) => {
      e.preventDefault();
      if (!draggedTextureId || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      // Calcular la posición del ratón relativa al canvas, considerando el zoom
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      
      let rawX = (e.clientX - rect.left) * scaleX;
      let rawY = (e.clientY - rect.top) * scaleY;

      // Compensar el padding global del canvas
      rawX -= padding;
      rawY -= padding;

      let newX = rawX;
      let newY = rawY;

      if (useGrid) {
          const effectiveCellW = tileSize.w + padding;
          const effectiveCellH = tileSize.h + padding;
          // Ajustar al grid más cercano
          newX = Math.round(rawX / effectiveCellW) * effectiveCellW;
          newY = Math.round(rawY / effectiveCellH) * effectiveCellH;
      }
      
      // Asegurar que no quede fuera de los límites negativos
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);

      // Actualizar la posición de la textura arrastrada
      setTextures(textures.map(tex => 
          tex.id === draggedTextureId ? { ...tex, x: newX, y: newY } : tex
      ));
      setDraggedTextureId(null);
  };

  // ... (Funciones de guardar/cargar/descargar/limpiar - sin cambios mayores)
  const clearTextures = () => setTextures([]);
  const downloadAtlas = () => {
    const link = document.createElement('a');
    link.download = `atlas_${atlasSize.w}x${atlasSize.h}.png`;
    // Usar el canvasRef para obtener la imagen final
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };
  const saveProject = () => {
    const blob = new Blob([JSON.stringify({ version: '1.1', atlasSize, textures, tileSize, padding, useGrid })], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'atlas_project.json';
    link.click();
  };
  const loadProject = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.textures) {
          setAtlasSize(data.atlasSize || {w: 512, h: 512});
          setTextures(data.textures);
          if(data.tileSize) setTileSize(data.tileSize);
          if(data.padding !== undefined) setPadding(data.padding);
          if(data.useGrid !== undefined) setUseGrid(data.useGrid);
        }
      } catch (err) { alert('Error al cargar el archivo JSON del proyecto.'); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid lg:grid-cols-4 gap-6 h-[calc(100vh-150px)]">
      {/* Panel Izquierdo: Configuración y Lista */}
      <div className="lg:col-span-1 bg-slate-800 rounded-xl border border-slate-700 flex flex-col shadow-xl overflow-hidden">
        
        {/* Sección 1: Configuración del Canvas y Grid */}
        <div className="p-4 border-b border-slate-700 bg-slate-800 z-10 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings size={18} className="text-purple-400" />
            Configuración Atlas
          </h2>
          
          {/* Tamaño del Canvas */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Ancho Lienzo</label>
              <input type="number" value={atlasSize.w} onChange={(e) => setAtlasSize(prev => ({...prev, w: Math.max(1, parseInt(e.target.value) || 1)}))} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Alto Lienzo</label>
              <input type="number" value={atlasSize.h} onChange={(e) => setAtlasSize(prev => ({...prev, h: Math.max(1, parseInt(e.target.value) || 1)}))} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
            </div>
          </div>

          {/* Configuración del Grid y Padding */}
          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-300 flex items-center gap-2 cursor-pointer">
                      <button onClick={() => setUseGrid(!useGrid)} className="text-purple-400 focus:outline-none">
                        {useGrid ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                      Usar Grid (Tiles)
                  </label>
              </div>
              
              {useGrid && (
                <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-1">
                    <div>
                    <label className="text-xs text-slate-400 block mb-1">Ancho Tile</label>
                    <input type="number" value={tileSize.w} onChange={(e) => setTileSize(prev => ({...prev, w: Math.max(1, parseInt(e.target.value) || 1)}))} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
                    </div>
                    <div>
                    <label className="text-xs text-slate-400 block mb-1">Alto Tile</label>
                    <input type="number" value={tileSize.h} onChange={(e) => setTileSize(prev => ({...prev, h: Math.max(1, parseInt(e.target.value) || 1)}))} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
                    </div>
                </div>
              )}

              <div>
                  <label className="text-xs text-slate-400 block mb-1">Padding (Píxeles)</label>
                  <input type="number" value={padding} onChange={(e) => setPadding(Math.max(0, parseInt(e.target.value) || 0))} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
              </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-2">
            <label className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded text-center cursor-pointer transition-colors flex items-center justify-center gap-1">
              <Upload size={14} />
              Texturas
              <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
            <button onClick={autoArrange} title="Organizar Automáticamente" className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded transition-colors flex-none"><Grid size={16} /></button>
            <button onClick={clearTextures} title="Limpiar Todo" className="bg-red-500/20 hover:bg-red-500/30 text-red-400 p-2 rounded transition-colors flex-none"><Trash2 size={16} /></button>
          </div>
        </div>
        
        {/* Lista de Texturas (Drop Zone) */}
        <div 
            className={`flex-1 overflow-y-auto p-2 space-y-2 transition-colors ${isDraggingFiles ? 'bg-purple-500/10' : ''}`}
            onDragOver={onDragOverFiles}
            onDragLeave={onDragLeaveFiles}
            onDrop={onDropFiles}
        >
          {textures.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center border-2 border-dashed border-slate-700/50 rounded-lg">
                <Move size={24} className="mb-2 opacity-50" />
                <p className="text-xs italic">Arrastra tus archivos de textura aquí</p>
             </div>
          )}
          {textures.map((tex) => (
            <div 
                key={tex.id} 
                draggable 
                onDragStart={() => setDraggedTextureId(tex.id)}
                className="bg-slate-900/80 p-2 rounded border border-slate-700 flex items-start gap-2 group hover:border-purple-500/50 cursor-grab active:cursor-grabbing"
            >
              {/* Miniatura */}
              <img src={tex.data} alt="thumb" className="w-10 h-10 object-contain bg-slate-800 rounded pixelated flex-none" />
              
              {/* Info y Controles */}
              <div className="flex-1 overflow-hidden min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <p className="text-xs text-slate-300 truncate font-mono mr-1" title={tex.name}>{tex.name}</p>
                    <button onClick={() => deleteTexture(tex.id)} className="text-slate-500 hover:text-red-400 transition-colors"><X size={12} /></button>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{tex.w}x{tex.h}</span>
                    <span className="flex-1"></span>
                    <div className="flex items-center gap-1">
                        X: <input type="number" value={tex.x} onChange={(e) => updateTexturePos(tex.id, 'x', e.target.value)} className="w-8 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-center text-slate-300 focus:border-purple-500 focus:outline-none" />
                    </div>
                    <div className="flex items-center gap-1">
                        Y: <input type="number" value={tex.y} onChange={(e) => updateTexturePos(tex.id, 'y', e.target.value)} className="w-8 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-center text-slate-300 focus:border-purple-500 focus:outline-none" />
                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pie de Página del Panel */}
        <div className="p-4 border-t border-slate-700 bg-slate-800 space-y-2 z-10">
            <div className="flex gap-2">
                <button onClick={saveProject} className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-2 rounded text-slate-300 flex items-center justify-center gap-1"><Save size={14} />Guardar JSON</button>
                <label className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-2 rounded text-slate-300 flex items-center justify-center gap-1 cursor-pointer"><FolderOpen size={14} />Cargar JSON<input type="file" accept=".json" onChange={loadProject} className="hidden" /></label>
            </div>
            <button onClick={downloadAtlas} className="w-full bg-green-600 hover:bg-green-500 text-white text-sm py-2 rounded font-bold shadow-lg flex items-center justify-center gap-2 transition-colors"><Download size={16} /> Descargar Atlas PNG</button>
        </div>
      </div>

      {/* Panel Derecho: Visualizador Canvas */}
      <div className="lg:col-span-3 bg-slate-900 rounded-xl border border-slate-700 relative overflow-hidden flex flex-col">
        {/* Toolbar de Zoom */}
        <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg p-1 flex gap-2 shadow-lg z-10">
            <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-2 hover:bg-slate-700 rounded text-slate-300"><ZoomOut size={18} /></button>
            <span className="flex items-center text-xs font-mono w-12 justify-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="p-2 hover:bg-slate-700 rounded text-slate-300"><ZoomIn size={18} /></button>
        </div>
        
        {/* Área del Canvas con Scroll y Drop */}
        <div 
            ref={canvasContainerRef}
            className="flex-1 overflow-auto p-8 flex items-center justify-center bg-slate-950 checkerboard-bg"
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
        >
            <div style={{ transform: `scale(${zoom})`, transition: 'transform 0.1s ease-out', transformOrigin: 'center' }} className="shadow-2xl shadow-black border border-slate-700 bg-transparent">
                <canvas ref={canvasRef} className="block bg-transparent pixelated" style={{ imageRendering: 'pixelated' }} />
            </div>
        </div>
        <div className="absolute bottom-4 left-4 text-xs text-slate-500 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 backdrop-blur-sm">
            Arrastra texturas desde la lista al canvas para organizarlas manualmente.
        </div>
      </div>
    </div>
  );
};

export default PixelForge;