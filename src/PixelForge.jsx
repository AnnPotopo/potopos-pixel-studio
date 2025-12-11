// src/PixelForge.jsx
import React, { useState } from 'react';
import { Image as ImageIcon, Grid, Layers } from 'lucide-react';
import PixelScaler from './components/PixelScaler';
import TextureAtlasGenerator from './components/TextureAtlasGenerator';

const PixelForge = () => {
  const [activeTab, setActiveTab] = useState('scaler');

  return (
    // Cambiado selection:bg-purple-500 por yellow-500
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-yellow-500 selection:text-black">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            {/* Logo en Amarillo */}
            <div className="bg-yellow-500 p-2 rounded-lg">
              <Grid size={24} className="text-black" />
            </div>
            {/* Nuevo Título */}
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Potopo Pixel Studio
            </h1>
          </div>

          <div className="flex bg-slate-700 rounded-lg p-1 gap-1">
            <button
              onClick={() => setActiveTab('scaler')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'scaler'
                  ? 'bg-yellow-500 text-black shadow-md'
                  : 'text-slate-300 hover:bg-slate-600'
                }`}
            >
              <ImageIcon size={16} className="inline mr-2" />
              Escalador
            </button>
            <button
              onClick={() => setActiveTab('atlas')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'atlas'
                  ? 'bg-yellow-500 text-black shadow-md'
                  : 'text-slate-300 hover:bg-slate-600'
                }`}
            >
              <Layers size={16} className="inline mr-2" />
              Atlas
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {activeTab === 'scaler' ? <PixelScaler /> : <TextureAtlasGenerator />}
      </main>

      <footer className="text-center text-slate-500 text-sm py-8 border-t border-slate-800 mt-8">
        <p>Generado con Potopo Pixel Studio • Todo el procesamiento es local</p>
      </footer>
    </div>
  );
};

export default PixelForge;