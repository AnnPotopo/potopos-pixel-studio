import React, { useState, useRef, useEffect } from 'react';
import {
    Upload, Download,
    Image as ImageIcon, Minimize2, ZoomIn, ZoomOut, Play,
    Palette, Sparkles
} from 'lucide-react';

const PixelScaler = () => {
    const [originalImage, setOriginalImage] = useState(null);

    // === CONFIGURACIÓN ===
    const [targetSize, setTargetSize] = useState(64);
    const [colorCount, setColorCount] = useState(32);
    const [removeOrphans, setRemoveOrphans] = useState(false);

    // === ESTADOS INTERNOS ===
    const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
    const [finalSize, setFinalSize] = useState({ w: 0, h: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [previewZoom, setPreviewZoom] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [regenerateTrigger, setRegenerateTrigger] = useState(0);

    const canvasRef = useRef(null);

    // --- CARGA DE IMAGEN ---
    const processImage = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                setImageSize({ w: img.width, h: img.height });
                setOriginalImage(img);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleImageUpload = (e) => processImage(e.target.files[0]);
    const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) processImage(e.dataTransfer.files[0]);
    };

    // --- ALGORITMOS DE PROCESAMIENTO (CORREGIDOS) ---

    // Algoritmo A Mejorado: "Smart Binning Quantization"
    // Soluciona el problema de imágenes monocromáticas agrupando colores similares antes de elegir.
    const reduceColors = (imageData, maxColors) => {
        const data = imageData.data;
        const colorMap = {};

        // FACTOR DE TOLERANCIA: Cuanto más alto, más agrupa colores similares.
        // 25 es un buen equilibrio para detectar que "Azul A" y "Azul B" son lo mismo.
        const tolerance = 25;
        const roundColor = (val) => Math.floor(val / tolerance) * tolerance;

        // 1. Contar frecuencias de GRUPOS de color (Buckets)
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 128) continue; // Ignorar transparentes

            const r = roundColor(data[i]);
            const g = roundColor(data[i + 1]);
            const b = roundColor(data[i + 2]);

            const key = `${r},${g},${b}`;
            colorMap[key] = (colorMap[key] || 0) + 1;
        }

        // 2. Ordenar grupos por popularidad y tomar los líderes
        let palette = Object.entries(colorMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, maxColors)
            .map(([key]) => key.split(',').map(Number));

        // Fallback: Si la imagen es muy simple y tiene menos colores que maxColors
        if (palette.length === 0) return imageData;

        // Ajuste fino: Centrar los colores de la paleta (para que no queden oscuros por el redondeo hacia abajo)
        palette = palette.map(([r, g, b]) => [
            Math.min(255, r + tolerance / 2),
            Math.min(255, g + tolerance / 2),
            Math.min(255, b + tolerance / 2)
        ]);

        // 3. Mapear cada píxel REAL al color más cercano de la paleta elegida
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 128) continue;

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            let minDist = Infinity;
            let closestColor = palette[0];

            // Búsqueda del color más cercano (Distancia Euclidiana Cuadrada - más rápida)
            for (const [pr, pg, pb] of palette) {
                const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
                if (dist < minDist) {
                    minDist = dist;
                    closestColor = [pr, pg, pb];
                }
            }

            data[i] = closestColor[0];
            data[i + 1] = closestColor[1];
            data[i + 2] = closestColor[2];
            data[i + 3] = 255;
        }

        return imageData;
    };

    // Algoritmo B: Limpiar Huérfanos
    const cleanOrphans = (imageData) => {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const copy = new Uint8ClampedArray(data);

        const getPixelIdx = (x, y) => (y * width + x) * 4;
        const isSameColor = (idx1, idx2, arr) =>
            arr[idx1] === arr[idx2] && arr[idx1 + 1] === arr[idx2 + 1] && arr[idx1 + 2] === arr[idx2 + 2];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = getPixelIdx(x, y);
                if (copy[idx + 3] < 128) continue;

                // Comprobar vecinos ortogonales (Arriba, Abajo, Izq, Der)
                const neighbors = [
                    getPixelIdx(x, y - 1),
                    getPixelIdx(x, y + 1),
                    getPixelIdx(x - 1, y),
                    getPixelIdx(x + 1, y)
                ];

                // Si el pixel es diferente a TODOS sus vecinos
                const isOrphan = neighbors.every(nIdx => !isSameColor(idx, nIdx, copy));

                if (isOrphan) {
                    // Votar por el color mayoritario de los vecinos
                    const votes = {};
                    let maxVotes = 0;
                    let winnerIdx = neighbors[0];

                    neighbors.forEach(nIdx => {
                        const key = `${copy[nIdx]},${copy[nIdx + 1]},${copy[nIdx + 2]}`;
                        votes[key] = (votes[key] || 0) + 1;
                        if (votes[key] > maxVotes) {
                            maxVotes = votes[key];
                            winnerIdx = nIdx;
                        }
                    });

                    // Reemplazar
                    data[idx] = copy[winnerIdx];
                    data[idx + 1] = copy[winnerIdx + 1];
                    data[idx + 2] = copy[winnerIdx + 2];
                }
            }
        }
        return imageData;
    };

    // --- PIPELINE PRINCIPAL ---
    useEffect(() => {
        if (!originalImage || !canvasRef.current) return;
        setIsProcessing(true);

        setTimeout(() => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            // Setup básico
            const aspectRatio = originalImage.height / originalImage.width;
            const newW = targetSize;
            const newH = Math.round(targetSize * aspectRatio);
            setFinalSize({ w: newW, h: newH });

            canvas.width = newW;
            canvas.height = newH;

            ctx.imageSmoothingEnabled = false;
            canvas.style.imageRendering = 'pixelated';

            // 1. Dibujar base reducida
            ctx.drawImage(originalImage, 0, 0, newW, newH);

            // 2. Procesar Píxeles
            let imageData = ctx.getImageData(0, 0, newW, newH);

            if (colorCount < 256) {
                imageData = reduceColors(imageData, colorCount);
            }

            if (removeOrphans) {
                // Aplicar dos pasadas para mejor limpieza
                imageData = cleanOrphans(imageData);
                imageData = cleanOrphans(imageData);
            }

            ctx.putImageData(imageData, 0, 0);
            setIsProcessing(false);

        }, 20);

    }, [originalImage, targetSize, colorCount, removeOrphans, regenerateTrigger]);

    const downloadImage = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = `pixelart_${finalSize.w}x${finalSize.h}_c${colorCount}.png`;
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="grid md:grid-cols-3 gap-6 animate-fade-in">
            {/* Sidebar de Controles */}
            <div className="md:col-span-1 space-y-6">
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
                    <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                        <Minimize2 size={20} className="text-purple-400" />
                        Configuración
                    </h2>

                    <div className="space-y-6">
                        {!originalImage && (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">1. Imagen de Origen</label>
                                <div
                                    className={`relative group border-2 border-dashed rounded-lg transition-all ${isDragging ? 'border-purple-400 bg-purple-500/10' : 'border-slate-600 hover:border-purple-500 hover:bg-slate-700/50'}`}
                                    onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                                >
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="scaler-upload" />
                                    <label htmlFor="scaler-upload" className="flex flex-col items-center justify-center w-full p-8 cursor-pointer text-center">
                                        <Upload size={24} className={`mb-2 ${isDragging ? 'text-purple-400' : 'text-slate-400'}`} />
                                        <span className="text-sm text-slate-300 font-medium">{isDragging ? '¡Suelta aquí!' : 'Haz clic o arrastra'}</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {originalImage && (
                            <>
                                <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                                    <span>Original: {imageSize.w}x{imageSize.h}</span>
                                    <button onClick={() => setOriginalImage(null)} className="text-red-400 hover:text-red-300">Cambiar</button>
                                </div>

                                {/* CONTROL 1: TAMAÑO */}
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                    <label className="text-sm font-bold text-purple-300 mb-3 block flex items-center gap-2">
                                        <Minimize2 size={16} /> Resolución
                                    </label>
                                    <div className="flex gap-2 mb-3">
                                        {[32, 64, 96, 128].map(size => (
                                            <button key={size} onClick={() => setTargetSize(size)} className={`flex-1 py-1 rounded text-xs font-mono border transition-all ${targetSize === size ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}>{size}</button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input type="range" min="16" max="256" step="8" value={targetSize} onChange={(e) => setTargetSize(parseInt(e.target.value))} className="flex-1 accent-purple-500" />
                                        <span className="font-mono text-xs w-12 text-right">{targetSize}px</span>
                                    </div>
                                </div>

                                {/* CONTROL 2: COLORES (PALETA) */}
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                    <label className="text-sm font-bold text-pink-300 mb-3 block flex items-center gap-2">
                                        <Palette size={16} /> Paleta de Colores
                                    </label>
                                    <div className="flex items-center gap-3 mb-2">
                                        <input type="range" min="4" max="64" step="1" value={colorCount} onChange={(e) => setColorCount(parseInt(e.target.value))} className="flex-1 accent-pink-500" />
                                        <span className="font-mono text-xs w-12 text-right">{colorCount} Cols</span>
                                    </div>
                                    <div className="flex gap-1 justify-between text-[10px] text-slate-500 font-mono">
                                        <span onClick={() => setColorCount(8)} className="cursor-pointer hover:text-white">8bit</span>
                                        <span onClick={() => setColorCount(16)} className="cursor-pointer hover:text-white">16(NES)</span>
                                        <span onClick={() => setColorCount(32)} className="cursor-pointer hover:text-white">32</span>
                                        <span onClick={() => setColorCount(256)} className="cursor-pointer hover:text-white">Full</span>
                                    </div>
                                </div>

                                {/* CONTROL 3: LIMPIEZA */}
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-sm font-bold text-yellow-300 flex items-center gap-2">
                                            <Sparkles size={16} /> Limpiar Ruido
                                        </span>
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${removeOrphans ? 'bg-yellow-600' : 'bg-slate-700'}`}>
                                            <input type="checkbox" checked={removeOrphans} onChange={(e) => setRemoveOrphans(e.target.checked)} className="hidden" />
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${removeOrphans ? 'left-6' : 'left-1'}`}></div>
                                        </div>
                                    </label>
                                </div>

                                <div className="bg-slate-900/50 p-3 rounded-lg text-sm border border-slate-700 text-center">
                                    <p className="text-white font-mono font-bold text-lg">{finalSize.w} x {finalSize.h}</p>
                                </div>

                                <button onClick={downloadImage} className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-bold shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2">
                                    <Download size={20} /> Descargar PNG
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Visualización */}
            <div className="md:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl flex flex-col gap-6">
                {!originalImage ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-lg min-h-[400px]">
                        <ImageIcon size={64} className="mb-4 opacity-50" />
                        <p>Sube una imagen para comenzar</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 h-full">
                        <div className="flex justify-between items-center bg-slate-900/80 p-2 rounded-lg border border-slate-700 backdrop-blur">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Zoom</span>
                                <button onClick={() => setPreviewZoom(z => Math.max(0.5, z - 0.5))} className="p-1 hover:bg-slate-700 rounded text-slate-300"><ZoomOut size={14} /></button>
                                <span className="text-xs font-mono w-8 text-center text-slate-300">{previewZoom}x</span>
                                <button onClick={() => setPreviewZoom(z => Math.min(20, z + 0.5))} className="p-1 hover:bg-slate-700 rounded text-slate-300"><ZoomIn size={14} /></button>
                            </div>
                            <div className="flex items-center gap-3">
                                {isProcessing && <span className="text-xs text-yellow-400 animate-pulse">Procesando...</span>}
                                <button onClick={() => setRegenerateTrigger(prev => prev + 1)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-bold transition-colors"><Play size={10} fill="currentColor" /> Regenerar</button>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden relative checkerboard-bg flex items-center justify-center p-4">
                            <div className="w-full h-full overflow-auto flex items-center justify-center custom-scrollbar">
                                <canvas ref={canvasRef} className="shadow-2xl shadow-black pixelated transition-all duration-200 ease-out" style={{ transform: `scale(${previewZoom})`, imageRendering: 'pixelated', opacity: isProcessing ? 0.5 : 1 }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PixelScaler;