// src/components/TextureAtlasGenerator.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
    Upload, Download, Save, FolderOpen,
    ZoomIn, ZoomOut, Grid, Trash2,
    Move, X, CheckSquare, Square, Settings
} from 'lucide-react';

const TextureAtlasGenerator = () => {
    const [atlasSize, setAtlasSize] = useState({ w: 512, h: 512 });
    const [textures, setTextures] = useState([]);
    const [zoom, setZoom] = useState(1);
    const [isDraggingFiles, setIsDraggingFiles] = useState(false);

    const [tileSize, setTileSize] = useState({ w: 16, h: 16 });
    const [padding, setPadding] = useState(0);
    const [useGrid, setUseGrid] = useState(true);
    const [draggedTextureId, setDraggedTextureId] = useState(null);

    const canvasRef = useRef(null);
    const canvasContainerRef = useRef(null);

    useEffect(() => {
        drawAtlas();
        if (textures.length > 0) {
            const adjustCanvasSize = () => {
                let maxW = 0;
                let maxH = 0;
                textures.forEach(tex => {
                    maxW = Math.max(maxW, tex.x + tex.w);
                    maxH = Math.max(maxH, tex.y + tex.h);
                });
                setAtlasSize(prev => ({
                    w: Math.max(prev.w, maxW + padding),
                    h: Math.max(prev.h, maxH + padding)
                }));
            };
            // adjustCanvasSize(); // Opcional: auto-expandir
        }

    }, [textures, atlasSize.w, atlasSize.h, padding]);

    const drawAtlas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        ctx.imageSmoothingEnabled = false;
        canvas.style.imageRendering = 'pixelated';

        canvas.width = atlasSize.w;
        canvas.height = atlasSize.h;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

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

        textures.forEach((tex) => {
            const img = new Image();
            img.src = tex.data;
            const draw = () => {
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, tex.x + padding, tex.y + padding);
            };

            if (img.complete) {
                draw();
            } else {
                img.onload = draw;
            }
        });
    };

    const processFiles = (fileList) => {
        const files = Array.from(fileList);
        files.forEach(file => {
            if (!file.type.startsWith('image/')) return;
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
                        x: 0,
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

    const autoArrange = () => {
        let currentX = 0;
        let currentY = 0;
        let nextRowY = 0;

        const effectiveTileW = useGrid ? tileSize.w : 0;
        const effectiveTileH = useGrid ? tileSize.h : 0;
        const spacing = padding;

        const newTextures = textures.map(tex => {
            const occupiedW = useGrid ? Math.ceil(tex.w / effectiveTileW) * effectiveTileW : tex.w;
            const occupiedH = useGrid ? Math.ceil(tex.h / effectiveTileH) * effectiveTileH : tex.h;

            if (currentX + occupiedW > atlasSize.w) {
                currentX = 0;
                currentY = nextRowY + spacing;
            }

            const updatedTex = { ...tex, x: currentX, y: currentY };

            currentX += occupiedW + spacing;
            if (currentY + occupiedH > nextRowY) {
                nextRowY = currentY + occupiedH;
            }
            return updatedTex;
        });
        setTextures(newTextures);
    };

    const deleteTexture = (id) => {
        setTextures(textures.filter(tex => tex.id !== id));
    };

    const updateTexturePos = (id, axis, value) => {
        const numValue = parseInt(value) || 0;
        setTextures(textures.map(tex =>
            tex.id === id ? { ...tex, [axis]: numValue } : tex
        ));
    };

    const handleCanvasDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleCanvasDrop = (e) => {
        e.preventDefault();
        if (!draggedTextureId || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;

        let rawX = (e.clientX - rect.left) * scaleX;
        let rawY = (e.clientY - rect.top) * scaleY;

        rawX -= padding;
        rawY -= padding;

        let newX = rawX;
        let newY = rawY;

        if (useGrid) {
            const effectiveCellW = tileSize.w + padding;
            const effectiveCellH = tileSize.h + padding;
            newX = Math.round(rawX / effectiveCellW) * effectiveCellW;
            newY = Math.round(rawY / effectiveCellH) * effectiveCellH;
        }

        newX = Math.max(0, newX);
        newY = Math.max(0, newY);

        setTextures(textures.map(tex =>
            tex.id === draggedTextureId ? { ...tex, x: newX, y: newY } : tex
        ));
        setDraggedTextureId(null);
    };

    const clearTextures = () => setTextures([]);

    const downloadAtlas = () => {
        const link = document.createElement('a');
        link.download = `atlas_${atlasSize.w}x${atlasSize.h}.png`;
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
                    setAtlasSize(data.atlasSize || { w: 512, h: 512 });
                    setTextures(data.textures);
                    if (data.tileSize) setTileSize(data.tileSize);
                    if (data.padding !== undefined) setPadding(data.padding);
                    if (data.useGrid !== undefined) setUseGrid(data.useGrid);
                }
            } catch (err) { alert('Error al cargar el archivo JSON del proyecto.'); }
        };
        reader.readAsText(file);
    };

    return (
        <div className="grid lg:grid-cols-4 gap-6 h-[calc(100vh-150px)] animate-fade-in">
            {/* Panel Izquierdo: Configuración y Lista */}
            <div className="lg:col-span-1 bg-slate-800 rounded-xl border border-slate-700 flex flex-col shadow-xl overflow-hidden">

                {/* Sección 1: Configuración */}
                <div className="p-4 border-b border-slate-700 bg-slate-800 z-10 space-y-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Settings size={18} className="text-purple-400" />
                        Configuración Atlas
                    </h2>

                    {/* Tamaño del Canvas */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Ancho Lienzo</label>
                            <input type="number" value={atlasSize.w} onChange={(e) => setAtlasSize(prev => ({ ...prev, w: Math.max(1, parseInt(e.target.value) || 1) }))} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Alto Lienzo</label>
                            <input type="number" value={atlasSize.h} onChange={(e) => setAtlasSize(prev => ({ ...prev, h: Math.max(1, parseInt(e.target.value) || 1) }))} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
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
                                    <input type="number" value={tileSize.w} onChange={(e) => setTileSize(prev => ({ ...prev, w: Math.max(1, parseInt(e.target.value) || 1) }))} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Alto Tile</label>
                                    <input type="number" value={tileSize.h} onChange={(e) => setTileSize(prev => ({ ...prev, h: Math.max(1, parseInt(e.target.value) || 1) }))} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
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

export default TextureAtlasGenerator;