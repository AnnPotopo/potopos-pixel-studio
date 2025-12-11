import React, { useState, useRef, useEffect } from 'react';
import {
    Upload, Download, Image as ImageIcon, ZoomIn, ZoomOut, Play,
    Palette, Sparkles, Sun, Sliders, Layers, Monitor, PaintBucket,
    ScanLine, ArrowLeftRight, Move
} from 'lucide-react';

// === PRESETS DE PALETA ===
const PRESETS = {
    auto: { name: 'Auto (Smart)', colors: [] },
    gb: { name: 'GameBoy', colors: [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]] },
    nes: { name: 'NES', colors: [[124, 124, 124], [0, 0, 252], [0, 0, 188], [68, 40, 188], [148, 0, 132], [168, 0, 32], [168, 16, 0], [136, 20, 0], [80, 48, 0], [0, 120, 0], [0, 104, 0], [0, 88, 0], [0, 64, 88], [0, 0, 0], [188, 188, 188], [0, 120, 248], [0, 88, 248], [104, 68, 252], [216, 0, 204], [228, 0, 88], [248, 56, 0], [228, 92, 16], [172, 124, 0], [0, 184, 0], [0, 168, 0], [0, 168, 68], [0, 136, 136], [248, 248, 248], [60, 188, 252], [104, 136, 252], [152, 120, 248], [248, 120, 248], [248, 88, 152], [248, 120, 88], [252, 160, 68], [248, 184, 0], [184, 248, 24], [88, 216, 84], [88, 248, 152], [0, 232, 216], [120, 120, 120], [252, 252, 252], [164, 228, 252], [184, 184, 248], [216, 184, 248], [248, 184, 248], [248, 164, 192], [240, 208, 176], [252, 224, 168], [248, 216, 120], [216, 248, 120], [184, 248, 184], [184, 248, 216], [0, 252, 252], [248, 216, 248], [0, 0, 0]] },
    pico8: { name: 'Pico-8', colors: [[0, 0, 0], [29, 43, 83], [126, 37, 83], [0, 135, 81], [171, 82, 54], [95, 87, 79], [194, 195, 199], [255, 241, 232], [255, 0, 77], [255, 163, 0], [255, 236, 39], [0, 228, 54], [41, 173, 255], [131, 118, 156], [255, 119, 168], [255, 204, 170]] },
    bw: { name: '1-Bit (B&N)', colors: [[0, 0, 0], [255, 255, 255]] },
    c64: { name: 'C64', colors: [[0, 0, 0], [255, 255, 255], [136, 0, 0], [170, 255, 238], [204, 68, 204], [0, 204, 85], [0, 0, 170], [238, 238, 119], [221, 136, 85], [102, 68, 0], [255, 119, 119], [51, 51, 51], [119, 119, 119], [170, 255, 102], [0, 136, 255], [187, 187, 187]] },
};

const PixelScaler = () => {
    // === ESTADOS UI ===
    const [activeTab, setActiveTab] = useState('dims'); // dims, color, palette, fx
    const [originalImage, setOriginalImage] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [previewZoom, setPreviewZoom] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [comparePos, setComparePos] = useState(50);
    const [regenerateTrigger, setRegenerateTrigger] = useState(0);
    const [fitMode, setFitMode] = useState(false); // Nuevo: Ajustar a pantalla o Scroll

    // === PARÁMETROS DE EDICIÓN ===
    // 1. Dimensiones
    const [targetSize, setTargetSize] = useState(64);

    // 2. Color (Pre-procesado)
    const [brightness, setBrightness] = useState(0);
    const [contrast, setContrast] = useState(0);
    const [saturation, setSaturation] = useState(0); // Nuevo
    const [noise, setNoise] = useState(0); // Nuevo

    // 3. Paleta
    const [paletteMode, setPaletteMode] = useState('auto');
    const [colorCount, setColorCount] = useState(32);
    const [useDithering, setUseDithering] = useState(false);
    const [ditherStrength, setDitherStrength] = useState(0.8);

    // 4. FX (Post-procesado)
    const [removeOrphans, setRemoveOrphans] = useState(false);
    const [addOutline, setAddOutline] = useState(false);
    const [outlineColor, setOutlineColor] = useState('#ffffff');

    // === ESTADOS INTERNOS ===
    const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
    const [finalSize, setFinalSize] = useState({ w: 0, h: 0 });
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
                // Resets
                setBrightness(0); setContrast(0); setSaturation(0); setNoise(0);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };
    const handleImageUpload = (e) => processImage(e.target.files[0]);

    // --- ALGORITMOS AUXILIARES ---
    const hexToRgb = (hex) => {
        const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [255, 255, 255];
    };

    const getDistanceSq = (c1, c2) => (c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2;

    // --- LÓGICA DE PROCESAMIENTO ---
    const applyColorGrading = (ctx, w, h) => {
        if (brightness === 0 && contrast === 0 && saturation === 0 && noise === 0) return;

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // 1. Brillo
            r += brightness; g += brightness; b += brightness;

            // 2. Contraste
            r = contrastFactor * (r - 128) + 128;
            g = contrastFactor * (g - 128) + 128;
            b = contrastFactor * (b - 128) + 128;

            // 3. Saturación
            if (saturation !== 0) {
                const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
                const satMult = 1 + (saturation / 100);
                r = gray + (r - gray) * satMult;
                g = gray + (g - gray) * satMult;
                b = gray + (b - gray) * satMult;
            }

            // 4. Ruido
            if (noise > 0) {
                const n = (Math.random() - 0.5) * noise * 255;
                r += n; g += n; b += n;
            }

            data[i] = Math.min(255, Math.max(0, r));
            data[i + 1] = Math.min(255, Math.max(0, g));
            data[i + 2] = Math.min(255, Math.max(0, b));
        }
        ctx.putImageData(imgData, 0, 0);
    };

    const generatePalette = (imageData, maxColors) => {
        const data = imageData.data;
        const colorMap = {};
        const tolerance = 25;
        const round = (v) => Math.floor(v / tolerance) * tolerance;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 128) continue;
            const key = `${round(data[i])},${round(data[i + 1])},${round(data[i + 2])}`;
            colorMap[key] = (colorMap[key] || 0) + 1;
        }

        let palette = Object.entries(colorMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, maxColors)
            .map(([k]) => k.split(',').map(Number).map(v => Math.min(255, v + tolerance / 2)));

        return palette.length > 0 ? palette : [[0, 0, 0], [255, 255, 255]];
    };

    const applyQuantization = (imageData, palette) => {
        const data = imageData.data;
        const w = imageData.width;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 128) continue;

            const current = [data[i], data[i + 1], data[i + 2]];
            let bestColor = palette[0];
            let minDist = Infinity;

            for (const col of palette) {
                const dist = getDistanceSq(current, col);
                if (dist < minDist) { minDist = dist; bestColor = col; }
            }

            data[i] = bestColor[0]; data[i + 1] = bestColor[1]; data[i + 2] = bestColor[2]; data[i + 3] = 255;

            if (useDithering) {
                const err = [(current[0] - bestColor[0]) * ditherStrength, (current[1] - bestColor[1]) * ditherStrength, (current[2] - bestColor[2]) * ditherStrength];
                const distribute = (idx, factor) => {
                    if (idx < data.length && data[idx + 3] > 128) {
                        data[idx] += err[0] * factor; data[idx + 1] += err[1] * factor; data[idx + 2] += err[2] * factor;
                    }
                };
                distribute(i + 4, 7 / 16);
                distribute(i + w * 4 - 4, 3 / 16);
                distribute(i + w * 4, 5 / 16);
                distribute(i + w * 4 + 4, 1 / 16);
            }
        }
        return imageData;
    };

    const cleanOrphans = (imageData) => {
        const w = imageData.width; const h = imageData.height; const data = imageData.data;
        const copy = new Uint8ClampedArray(data);
        const getIdx = (x, y) => (y * w + x) * 4;
        const isMatch = (i1, i2) => copy[i1] === copy[i2] && copy[i1 + 1] === copy[i2 + 1] && copy[i1 + 2] === copy[i2 + 2];

        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const i = getIdx(x, y);
                if (copy[i + 3] < 128) continue;
                const neighbors = [getIdx(x, y - 1), getIdx(x, y + 1), getIdx(x - 1, y), getIdx(x + 1, y)];
                if (neighbors.every(n => !isMatch(i, n))) {
                    const rep = neighbors[0];
                    data[i] = copy[rep]; data[i + 1] = copy[rep + 1]; data[i + 2] = copy[rep + 2];
                }
            }
        }
        return imageData;
    };

    const generateOutline = (imageData, colorHex) => {
        const w = imageData.width; const h = imageData.height; const data = imageData.data;
        const copy = new Uint8ClampedArray(data);
        const [r, g, b] = hexToRgb(colorHex);
        const getIdx = (x, y) => (y * w + x) * 4;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = getIdx(x, y);
                if (copy[i + 3] < 128) {
                    let hasOpaque = false;
                    [[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]].forEach(([nx, ny]) => {
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h && copy[getIdx(nx, ny) + 3] > 128) hasOpaque = true;
                    });
                    if (hasOpaque) { data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255; }
                }
            }
        }
        return imageData;
    };

    // --- EFECTO PRINCIPAL ---
    useEffect(() => {
        if (!originalImage || !canvasRef.current) return;
        setIsProcessing(true);

        setTimeout(() => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            const ratio = originalImage.height / originalImage.width;
            const newW = targetSize;
            const newH = Math.round(targetSize * ratio);
            setFinalSize({ w: newW, h: newH });
            canvas.width = newW; canvas.height = newH;

            ctx.imageSmoothingEnabled = false;
            canvas.style.imageRendering = 'pixelated';

            // 1. Dibujar
            ctx.drawImage(originalImage, 0, 0, newW, newH);

            // 2. Corrección de Color
            applyColorGrading(ctx, newW, newH);

            // 3. Obtener Data
            let imgData = ctx.getImageData(0, 0, newW, newH);

            // 4. Paleta
            let activePalette = paletteMode === 'auto' ? generatePalette(imgData, colorCount) : PRESETS[paletteMode].colors;
            imgData = applyQuantization(imgData, activePalette);

            // 5. FX
            if (removeOrphans) imgData = cleanOrphans(imgData);
            if (addOutline) imgData = generateOutline(imgData, outlineColor);

            ctx.putImageData(imgData, 0, 0);
            setIsProcessing(false);
        }, 20);
    }, [originalImage, targetSize, colorCount, paletteMode, useDithering, ditherStrength, removeOrphans, brightness, contrast, saturation, noise, addOutline, outlineColor, regenerateTrigger]);

    const downloadImage = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = `pixelforge_${finalSize.w}x${finalSize.h}.png`;
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] animate-fade-in">

            {/* === COLUMNA IZQUIERDA: MENÚ TABULADO (Ancho Fijo) === */}
            <div className="lg:col-span-3 bg-slate-800 rounded-xl border border-slate-700 shadow-xl flex flex-col overflow-hidden">

                {/* Cabecera Sidebar */}
                <div className="p-4 border-b border-slate-700 bg-slate-900/50">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sliders size={16} className="text-purple-400" /> Editor
                    </h2>
                </div>

                {/* Carga Inicial */}
                {!originalImage && (
                    <div className="p-6 flex flex-col items-center justify-center flex-1">
                        <div
                            className={`w-full border-2 border-dashed rounded-lg p-8 text-center transition-all ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-slate-600 hover:border-purple-500'}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
                            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleImageUpload(e) }}
                        >
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="up" />
                            <label htmlFor="up" className="cursor-pointer flex flex-col items-center gap-2">
                                <Upload size={32} className="text-slate-400" />
                                <span className="text-sm text-slate-300 font-bold">Abrir Imagen</span>
                                <span className="text-xs text-slate-500">Arrastra o haz clic</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* Controles (Solo si hay imagen) */}
                {originalImage && (
                    <>
                        {/* Navegación por Pestañas */}
                        <div className="flex border-b border-slate-700 bg-slate-800">
                            {[
                                { id: 'dims', icon: Monitor, label: 'Tam' },
                                { id: 'color', icon: Sun, label: 'Color' },
                                { id: 'palette', icon: Palette, label: 'Paleta' },
                                { id: 'fx', icon: Sparkles, label: 'FX' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-3 flex flex-col items-center gap-1 text-[10px] uppercase font-bold transition-colors border-b-2 ${activeTab === tab.id
                                            ? 'border-purple-500 text-purple-400 bg-slate-700/50'
                                            : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-700/30'
                                        }`}
                                >
                                    <tab.icon size={16} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Contenido de las Pestañas (Scrollable) */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">

                            {/* --- TAB 1: DIMENSIONES --- */}
                            {activeTab === 'dims' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-200">
                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                                        <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Resolución Final</label>
                                        <div className="flex items-center gap-3">
                                            <input type="range" min="16" max="256" step="8" value={targetSize} onChange={(e) => setTargetSize(Number(e.target.value))} className="flex-1 accent-purple-500" />
                                            <span className="text-sm font-mono font-bold w-10 text-right">{targetSize}</span>
                                        </div>
                                        <div className="flex gap-1 mt-2">
                                            {[32, 64, 128].map(s => (
                                                <button key={s} onClick={() => setTargetSize(s)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-1 rounded text-slate-300">{s}px</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 p-2 text-center">
                                        Original: {imageSize.w}x{imageSize.h} <br />
                                        Resultado: {finalSize.w}x{finalSize.h}
                                    </div>
                                </div>
                            )}

                            {/* --- TAB 2: COLOR --- */}
                            {activeTab === 'color' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-200">
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-xs text-slate-400 mb-1"><span>Brillo</span> <span>{brightness}</span></div>
                                            <input type="range" min="-50" max="50" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full accent-yellow-500 h-1 bg-slate-700 rounded appearance-none" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs text-slate-400 mb-1"><span>Contraste</span> <span>{contrast}</span></div>
                                            <input type="range" min="-50" max="50" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full accent-blue-500 h-1 bg-slate-700 rounded appearance-none" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs text-slate-400 mb-1"><span>Saturación</span> <span>{saturation}%</span></div>
                                            <input type="range" min="-100" max="100" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className="w-full accent-pink-500 h-1 bg-slate-700 rounded appearance-none" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- TAB 3: PALETA --- */}
                            {activeTab === 'palette' && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-left-2 duration-200">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Estilo (Preset)</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(PRESETS).map(([key, p]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => setPaletteMode(key)}
                                                    className={`text-[10px] py-2 px-2 rounded border transition-all ${paletteMode === key ? 'bg-purple-600 border-purple-400 text-white shadow' : 'bg-slate-700 border-transparent text-slate-400 hover:bg-slate-600'}`}
                                                >
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {paletteMode === 'auto' && (
                                        <div>
                                            <div className="flex justify-between text-xs text-slate-400 mb-1"><span>Colores Max</span> <span>{colorCount}</span></div>
                                            <input type="range" min="2" max="64" value={colorCount} onChange={(e) => setColorCount(Number(e.target.value))} className="w-full accent-pink-500 h-1 bg-slate-700 rounded appearance-none" />
                                        </div>
                                    )}

                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                                        <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer mb-2">
                                            <div className="flex items-center gap-2"><ScanLine size={14} /> Dithering (Tramado)</div>
                                            <input type="checkbox" checked={useDithering} onChange={(e) => setUseDithering(e.target.checked)} className="rounded border-slate-600 bg-slate-800 text-purple-500" />
                                        </label>
                                        {useDithering && (
                                            <input type="range" min="0.1" max="1" step="0.1" value={ditherStrength} onChange={(e) => setDitherStrength(Number(e.target.value))} className="w-full accent-slate-400 h-1 bg-slate-700 rounded appearance-none" />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* --- TAB 4: FX --- */}
                            {activeTab === 'fx' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-200">
                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-700 space-y-3">
                                        <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                                            <div className="flex items-center gap-2"><Sparkles size={14} className="text-yellow-400" /> Limpiar Ruido</div>
                                            <input type="checkbox" checked={removeOrphans} onChange={(e) => setRemoveOrphans(e.target.checked)} />
                                        </label>
                                    </div>

                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-700 space-y-3">
                                        <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                                            <div className="flex items-center gap-2"><PaintBucket size={14} className="text-green-400" /> Contorno</div>
                                            <input type="checkbox" checked={addOutline} onChange={(e) => setAddOutline(e.target.checked)} />
                                        </label>
                                        {addOutline && (
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-500">Color Borde</span>
                                                <input type="color" value={outlineColor} onChange={(e) => setOutlineColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                                        <div className="flex justify-between text-xs text-slate-400 mb-1"><span>Añadir Ruido (Textura)</span> <span>{(noise * 100).toFixed(0)}%</span></div>
                                        <input type="range" min="0" max="0.5" step="0.01" value={noise} onChange={(e) => setNoise(Number(e.target.value))} className="w-full accent-slate-400 h-1 bg-slate-700 rounded appearance-none" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer del Sidebar */}
                        <div className="p-4 border-t border-slate-700 bg-slate-900/50 space-y-2">
                            <button onClick={downloadImage} className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 text-white rounded font-bold shadow-lg flex items-center justify-center gap-2 text-sm transition-transform active:scale-95">
                                <Download size={16} /> Exportar PNG
                            </button>
                            <button onClick={() => setOriginalImage(null)} className="w-full py-1 text-xs text-slate-500 hover:text-red-400">
                                Cerrar Imagen
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* === COLUMNA DERECHA: VISUALIZADOR (Flexible) === */}
            <div className="lg:col-span-9 bg-slate-900 rounded-xl border border-slate-700 shadow-xl flex flex-col relative overflow-hidden">
                {!originalImage ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-2 opacity-50">
                        <ImageIcon size={64} />
                        <p className="font-medium">Esperando imagen...</p>
                    </div>
                ) : (
                    <>
                        {/* Toolbar del Canvas */}
                        <div className="flex justify-between items-center bg-slate-800 p-2 border-b border-slate-700 z-10 shadow-sm">
                            {/* Controles de Zoom */}
                            <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
                                <button onClick={() => setPreviewZoom(z => Math.max(0.1, z - 0.5))} className="p-1.5 hover:bg-slate-600 rounded text-slate-300"><ZoomOut size={14} /></button>
                                <span className="text-xs font-mono w-12 text-center text-white">{previewZoom.toFixed(1)}x</span>
                                <button onClick={() => setPreviewZoom(z => Math.min(20, z + 0.5))} className="p-1.5 hover:bg-slate-600 rounded text-slate-300"><ZoomIn size={14} /></button>
                                <div className="w-px h-4 bg-slate-600 mx-1"></div>
                                <button onClick={() => setFitMode(!fitMode)} className={`p-1.5 rounded transition-colors ${fitMode ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`} title={fitMode ? "Ajustar a Ventana" : "Tamaño Real (Scroll)"}>
                                    <Move size={14} />
                                </button>
                            </div>

                            {/* Slider Comparador */}
                            <div className="flex-1 max-w-md mx-4 flex items-center gap-3 bg-slate-950/50 px-3 py-1 rounded-full border border-slate-700">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Original</span>
                                <input
                                    type="range" min="0" max="100" value={comparePos}
                                    onChange={(e) => setComparePos(Number(e.target.value))}
                                    className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-ew-resize accent-white hover:accent-purple-400"
                                />
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Pixel</span>
                            </div>

                            <button onClick={() => setRegenerateTrigger(p => p + 1)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors" title="Refrescar">
                                <Play size={16} />
                            </button>
                        </div>

                        {/* AREA DEL CANVAS (SCROLLABLE) */}
                        <div className={`flex-1 overflow-auto bg-slate-950 checkerboard-bg relative flex ${fitMode ? 'items-center justify-center' : ''} custom-scrollbar`}>

                            {/* Wrapper que define el tamaño total */}
                            <div
                                className="relative origin-top-left transition-transform duration-100 ease-out m-auto p-10"
                                style={{
                                    width: fitMode ? 'auto' : finalSize.w * previewZoom + 80, // +80 para margen
                                    height: fitMode ? 'auto' : finalSize.h * previewZoom + 80,
                                    transform: fitMode ? `scale(${Math.min(1, 800 / finalSize.w)})` : 'none', // Simple fit logic
                                }}
                            >
                                {/* Contenedor de Imágenes Centrado */}
                                <div
                                    className="relative shadow-2xl shadow-black bg-black"
                                    style={{
                                        width: finalSize.w * (fitMode ? 1 : previewZoom),
                                        height: finalSize.h * (fitMode ? 1 : previewZoom),
                                        margin: '0 auto' // Centrar en el wrapper
                                    }}
                                >
                                    {/* IMAGEN A (FONDO) - ORIGINAL */}
                                    <img
                                        src={originalImage.src}
                                        alt="original"
                                        className="absolute top-0 left-0 w-full h-full object-contain pixelated opacity-40 grayscale"
                                        style={{ imageRendering: 'pixelated' }}
                                        draggable={false}
                                    />

                                    {/* IMAGEN B (SUPERIOR) - PIXEL ART */}
                                    <div
                                        className="absolute top-0 left-0 w-full h-full bg-slate-950 checkerboard-bg"
                                        style={{
                                            clipPath: `inset(0 0 0 ${100 - comparePos}%)`,
                                            transition: 'clip-path 0.05s linear'
                                        }}
                                    >
                                        <canvas
                                            ref={canvasRef}
                                            className="w-full h-full pixelated block"
                                            style={{ imageRendering: 'pixelated' }}
                                        />
                                    </div>

                                    {/* LÍNEA DIVISORIA */}
                                    <div
                                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_15px_rgba(0,0,0,0.8)] pointer-events-none z-20"
                                        style={{ left: `${100 - comparePos}%` }}
                                    >
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-1.5 shadow-xl">
                                            <ArrowLeftRight size={14} className="text-black" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Overlay de Procesando */}
                        {isProcessing && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                                <div className="bg-slate-900 border border-purple-500/50 px-6 py-3 rounded-full text-purple-200 text-sm font-bold flex items-center gap-3 shadow-2xl animate-pulse">
                                    <Sparkles size={16} className="animate-spin" /> Procesando Píxeles...
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PixelScaler;