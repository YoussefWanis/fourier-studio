import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ImageIcon, RefreshCw, Eye, Activity, Sun, Move, RotateCcw } from 'lucide-react'; // Removed Upload icon
import { API_URL } from '../config';
import { useImageAdjuster, ViewportHeader, AdjustmentOverlay } from './viewport-shared.jsx';

const ImageViewport = ({ 
  id, data, onUpload, regionSettings, regionPosition, onPositionChange, isBackendActive, processingMode 
}) => {
  // --- STATE ---
  const [spatialMode, setSpatialMode] = useState('Original');
  const [freqMode, setFreqMode] = useState('Magnitude');
  const [activeTool, setActiveTool] = useState('region'); 
  const [ftImageUrl, setFtImageUrl] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef(null);
  const freqContainerRef = useRef(null);

  // --- USE SHARED HOOKS ---
  const spatialAdj = useImageAdjuster();
  const freqAdj = useImageAdjuster();

  // --- ACTIONS ---
  const handleUploadClick = () => fileInputRef.current?.click();
  
  const resetAll = (e) => {
    e.stopPropagation();
    spatialAdj.reset();
    freqAdj.reset();
  };

  // --- FETCH FREQUENCY VIEW ---
  const fetchView = useCallback(async () => {
    if (!data.hasImage || !isBackendActive) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/get_view/${id}/${freqMode}`);
      if (!res.ok) throw new Error("Fetch failed");
      const json = await res.json();
      if (json.image) setFtImageUrl(`data:image/png;base64,${json.image}`);
    } catch (err) { console.warn("Fetch error", err); } 
    finally { setIsLoading(false); }
  }, [id, data.hasImage, freqMode, isBackendActive]);

  useEffect(() => {
    if (data.hasImage && isBackendActive) fetchView();
  }, [data.hasImage, freqMode, isBackendActive, fetchView]);

  // --- COMPLEX MOUSE HANDLER (Region vs Adjust) ---
  const handleFreqMouseDown = (e) => {
    if (!data.hasImage) return;

    if (processingMode === 'region' && activeTool === 'region') {
      const container = freqContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const handleRegionDrag = (moveEvent) => {
        const rawX = moveEvent.clientX - rect.left;
        const rawY = moveEvent.clientY - rect.top;
        const xPct = Math.max(0, Math.min(100, (rawX / rect.width) * 100));
        const yPct = Math.max(0, Math.min(100, (rawY / rect.height) * 100));
        onPositionChange(id, xPct, yPct);
      };

      const stopRegionDrag = () => {
        window.removeEventListener('mousemove', handleRegionDrag);
        window.removeEventListener('mouseup', stopRegionDrag);
      };

      window.addEventListener('mousemove', handleRegionDrag);
      window.addEventListener('mouseup', stopRegionDrag);
    } else {
      freqAdj.startAdjustment(e);
    }
  };

  // --- OFFLINE PLACEHOLDER ---
  const renderOfflineSpectrum = () => (
    <div 
      className="w-full h-full relative overflow-hidden opacity-80"
      style={{
        backgroundImage: `radial-gradient(circle at center, white 1px, transparent 1px), conic-gradient(from 0deg, #1e293b 0deg, #334155 180deg, #1e293b 360deg)`,
        backgroundSize: '20px 20px, 100% 100%',
        filter: `hue-rotate(${id * 45}deg) contrast(1.2)`
      }}
    />
  );

  const isAnyAdjusted = spatialAdj.isAdjusted || freqAdj.isAdjusted;

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl flex flex-col h-full group hover:border-cyan-500/50 transition-colors relative">
      
      {/* --- HEADER --- */}
      <ViewportHeader 
        title={`IMG_0${id}`}
        colorClass="text-cyan-400"
        icon={<ImageIcon size={14} />}
        rightControls={
          <>
            {isAnyAdjusted && (
               <button onClick={resetAll} className="text-[10px] text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20 flex items-center gap-1">
                 <RotateCcw size={10} /> RESET B/C
               </button>
            )}
            {/* UPLOAD BUTTON REMOVED */}
          </>
        }
      />

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files[0] && onUpload(id, e.target.files[0])} />

      {/* --- CONTENT AREA (Split View) --- */}
      <div className="flex-1 flex flex-col min-h-0 pt-10">
        
        {/* 1. SPATIAL DOMAIN (Top Half) */}
        <div 
          className="flex-1 relative border-b border-slate-700 bg-black/50 overflow-hidden cursor-ns-resize group/spatial"
          onMouseDown={data.hasImage ? spatialAdj.startAdjustment : undefined}
          onDoubleClick={handleUploadClick} // UPDATED: Double click now opens upload dialog
          title="Double-click to upload image"
        >
           {/* Dropdown */}
           <div className="absolute top-2 right-2 z-10" onMouseDown={(e) => e.stopPropagation()}>
              <select value={spatialMode} onChange={(e) => setSpatialMode(e.target.value)} className="bg-black/60 backdrop-blur text-[10px] text-slate-300 border border-slate-600 rounded px-1 py-0.5 outline-none hover:border-cyan-500 cursor-pointer">
                 <option value="Original">Original</option>
                 <option value="Grayscale">Grayscale</option>
              </select>
           </div>
           
           {/* Label */}
           <div className="absolute top-2 left-2 z-10 pointer-events-none">
              <span className="text-[10px] font-bold text-slate-500 bg-black/40 px-1 rounded flex items-center gap-1"><Eye size={10} /> SPATIAL</span>
           </div>

           {/* Image */}
           <div className="w-full h-full flex items-center justify-center p-2">
             {data.hasImage ? (
                <img 
                  src={data.src} 
                  className="w-full h-full object-contain select-none pointer-events-none"
                  style={{ 
                    filter: `${spatialMode === 'Grayscale' ? 'grayscale(100%)' : ''} ${spatialAdj.filterStyle}` 
                  }}
                  alt={`Spatial ${id}`}
                />
             ) : (
               // Simple text prompt (Clicking here also triggers upload via bubbling or direct click)
               <div className="flex flex-col items-center justify-center text-slate-600 cursor-pointer hover:text-cyan-500 transition-colors">
                 <span className="text-[10px] font-mono">DOUBLE CLICK TO UPLOAD</span>
               </div>
             )}
           </div>
           
           {/* Adjustments Overlay (Spatial) */}
           <AdjustmentOverlay brightness={spatialAdj.brightness} contrast={spatialAdj.contrast} visible={spatialAdj.isAdjusted && data.hasImage} />
        </div>

        {/* 2. FREQUENCY DOMAIN (Bottom Half) */}
        <div 
          ref={freqContainerRef}
          className={`flex-1 relative bg-black overflow-hidden ${
             processingMode === 'region' && activeTool === 'region' ? 'cursor-move' : 'cursor-ns-resize'
          }`}
          onMouseDown={handleFreqMouseDown}
          onDoubleClick={freqAdj.reset} // Frequency view still resets B/C on double click
        >
           {/* Controls */}
           <div className="absolute top-2 right-2 z-10 flex gap-2" onMouseDown={(e) => e.stopPropagation()}>
              {processingMode === 'region' && (
                 <div className="flex bg-black/60 backdrop-blur border border-slate-600 rounded overflow-hidden">
                    <button onClick={() => setActiveTool('region')} className={`p-1 ${activeTool === 'region' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}><Move size={12} /></button>
                    <button onClick={() => setActiveTool('adjust')} className={`p-1 ${activeTool === 'adjust' ? 'bg-yellow-600 text-white' : 'text-slate-400 hover:text-white'}`}><Sun size={12} /></button>
                 </div>
              )}
              <select value={freqMode} onChange={(e) => setFreqMode(e.target.value)} className="bg-black/60 backdrop-blur text-[10px] text-cyan-300 border border-slate-600 rounded px-1 py-0.5 outline-none hover:border-cyan-500 cursor-pointer">
                 {['Magnitude', 'Phase', 'Real', 'Imaginary'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
           </div>
           
           <div className="absolute top-2 left-2 z-10 pointer-events-none">
              <span className="text-[10px] font-bold text-slate-500 bg-black/40 px-1 rounded flex items-center gap-1"><Activity size={10} /> FREQUENCY</span>
           </div>

           {/* Image / Spectrum */}
           <div className="w-full h-full flex items-center justify-center p-2">
             {data.hasImage ? (
                <>
                   {!isBackendActive ? renderOfflineSpectrum() : (
                      ftImageUrl ? (
                        <img 
                          src={ftImageUrl} 
                          className="w-full h-full object-contain pointer-events-none select-none"
                          alt={`Freq ${id}`}
                          style={{ filter: freqAdj.filterStyle }}
                        />
                      ) : <RefreshCw className="animate-spin text-slate-600" size={20} />
                   )}
                   
                   {/* Region Overlay */}
                   {processingMode === 'region' && (
                      <div 
                        className={`absolute border pointer-events-none transition-all duration-75 ${regionSettings.type === 'inner' ? 'border-cyan-400 bg-cyan-400/20' : 'border-red-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]'}`}
                        style={{
                           left: `${regionPosition.x}%`, top: `${regionPosition.y}%`,
                           width: `${regionSettings.width}%`, height: `${regionSettings.height}%`,
                           transform: 'translate(-50%, -50%)', zIndex: 20,
                           opacity: activeTool === 'adjust' ? 0.4 : 1
                        }}
                      >
                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/50 rounded-full" />
                      </div>
                   )}
                </>
             ) : (
               <div className="text-slate-700 text-[10px] font-mono">WAITING FOR INPUT...</div>
             )}
           </div>

           {/* Adjustments Overlay (Freq) */}
           <AdjustmentOverlay brightness={freqAdj.brightness} contrast={freqAdj.contrast} visible={freqAdj.isAdjusted && data.hasImage} />
        </div>
      </div>
    </div>
  );
};

export default ImageViewport;