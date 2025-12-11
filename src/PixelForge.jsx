// src/PixelForge.jsx
import React, { useState } from 'react';
import { Image as ImageIcon, Grid, Layers } from 'lucide-react';
import PixelScaler from './components/PixelScaler';
import TextureAtlasGenerator from './components/TextureAtlasGenerator';

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
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'scaler'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-600'
                }`}
            >
              <ImageIcon size={16} className="inline mr-2" />
              Escalador / Pixelador
            </button>
            <button
              onClick={() => setActiveTab('atlas')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'atlas'
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

export default PixelForge;