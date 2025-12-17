import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ImageIcon, Upload, RefreshCw, Eye, Activity } from 'lucide-react';
import { API_URL } from '../config';

const ImageViewport = ({ 
  id, 
  data, 
  onUpload, 
  regionSettings,
  regionPosition,
  onPositionChange,
  isBackendActive,
  processingMode 
}) => {
  // --- STATE ---
  const [spatialMode, setSpatialMode] = useState('Original'); // 'Original' | 'Grayscale'
  const [freqMode, setFreqMode] = useState('Magnitude');      // 'Magnitude' | 'Phase' | 'Real' | 'Imaginary'
  
  const [ftImageUrl, setFtImageUrl] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef(null);
  const freqContainerRef = useRef(null);

  // --- TRIGGER UPLOAD ---
  const handleUploadClick = () => {
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

  // --- FETCH FREQUENCY VIEW ---
  const fetchView = useCallback(async () => {
    if (!data.hasImage || !isBackendActive) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/get_view/${id}/${freqMode}`);
      if (!res.ok) throw new Error("Fetch failed");
      const json = await res.json();
      
      if (json.image) {
        setFtImageUrl(`data:image/png;base64,${json.image}`);
      }
    } catch (err) {
      console.warn("Failed to fetch view", err);
    } finally {
      setIsLoading(false);
    }
  }, [id, data.hasImage, freqMode, isBackendActive]);

  // Fetch whenever the frequency mode changes or an image is uploaded
  useEffect(() => {
    if (!data.hasImage) return;
    if (isBackendActive) {
      fetchView();
    }
  }, [data.hasImage, freqMode, isBackendActive, fetchView]);

  // --- DRAG HANDLER (Restricted to Frequency View) ---
  const handleMouseDown = (e) => {
    if (!data.hasImage || processingMode === 'whole') return;
    
    const container = freqContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    
    const handleDrag = (moveEvent) => {
        const rawX = moveEvent.clientX - rect.left;
        const rawY = moveEvent.clientY - rect.top;
        
        const xPct = Math.max(0, Math.min(100, (rawX / rect.width) * 100));
        const yPct = Math.max(0, Math.min(100, (rawY / rect.height) * 100));
        
        onPositionChange(id, xPct, yPct);
    };

    const stopDrag = () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', stopDrag);
    };

    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', stopDrag);
  };

  // --- OFFLINE PLACEHOLDER ---
  const renderOfflineSpectrum = () => (
    <div 
        className="w-full h-full relative overflow-hidden opacity-80"
        style={{
          backgroundImage: `
            radial-gradient(circle at center, white 1px, transparent 1px),
            conic-gradient(from 0deg, #1e293b 0deg, #334155 180deg, #1e293b 360deg)
          `,
          backgroundSize: '20px 20px, 100% 100%',
          filter: `hue-rotate(${id * 45}deg) contrast(1.2)`
        }}
    />
  );

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl flex flex-col h-full group hover:border-cyan-500/50 transition-colors">
      
      {/* --- HEADER (Global Controls) --- */}
      <div className="bg-slate-900/80 p-2 flex items-center justify-between text-xs font-mono border-b border-slate-700 shrink-0">
        <span className="text-cyan-400 flex items-center gap-2">
          <ImageIcon size={14} /> IMG_0{id}
        </span>
        
        <div className="flex items-center gap-2">
            <button 
                onClick={handleUploadClick}
                className="bg-slate-800 hover:bg-cyan-600 text-slate-400 hover:text-white p-1 rounded border border-slate-700 transition-colors flex items-center gap-1"
                title="Upload / Change Image"
            >
                <Upload size={12} /> <span className="hidden sm:inline">UPLOAD</span>
            </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={(e) => e.target.files[0] && onUpload(id, e.target.files[0])}
      />

      {/* --- CONTENT AREA (Split View) --- */}
      <div className="flex-1 flex flex-col min-h-0">
        
        {/* 1. SPATIAL DOMAIN (Top Half) */}
        <div className="flex-1 relative border-b border-slate-700 bg-black/50 overflow-hidden">
             {/* Floating Controls */}
             <div className="absolute top-2 right-2 z-10">
                <select 
                    value={spatialMode}
                    onChange={(e) => setSpatialMode(e.target.value)}
                    className="bg-black/60 backdrop-blur text-[10px] text-slate-300 border border-slate-600 rounded px-1 py-0.5 outline-none hover:border-cyan-500 cursor-pointer"
                >
                    <option value="Original">Original</option>
                    <option value="Grayscale">Grayscale</option>
                </select>
            </div>
            <div className="absolute top-2 left-2 z-10 pointer-events-none">
                 <span className="text-[10px] font-bold text-slate-500 bg-black/40 px-1 rounded flex items-center gap-1">
                    <Eye size={10} /> SPATIAL
                 </span>
            </div>

            {/* Image Render */}
            <div className="w-full h-full flex items-center justify-center p-2">
                {data.hasImage ? (
                     <img 
                        src={data.src} 
                        className="w-full h-full object-contain"
                        style={spatialMode === 'Grayscale' ? { filter: 'grayscale(100%)' } : {}}
                        alt={`Spatial ${id}`}
                        onDoubleClick={handleUploadClick}
                      />
                ) : (
                    <div 
                        className="flex flex-col items-center justify-center text-slate-600 hover:text-cyan-500 cursor-pointer transition-colors"
                        onClick={handleUploadClick}
                    >
                        <Upload size={24} className="mb-1 opacity-50" />
                        <span className="text-[10px]">NO DATA</span>
                    </div>
                )}
            </div>
        </div>

        {/* 2. FREQUENCY DOMAIN (Bottom Half) */}
        <div 
            ref={freqContainerRef}
            className={`flex-1 relative bg-black overflow-hidden ${processingMode === 'region' ? 'cursor-crosshair' : 'cursor-default'}`}
            onMouseDown={handleMouseDown}
        >
             {/* Floating Controls */}
             <div className="absolute top-2 right-2 z-10">
                <select 
                    value={freqMode}
                    onChange={(e) => setFreqMode(e.target.value)}
                    className="bg-black/60 backdrop-blur text-[10px] text-cyan-300 border border-slate-600 rounded px-1 py-0.5 outline-none hover:border-cyan-500 cursor-pointer"
                >
                    <option value="Magnitude">Magnitude</option>
                    <option value="Phase">Phase</option>
                    <option value="Real">Real</option>
                    <option value="Imaginary">Imaginary</option>
                </select>
            </div>
            <div className="absolute top-2 left-2 z-10 pointer-events-none">
                 <span className="text-[10px] font-bold text-slate-500 bg-black/40 px-1 rounded flex items-center gap-1">
                    <Activity size={10} /> FREQUENCY
                 </span>
            </div>

            {/* Image Render */}
            <div className="w-full h-full flex items-center justify-center p-2">
                {data.hasImage ? (
                    <>
                        {!isBackendActive ? renderOfflineSpectrum() : (
                            ftImageUrl ? (
                                <img 
                                    src={ftImageUrl} 
                                    className="w-full h-full object-contain pointer-events-none select-none"
                                    alt={`Freq ${id}`}
                                />
                            ) : (
                                <RefreshCw className="animate-spin text-slate-600" size={20} />
                            )
                        )}

                        {/* Region Overlay (Only on Frequency View) */}
                        {processingMode === 'region' && (
                            <div 
                                className={`absolute border pointer-events-none transition-all duration-75
                                    ${regionSettings.type === 'inner' ? 'border-cyan-400 bg-cyan-400/20' : 'border-red-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]'}
                                `}
                                style={{
                                    left: `${regionPosition.x}%`,
                                    top: `${regionPosition.y}%`,
                                    width: `${regionSettings.width}%`, 
                                    height: `${regionSettings.height}%`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 20
                                }}
                            >
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/50 rounded-full" />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-slate-700 text-[10px] font-mono">
                        WAITING FOR INPUT...
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageViewport;