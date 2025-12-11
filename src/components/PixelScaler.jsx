import React, { useState, useRef, useEffect } from 'react';
import {
    Upload, Download, Image as ImageIcon, ZoomIn, ZoomOut, Play,
    Palette, Sparkles, Sun, Sliders, Monitor, PaintBucket,
    ScanLine, ArrowLeftRight, Move, Loader2, Save, FolderOpen, Trash2,
    BoxSelect, Eye, ListFilter, Pencil, Eraser, Pipette, Plus, MousePointer2
} from 'lucide-react';

// === PRESETS DE PALETA ===
const DEFAULT_PRESETS = {
    gb: { name: 'GameBoy', colors: [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]] },
    nes: { name: 'NES', colors: [[124, 124, 124], [0, 0, 252], [0, 0, 188], [68, 40, 188], [148, 0, 132], [168, 0, 32], [168, 16, 0], [136, 20, 0], [80, 48, 0], [0, 120, 0], [0, 104, 0], [0, 88, 0], [0, 64, 88], [0, 0, 0], [188, 188, 188], [0, 120, 248], [0, 88, 248], [104, 68, 252], [216, 0, 204], [228, 0, 88], [248, 56, 0], [228, 92, 16], [172, 124, 0], [0, 184, 0], [0, 168, 0], [0, 168, 68], [0, 136, 136], [248, 248, 248], [60, 188, 252], [104, 136, 252], [152, 120, 248], [248, 120, 248], [248, 88, 152], [248, 120, 88], [252, 160, 68], [248, 184, 0], [184, 248, 24], [88, 216, 84], [88, 248, 152], [0, 232, 216], [120, 120, 120], [252, 252, 252], [164, 228, 252], [184, 184, 248], [216, 184, 248], [248, 184, 248], [248, 164, 192], [240, 208, 176], [252, 224, 168], [248, 216, 120], [216, 248, 120], [184, 248, 184], [184, 248, 216], [0, 252, 252], [248, 216, 248], [0, 0, 0]] },
    pico8: { name: 'Pico-8', colors: [[0, 0, 0], [29, 43, 83], [126, 37, 83], [0, 135, 81], [171, 82, 54], [95, 87, 79], [194, 195, 199], [255, 241, 232], [255, 0, 77], [255, 163, 0], [255, 236, 39], [0, 228, 54], [41, 173, 255], [131, 118, 156], [255, 119, 168], [255, 204, 170]] },
    bw: { name: '1-Bit (B&N)', colors: [[0, 0, 0], [255, 255, 255]] },
    c64: { name: 'C64', colors: [[0, 0, 0], [255, 255, 255], [136, 0, 0], [170, 255, 238], [204, 68, 204], [0, 204, 85], [0, 0, 170], [238, 238, 119], [221, 136, 85], [102, 68, 0], [255, 119, 119], [51, 51, 51], [119, 119, 119], [170, 255, 102], [0, 136, 255], [187, 187, 187]] },
};

const CHANNEL_RANGES = {
    red: { min: 345, max: 15, label: 'Rojos', color: '#ef4444' },
    orange: { min: 15, max: 45, label: 'Naranjas', color: '#f97316' },
    yellow: { min: 45, max: 75, label: 'Amarillos', color: '#eab308' },
    green: { min: 75, max: 165, label: 'Verdes', color: '#22c55e' },
    cyan: { min: 165, max: 195, label: 'Cyan', color: '#06b6d4' },
    blue: { min: 195, max: 255, label: 'Azules', color: '#3b82f6' },
    purple: { min: 255, max: 285, label: 'Morados', color: '#a855f7' },
    magenta: { min: 285, max: 345, label: 'Magentas', color: '#ec4899' },
};

const PixelScaler = () => {
    // === ESTADOS UI ===
    const [activeTab, setActiveTab] = useState('dims');
    const [originalImage, setOriginalImage] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [previewZoom, setPreviewZoom] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [comparePos, setComparePos] = useState(50);
    const [regenerateTrigger, setRegenerateTrigger] = useState(0);
    const [fitMode, setFitMode] = useState(false);

    // === PARÁMETROS DE EDICIÓN ===
    const [targetSize, setTargetSize] = useState(64);
    const [brightness, setBrightness] = useState(0);
    const [contrast, setContrast] = useState(0);
    const [saturation, setSaturation] = useState(0);
    const [preNoise, setPreNoise] = useState(0);

    const [channels, setChannels] = useState({
        red: { s: 0, l: 0 }, orange: { s: 0, l: 0 }, yellow: { s: 0, l: 0 },
        green: { s: 0, l: 0 }, cyan: { s: 0, l: 0 }, blue: { s: 0, l: 0 },
        purple: { s: 0, l: 0 }, magenta: { s: 0, l: 0 }
    });

    // Paletas
    const [paletteMode, setPaletteMode] = useState('auto');
    const [colorCount, setColorCount] = useState(32);
    const [customPalettes, setCustomPalettes] = useState(() => {
        const saved = localStorage.getItem('pixelForge_customPalettes');
        return saved ? JSON.parse(saved) : {};
    });
    const [currentPaletteDisplay, setCurrentPaletteDisplay] = useState([]);

    // FX & Post-Proceso
    const [useDithering, setUseDithering] = useState(false);
    const [ditherStrength, setDitherStrength] = useState(0.8);
    const [removeOrphans, setRemoveOrphans] = useState(false);
    const [addOutline, setAddOutline] = useState(false);
    const [outlineColor, setOutlineColor] = useState('#ffffff');
    const [roughness, setRoughness] = useState(0);

    // === ESTADOS DEL EDITOR MANUAL (NUEVO) ===
    const [manualEdits, setManualEdits] = useState({}); // Mapa { "x,y": [r,g,b,a] }
    const [activeTool, setActiveTool] = useState('brush'); // brush, eraser, eyedropper
    const [brushColor, setBrushColor] = useState('#ffffff');
    const [isPainting, setIsPainting] = useState(false);

    // === ESTADOS INTERNOS ===
    const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
    const [finalSize, setFinalSize] = useState({ w: 0, h: 0 });
    const canvasRef = useRef(null);
    const lastCalculatedPaletteRef = useRef([]);

    // --- PERSISTENCIA ---
    useEffect(() => {
        localStorage.setItem('pixelForge_customPalettes', JSON.stringify(customPalettes));
    }, [customPalettes]);

    // --- CARGA DE ARCHIVOS (IMAGEN O JSON) ---
    const handleGlobalDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (!file) return;

        if (file.name.toLowerCase().endsWith('.json')) {
            // Importar Paleta
            importPalette({ target: { files: [file] } });
        } else if (file.type.startsWith('image/')) {
            // Cargar Imagen
            processImage(file);
        }
    };

    const processImage = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                setImageSize({ w: img.width, h: img.height });
                setOriginalImage(img);
                setManualEdits({}); // Reset edits on new image
                // Reset Adjustments
                setBrightness(0); setContrast(0); setSaturation(0); setPreNoise(0); setRoughness(0);
                setChannels({
                    red: { s: 0, l: 0 }, orange: { s: 0, l: 0 }, yellow: { s: 0, l: 0 },
                    green: { s: 0, l: 0 }, cyan: { s: 0, l: 0 }, blue: { s: 0, l: 0 },
                    purple: { s: 0, l: 0 }, magenta: { s: 0, l: 0 }
                });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };
    const handleImageUpload = (e) => processImage(e.target.files[0]);

    // --- GESTIÓN DE PALETAS ---
    const saveCurrentPalette = () => {
        const name = prompt("Nombre para la nueva paleta:", "Mi Paleta " + (Object.keys(customPalettes).length + 1));
        if (!name) return;
        const colorsToSave = lastCalculatedPaletteRef.current;
        if (!colorsToSave || colorsToSave.length === 0) { alert("No hay colores para guardar."); return; }

        const id = 'custom_' + Date.now();
        const newPalette = { name, colors: colorsToSave };
        setCustomPalettes(prev => ({ ...prev, [id]: newPalette }));
        setPaletteMode(id);
    };

    const addColorToCustomPalette = () => {
        if (!customPalettes[paletteMode]) {
            if (confirm("Estás en modo Auto/Preset. ¿Quieres guardar esta paleta como Personalizada para poder editarla?")) {
                saveCurrentPalette();
            }
            return;
        }

        const newColor = [255, 255, 255]; // Blanco por defecto
        const updatedPalette = {
            ...customPalettes[paletteMode],
            colors: [...customPalettes[paletteMode].colors, newColor]
        };
        setCustomPalettes(prev => ({ ...prev, [paletteMode]: updatedPalette }));
    };

    const updateColorInPalette = (index, newHex) => {
        if (!customPalettes[paletteMode]) return;
        const rgb = hexToRgb(newHex);
        const updatedColors = [...customPalettes[paletteMode].colors];
        updatedColors[index] = rgb;

        setCustomPalettes(prev => ({
            ...prev,
            [paletteMode]: { ...prev[paletteMode], colors: updatedColors }
        }));
    };

    const exportPalette = () => {
        const colors = lastCalculatedPaletteRef.current;
        if (!colors.length) return alert("No hay paleta generada");
        const hexList = colors.map(c => rgbToHex(c[0], c[1], c[2]));
        const data = { name: "PixelForge Export", colors: hexList, description: "Generado con PixelForge Studio" };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `palette_${Date.now()}.json`;
        link.click();
    };

    const deletePalette = (id) => {
        if (confirm("¿Eliminar esta paleta?")) {
            const newPals = { ...customPalettes };
            delete newPals[id];
            setCustomPalettes(newPals);
            setPaletteMode('auto');
        }
    };

    const importPalette = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target.result;
            const hexRegex = /#([0-9a-fA-F]{3,6})\b/g;
            const matches = [...text.matchAll(hexRegex)];

            if (matches.length > 0) {
                const colors = matches.map(m => {
                    let hex = m[1];
                    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                    return hexToRgb('#' + hex);
                });
                const uniqueColors = [];
                const seen = new Set();
                colors.forEach(c => {
                    const k = c.join(',');
                    if (!seen.has(k)) { seen.add(k); uniqueColors.push(c); }
                });

                const id = 'custom_' + Date.now();
                setCustomPalettes(prev => ({ ...prev, [id]: { name: file.name.split('.')[0], colors: uniqueColors } }));
                setPaletteMode(id);
            } else { alert("Formato no reconocido."); }
        };
        reader.readAsText(file);
    };

    // --- INTERACCIÓN CON EL CANVAS (PINTAR) ---
    const handlePointerDown = (e) => {
        if (activeTab !== 'editor' || !originalImage) return;
        setIsPainting(true);
        paintAt(e);
    };

    const handlePointerMove = (e) => {
        if (!isPainting || activeTab !== 'editor') return;
        paintAt(e);
    };

    const handlePointerUp = () => {
        setIsPainting(false);
    };

    const paintAt = (e) => {
        if (!canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        // Calcular coordenadas relativas al canvas visual
        const x = Math.floor((e.clientX - rect.left) / (rect.width / finalSize.w));
        const y = Math.floor((e.clientY - rect.top) / (rect.height / finalSize.h));

        if (x >= 0 && x < finalSize.w && y >= 0 && y < finalSize.h) {
            const key = `${x},${y}`;

            if (activeTool === 'brush') {
                const rgb = hexToRgb(brushColor);
                setManualEdits(prev => ({ ...prev, [key]: [...rgb, 255] }));
            } else if (activeTool === 'eraser') {
                // En eraser, eliminamos del mapa de edits para restaurar el pixel generado original
                // O si queremos borrar a transparente:
                // setManualEdits(prev => ({ ...prev, [key]: [0,0,0,0] }));

                // Aquí asumo que borrar significa "quitar mi edición manual"
                const newEdits = { ...manualEdits };
                delete newEdits[key];
                setManualEdits(newEdits);
            } else if (activeTool === 'eyedropper') {
                // Leer color del canvas
                const ctx = canvasRef.current.getContext('2d');
                const p = ctx.getImageData(x, y, 1, 1).data;
                const hex = rgbToHex(p[0], p[1], p[2]);
                setBrushColor(hex);
                setActiveTool('brush'); // Auto switch back to brush
                setIsPainting(false);
            }
        }
    };


    // --- HELPER FUNCIONES ---
    const rgbToHsl = (r, g, b) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h *= 60;
        }
        return [h, s, l];
    };

    const hslToRgb = (h, s, l) => {
        let r, g, b;
        if (s === 0) { r = g = b = l; } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1; if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            }
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h / 360 + 1 / 3);
            g = hue2rgb(p, q, h / 360);
            b = hue2rgb(p, q, h / 360 - 1 / 3);
        }
        return [r * 255, g * 255, b * 255];
    };

    const hexToRgb = (hex) => {
        const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [0, 0, 0];
    };

    const rgbToHex = (r, g, b) => "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    const getDistanceSq = (c1, c2) => (c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2;

    // --- LÓGICA DE PROCESAMIENTO (RENDER PIPELINE) ---
    const applyColorGrading = (ctx, w, h) => {
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const channelsActive = Object.values(channels).some(c => c.s !== 0 || c.l !== 0);

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i]; let g = data[i + 1]; let b = data[i + 2];

            // Global
            r += brightness; g += brightness; b += brightness;
            r = contrastFactor * (r - 128) + 128;
            g = contrastFactor * (g - 128) + 128;
            b = contrastFactor * (b - 128) + 128;

            if (saturation !== 0) {
                const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
                const satMult = 1 + (saturation / 100);
                r = gray + (r - gray) * satMult;
                g = gray + (g - gray) * satMult;
                b = gray + (b - gray) * satMult;
            }

            // Canales (HSL)
            if (channelsActive) {
                let [hue, sat, lum] = rgbToHsl(r, g, b);
                let target = null;
                if (hue >= 345 || hue < 15) target = channels.red;
                else if (hue >= 15 && hue < 45) target = channels.orange;
                else if (hue >= 45 && hue < 75) target = channels.yellow;
                else if (hue >= 75 && hue < 165) target = channels.green;
                else if (hue >= 165 && hue < 195) target = channels.cyan;
                else if (hue >= 195 && hue < 255) target = channels.blue;
                else if (hue >= 255 && hue < 285) target = channels.purple;
                else if (hue >= 285 && hue < 345) target = channels.magenta;

                if (target && (target.s !== 0 || target.l !== 0)) {
                    sat = Math.max(0, Math.min(1, sat * (1 + target.s / 100)));
                    lum = Math.max(0, Math.min(1, lum * (1 + target.l / 100)));
                    const rgb = hslToRgb(hue, sat, lum);
                    r = rgb[0]; g = rgb[1]; b = rgb[2];
                }
            }

            if (preNoise > 0) {
                const n = (Math.random() - 0.5) * preNoise * 255;
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
                distribute(i + 4, 7 / 16); distribute(i + w * 4 - 4, 3 / 16); distribute(i + w * 4, 5 / 16); distribute(i + w * 4 + 4, 1 / 16);
            }
        }
        return imageData;
    };

    const applyRoughness = (imageData, strength) => {
        const data = imageData.data;
        const range = strength * 150;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 128) continue;
            const noise = (Math.random() - 0.5) * range;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
        }
        return imageData;
    };

    const applyManualEdits = (imageData) => {
        // Aplica los pixeles pintados manualmente
        const data = imageData.data;
        const w = imageData.width;

        Object.entries(manualEdits).forEach(([key, color]) => {
            const [xStr, yStr] = key.split(',');
            const x = parseInt(xStr);
            const y = parseInt(yStr);

            if (x >= 0 && x < w && y >= 0 && y < imageData.height) {
                const idx = (y * w + x) * 4;
                data[idx] = color[0];
                data[idx + 1] = color[1];
                data[idx + 2] = color[2];
                data[idx + 3] = color[3];
            }
        });
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
            ctx.drawImage(originalImage, 0, 0, newW, newH);

            applyColorGrading(ctx, newW, newH);

            let imgData = ctx.getImageData(0, 0, newW, newH);

            // Determinar Paleta
            let activePalette = [];
            if (paletteMode === 'auto') {
                activePalette = generatePalette(imgData, colorCount);
            } else if (customPalettes[paletteMode]) {
                activePalette = customPalettes[paletteMode].colors;
            } else if (DEFAULT_PRESETS[paletteMode]) {
                activePalette = DEFAULT_PRESETS[paletteMode].colors;
            } else {
                activePalette = generatePalette(imgData, colorCount);
            }
            lastCalculatedPaletteRef.current = activePalette;
            setCurrentPaletteDisplay(activePalette);

            // Pipeline
            imgData = applyQuantization(imgData, activePalette);
            if (removeOrphans) imgData = cleanOrphans(imgData);
            if (roughness > 0) imgData = applyRoughness(imgData, roughness);

            // APLICAR EDICIÓN MANUAL (Encima de todo lo generado)
            imgData = applyManualEdits(imgData);

            if (addOutline) imgData = generateOutline(imgData, outlineColor);

            ctx.putImageData(imgData, 0, 0);
            setIsProcessing(false);
        }, 20);
    }, [originalImage, targetSize, colorCount, paletteMode, customPalettes, useDithering, ditherStrength, removeOrphans, brightness, contrast, saturation, preNoise, roughness, addOutline, outlineColor, regenerateTrigger, channels, manualEdits]);

    const downloadImage = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = `pixelforge_${finalSize.w}x${finalSize.h}.png`;
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
    };

    return (
        <div
            className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] animate-fade-in"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={handleGlobalDrop}
        >
            {/* Overlay Drag & Drop */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-purple-900/90 flex flex-col items-center justify-center text-white backdrop-blur-sm rounded-xl">
                    <FolderOpen size={64} className="mb-4 animate-bounce" />
                    <p className="text-xl font-bold">Suelta aquí tu archivo</p>
                    <p className="text-sm opacity-70">Soporta Imágenes y Paletas (.json, .hex)</p>
                </div>
            )}

            {/* === COLUMNA IZQUIERDA === */}
            <div className="lg:col-span-3 bg-slate-800 rounded-xl border border-slate-700 shadow-xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-900/50">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sliders size={16} className="text-purple-400" /> Editor
                    </h2>
                </div>
                {!originalImage && (
                    <div className="p-6 flex flex-col items-center justify-center flex-1">
                        <div className="w-full border-2 border-dashed border-slate-600 rounded-lg p-8 text-center">
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="up" />
                            <label htmlFor="up" className="cursor-pointer flex flex-col items-center gap-2">
                                <Upload size={32} className="text-slate-400" />
                                <span className="text-sm text-slate-300 font-bold">Abrir Imagen</span>
                            </label>
                        </div>
                    </div>
                )}
                {originalImage && (
                    <>
                        <div className="flex border-b border-slate-700 bg-slate-800 overflow-x-auto">
                            {[
                                { id: 'dims', icon: Monitor, label: 'Tam' },
                                { id: 'editor', icon: Pencil, label: 'Pintar' }, // NUEVO TAB
                                { id: 'color', icon: Sun, label: 'Color' },
                                { id: 'channels', icon: ListFilter, label: 'Canal' },
                                { id: 'palette', icon: Palette, label: 'Paleta' },
                                { id: 'fx', icon: Sparkles, label: 'FX' },
                            ].map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 min-w-[50px] py-3 flex flex-col items-center gap-1 text-[10px] uppercase font-bold transition-colors border-b-2 ${activeTab === tab.id ? 'border-purple-500 text-purple-400 bg-slate-700/50' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-700/30'}`}>
                                    <tab.icon size={16} /> {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">

                            {/* DIMS TAB */}
                            {activeTab === 'dims' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                                        <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Resolución Final</label>
                                        <div className="flex items-center gap-3">
                                            <input type="range" min="16" max="256" step="8" value={targetSize} onChange={(e) => setTargetSize(Number(e.target.value))} className="flex-1 accent-purple-500" />
                                            <span className="text-sm font-mono font-bold w-10 text-right">{targetSize}</span>
                                        </div>
                                        <div className="flex gap-1 mt-2">
                                            {[32, 64, 128].map(s => <button key={s} onClick={() => setTargetSize(s)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-1 rounded text-slate-300">{s}px</button>)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* NUEVO TAB: EDITOR MANUAL */}
                            {activeTab === 'editor' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                                        <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Herramientas</label>
                                        <div className="flex gap-2">
                                            <button onClick={() => setActiveTool('brush')} className={`flex-1 p-2 rounded flex flex-col items-center gap-1 ${activeTool === 'brush' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                                <Pencil size={18} /> <span className="text-[10px]">Pincel</span>
                                            </button>
                                            <button onClick={() => setActiveTool('eraser')} className={`flex-1 p-2 rounded flex flex-col items-center gap-1 ${activeTool === 'eraser' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                                <Eraser size={18} /> <span className="text-[10px]">Borrar</span>
                                            </button>
                                            <button onClick={() => setActiveTool('eyedropper')} className={`flex-1 p-2 rounded flex flex-col items-center gap-1 ${activeTool === 'eyedropper' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                                <Pipette size={18} /> <span className="text-[10px]">Gotero</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                                        <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Color Actual</label>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded border border-white/20 shadow-inner" style={{ backgroundColor: brushColor }}></div>
                                            <input type="text" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="bg-slate-950 border border-slate-700 text-xs p-2 rounded w-24 text-white font-mono" />
                                            <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="w-8 h-8 p-0 bg-transparent border-none cursor-pointer" />
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-700 max-h-48 overflow-y-auto custom-scrollbar">
                                        <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Seleccionar de Paleta</label>
                                        <div className="flex flex-wrap gap-1">
                                            {currentPaletteDisplay.map((c, i) => {
                                                const hex = rgbToHex(c[0], c[1], c[2]);
                                                return (
                                                    <div
                                                        key={i}
                                                        onClick={() => setBrushColor(hex)}
                                                        className={`w-6 h-6 rounded-sm border cursor-pointer hover:scale-110 transition-transform ${brushColor === hex ? 'border-white ring-1 ring-purple-500' : 'border-white/10'}`}
                                                        style={{ backgroundColor: hex }}
                                                        title={hex}
                                                    ></div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button onClick={() => setManualEdits({})} className="w-full py-2 text-xs bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded border border-red-900/50">Limpiar Dibujo</button>
                                    </div>
                                </div>
                            )}

                            {/* COLOR TAB */}
                            {activeTab === 'color' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                                    <div className="space-y-4">
                                        <div><div className="flex justify-between text-xs text-slate-400 mb-1"><span>Brillo</span> <span>{brightness}</span></div><input type="range" min="-50" max="50" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full accent-yellow-500 h-1 bg-slate-700 rounded appearance-none" /></div>
                                        <div><div className="flex justify-between text-xs text-slate-400 mb-1"><span>Contraste</span> <span>{contrast}</span></div><input type="range" min="-50" max="50" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full accent-blue-500 h-1 bg-slate-700 rounded appearance-none" /></div>
                                        <div><div className="flex justify-between text-xs text-slate-400 mb-1"><span>Saturación (Global)</span> <span>{saturation}%</span></div><input type="range" min="-100" max="100" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className="w-full accent-pink-500 h-1 bg-slate-700 rounded appearance-none" /></div>
                                        <div><div className="flex justify-between text-xs text-slate-400 mb-1"><span>Ruido de Entrada</span> <span>{(preNoise * 100).toFixed(0)}%</span></div><input type="range" min="0" max="0.5" step="0.01" value={preNoise} onChange={(e) => setPreNoise(Number(e.target.value))} className="w-full accent-slate-400 h-1 bg-slate-700 rounded appearance-none" /></div>
                                    </div>
                                </div>
                            )}

                            {/* CHANNELS TAB */}
                            {activeTab === 'channels' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                                    <p className="text-[10px] text-slate-400 bg-slate-900/50 p-2 rounded">Ajusta saturación y luz de colores específicos.</p>
                                    {Object.entries(CHANNEL_RANGES).map(([key, info]) => (
                                        <div key={key} className="bg-slate-900/50 p-2 rounded border border-slate-700">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: info.color }}></div>
                                                <span className="text-xs font-bold text-slate-300 uppercase">{info.label}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><label className="text-[9px] text-slate-500 block mb-1">Sat</label><input type="range" min="-100" max="100" value={channels[key].s} onChange={(e) => setChannels(prev => ({ ...prev, [key]: { ...prev[key], s: Number(e.target.value) } }))} className="w-full h-1 bg-slate-700 rounded appearance-none accent-slate-400" /></div>
                                                <div><label className="text-[9px] text-slate-500 block mb-1">Luz</label><input type="range" min="-50" max="50" value={channels[key].l} onChange={(e) => setChannels(prev => ({ ...prev, [key]: { ...prev[key], l: Number(e.target.value) } }))} className="w-full h-1 bg-slate-700 rounded appearance-none accent-white" /></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* PALETTE TAB */}
                            {activeTab === 'palette' && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-left-2">

                                    {/* Editor de Paleta */}
                                    {customPalettes[paletteMode] ? (
                                        <div className="bg-purple-900/20 p-3 rounded border border-purple-500/30">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-xs font-bold text-purple-300 uppercase">Edición ({customPalettes[paletteMode].name})</label>
                                                <button onClick={addColorToCustomPalette} className="text-xs bg-purple-600 text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-purple-500"><Plus size={12} /> Color</button>
                                            </div>
                                            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scrollbar">
                                                {currentPaletteDisplay.map((c, i) => {
                                                    const hex = rgbToHex(c[0], c[1], c[2]);
                                                    return (
                                                        <div key={i} className="group relative w-6 h-6 rounded-sm border border-white/10 cursor-pointer">
                                                            <div className="w-full h-full" style={{ backgroundColor: hex }}></div>
                                                            <input
                                                                type="color"
                                                                value={hex}
                                                                onChange={(e) => updateColorInPalette(i, e.target.value)}
                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                                title="Clic para cambiar color"
                                                            />
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-900 p-2 rounded border border-slate-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase"><Eye size={10} /> Visualizador</label>
                                                <button onClick={saveCurrentPalette} className="text-[10px] text-purple-400 hover:text-white underline">Guardar para Editar</button>
                                            </div>
                                            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scrollbar">
                                                {currentPaletteDisplay.map((c, i) => (<div key={i} className="w-4 h-4 rounded-sm border border-white/10" style={{ backgroundColor: `rgb(${c[0]},${c[1]},${c[2]})` }}></div>))}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Modo</label>
                                        <button onClick={() => setPaletteMode('auto')} className={`w-full text-xs py-2 px-2 rounded border mb-2 transition-all ${paletteMode === 'auto' ? 'bg-purple-600 border-purple-400 text-white font-bold' : 'bg-slate-700 border-slate-600 text-slate-300'}`}>✨ Auto (Inteligente)</button>
                                        {paletteMode === 'auto' && <div className="mb-4"><div className="flex justify-between text-xs text-slate-400 mb-1"><span>Colores Max</span> <span>{colorCount}</span></div><input type="range" min="2" max="64" value={colorCount} onChange={(e) => setColorCount(Number(e.target.value))} className="w-full accent-pink-500 h-1 bg-slate-700 rounded appearance-none" /></div>}
                                    </div>

                                    {Object.keys(customPalettes).length > 0 && (
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">Mis Paletas</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {Object.entries(customPalettes).map(([key, p]) => (
                                                    <div key={key} className="relative group">
                                                        <button onClick={() => setPaletteMode(key)} className={`w-full text-[10px] py-2 px-2 rounded border truncate text-left ${paletteMode === key ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-700 border-transparent text-slate-400 hover:bg-slate-600'}`}>{p.name}</button>
                                                        <button onClick={() => deletePalette(key)} className="absolute right-1 top-1.5 text-slate-400 hover:text-red-400 hidden group-hover:block bg-slate-800 rounded p-0.5"><Trash2 size={10} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-1 pt-2 border-t border-slate-700">
                                        <button onClick={saveCurrentPalette} className="flex-1 bg-slate-700 hover:bg-purple-600 text-[10px] text-white py-2 rounded flex flex-col items-center gap-1"><Save size={14} /> Guardar</button>
                                        <button onClick={exportPalette} className="flex-1 bg-slate-700 hover:bg-green-600 text-[10px] text-white py-2 rounded flex flex-col items-center gap-1"><Download size={14} /> Exportar</button>
                                        <label className="flex-1 bg-slate-700 hover:bg-blue-600 text-[10px] text-white py-2 rounded flex flex-col items-center gap-1 cursor-pointer"><FolderOpen size={14} /> Importar<input type="file" accept=".json,.txt,.hex" onChange={importPalette} className="hidden" /></label>
                                    </div>

                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-700 mt-2">
                                        <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer mb-2"><div className="flex items-center gap-2"><ScanLine size={14} /> Dithering</div><input type="checkbox" checked={useDithering} onChange={(e) => setUseDithering(e.target.checked)} className="rounded border-slate-600 bg-slate-800 text-purple-500" /></label>
                                        {useDithering && <input type="range" min="0.1" max="1" step="0.1" value={ditherStrength} onChange={(e) => setDitherStrength(Number(e.target.value))} className="w-full accent-slate-400 h-1 bg-slate-700 rounded appearance-none" />}
                                    </div>
                                </div>
                            )}

                            {/* FX TAB */}
                            {activeTab === 'fx' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                                        <div className="flex justify-between text-xs text-slate-400 mb-1 flex items-center"><span className="flex items-center gap-2 text-white font-bold"><BoxSelect size={14} className="text-orange-400" /> Rugosidad</span> <span>{(roughness * 100).toFixed(0)}%</span></div>
                                        <input type="range" min="0" max="0.5" step="0.01" value={roughness} onChange={(e) => setRoughness(Number(e.target.value))} className="w-full accent-orange-500 h-1 bg-slate-700 rounded appearance-none" />
                                    </div>
                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-700 space-y-3">
                                        <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer"><div className="flex items-center gap-2"><Sparkles size={14} className="text-yellow-400" /> Limpiar Ruido</div><input type="checkbox" checked={removeOrphans} onChange={(e) => setRemoveOrphans(e.target.checked)} /></label>
                                    </div>
                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-700 space-y-3">
                                        <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer"><div className="flex items-center gap-2"><PaintBucket size={14} className="text-green-400" /> Contorno</div><input type="checkbox" checked={addOutline} onChange={(e) => setAddOutline(e.target.checked)} /></label>
                                        {addOutline && <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Color Borde</span><input type="color" value={outlineColor} onChange={(e) => setOutlineColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0" /></div>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-700 bg-slate-900/50 space-y-2">
                            <button onClick={downloadImage} className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 text-white rounded font-bold shadow-lg flex items-center justify-center gap-2 text-sm transition-transform active:scale-95"><Download size={16} /> Exportar PNG</button>
                            <button onClick={() => setOriginalImage(null)} className="w-full py-1 text-xs text-slate-500 hover:text-red-400">Cerrar Imagen</button>
                        </div>
                    </>
                )}
            </div>

            {/* === COLUMNA DERECHA === */}
            <div className="lg:col-span-9 bg-slate-900 rounded-xl border border-slate-700 shadow-xl flex flex-col relative overflow-hidden">
                {!originalImage ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-2 opacity-50"><ImageIcon size={64} /><p className="font-medium">Esperando imagen...</p></div>
                ) : (
                    <>
                        <div className="flex justify-between items-center bg-slate-800 p-2 border-b border-slate-700 z-10 shadow-sm">
                            <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
                                <button onClick={() => setPreviewZoom(z => Math.max(0.1, z - 0.5))} className="p-1.5 hover:bg-slate-600 rounded text-slate-300"><ZoomOut size={14} /></button>
                                <span className="text-xs font-mono w-12 text-center text-white">{previewZoom.toFixed(1)}x</span>
                                <button onClick={() => setPreviewZoom(z => Math.min(20, z + 0.5))} className="p-1.5 hover:bg-slate-600 rounded text-slate-300"><ZoomIn size={14} /></button>
                                <div className="w-px h-4 bg-slate-600 mx-1"></div>
                                <button onClick={() => setFitMode(!fitMode)} className={`p-1.5 rounded transition-colors ${fitMode ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`} title={fitMode ? "Ajustar a Ventana" : "Tamaño Real (Scroll)"}><Move size={14} /></button>
                            </div>
                            {/* Mensaje de Herramienta Activa */}
                            {activeTab === 'editor' && (
                                <div className="flex items-center gap-2 bg-purple-900/30 px-3 py-1 rounded-full border border-purple-500/30">
                                    <MousePointer2 size={12} className="text-purple-400" />
                                    <span className="text-xs text-purple-200 font-bold uppercase tracking-wider">
                                        {activeTool === 'brush' ? 'Pincel' : activeTool === 'eraser' ? 'Borrador' : 'Gotero'}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                {isProcessing && (<div className="flex items-center gap-2 px-3 py-1 bg-slate-900/80 border border-purple-500/30 rounded-lg animate-in fade-in zoom-in duration-200"><Loader2 size={14} className="animate-spin text-purple-400" /><span className="text-[10px] text-purple-200 font-medium">Procesando...</span></div>)}
                                <button onClick={() => setRegenerateTrigger(p => p + 1)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors" title="Refrescar"><Play size={16} /></button>
                            </div>
                        </div>

                        {/* AREA DEL CANVAS INTERACTIVA */}
                        <div
                            className={`flex-1 overflow-auto bg-slate-950 checkerboard-bg relative flex ${fitMode ? 'items-center justify-center' : ''} custom-scrollbar cursor-crosshair`}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                        >
                            <div className="relative origin-top-left transition-transform duration-100 ease-out m-auto p-10" style={{ width: fitMode ? 'auto' : finalSize.w * previewZoom + 80, height: fitMode ? 'auto' : finalSize.h * previewZoom + 80, transform: fitMode ? `scale(${Math.min(1, 800 / finalSize.w)})` : 'none' }}>
                                <div className="relative shadow-2xl shadow-black bg-black" style={{ width: finalSize.w * (fitMode ? 1 : previewZoom), height: finalSize.h * (fitMode ? 1 : previewZoom), margin: '0 auto' }}>
                                    {/* Fondo Original (oculto si pintamos encima) */}
                                    <img src={originalImage.src} alt="original" className="absolute top-0 left-0 w-full h-full object-contain pixelated opacity-20 grayscale pointer-events-none" style={{ imageRendering: 'pixelated' }} draggable={false} />

                                    {/* Canvas Principal */}
                                    <canvas ref={canvasRef} className="w-full h-full pixelated block relative z-10" style={{ imageRendering: 'pixelated' }} />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PixelScaler;