// src/components/PixelScaler.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
    Upload, Download, RefreshCw,
    Image as ImageIcon, Maximize2, Minimize2
} from 'lucide-react';

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

        // Volver a asegurar que el contexto no suavice
        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(originalImage, 0, 0, newW, newH);

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
                                className={`relative group border-2 border-dashed rounded-lg transition-all ${isDragging
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
                                                    className={`flex-1 py-1 rounded text-xs font-mono border ${targetSize === size
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
                            <div className="flex-col gap-2 hidden md:flex">
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
                            <div className="flex flex-col gap-2 col-span-2 md:col-span-1">
                                <span className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                                    {mode === 'upscale' ? 'Escalado' : 'Pixelado (Zoom Preview)'}
                                </span>
                                <div className="flex-1 bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center p-4 overflow-hidden checkerboard-bg relative">
                                    <canvas
                                        ref={canvasRef}
                                        className={`object-contain shadow-xl pixelated ${mode === 'downscale' ? 'w-full h-full' : 'max-w-full max-h-full'}`}
                                        style={{
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
                                ? "* Estás viendo una previsualización ampliada. El archivo descargado tendrá el tamaño pequeño real y será perfectamente pixelado."
                                : "* El archivo descargado será idéntico a la imagen de la derecha."
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PixelScaler;