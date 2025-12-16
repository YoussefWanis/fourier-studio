import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ImageIcon, ChevronDown, Upload, RefreshCw } from 'lucide-react';
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
  const [viewSelection, setViewSelection] = useState('Magnitude'); 
  const [ftImageUrl, setFtImageUrl] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const isFreqMode = !['Original', 'Grayscale'].includes(viewSelection);

  const fetchView = useCallback(async () => {
    if (!data.hasImage || !isBackendActive || !isFreqMode) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/get_view/${id}/${viewSelection}`);
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
  }, [id, data.hasImage, viewSelection, isBackendActive, isFreqMode]);

  useEffect(() => {
    if (!data.hasImage) return;
    if (isBackendActive && isFreqMode) {
      fetchView();
    }
  }, [data.hasImage, viewSelection, isBackendActive, isFreqMode, fetchView]);

  // Handle Dragging
  const handleMouseDown = (e) => {
    if (!data.hasImage || !isFreqMode || processingMode === 'whole') return;
    
    const container = containerRef.current;
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
      <div className="bg-slate-900/80 p-2 flex items-center justify-between text-xs font-mono border-b border-slate-700">
        <span className="text-cyan-400 flex items-center gap-2">
          <ImageIcon size={14} /> IMG_0{id}
        </span>
        
        <div className="relative group/sel">
           <select 
             value={viewSelection}
             onChange={(e) => setViewSelection(e.target.value)}
             className="bg-slate-950 text-xs text-slate-300 border border-slate-700 rounded px-2 py-1 pr-6 outline-none hover:border-cyan-500 hover:text-cyan-400 transition-colors appearance-none cursor-pointer"
           >
             <option value="Original">Original (Color)</option>
             <option value="Grayscale">Grayscale Input</option>
             <option disabled>──────────</option>
             <option value="Magnitude">FT Magnitude</option>
             <option value="Phase">FT Phase</option>
             <option value="Real">FT Real</option>
             <option value="Imaginary">FT Imaginary</option>
           </select>
           <ChevronDown size={12} className="absolute right-2 top-1.5 text-slate-500 pointer-events-none" />
        </div>
      </div>

      <div 
        ref={containerRef}
        className={`relative flex-1 bg-black overflow-hidden flex items-center justify-center ${isFreqMode && processingMode === 'region' ? 'cursor-crosshair' : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
      >
        
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={(e) => e.target.files[0] && onUpload(id, e.target.files[0])}
        />

        {!data.hasImage && (
          <div 
            className="absolute inset-0 z-50 flex flex-col items-center justify-center text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer"
            onDoubleClick={() => fileInputRef.current.click()}
          >
            <Upload size={32} className="mb-2 opacity-50" />
            <span className="text-xs">DOUBLE CLICK TO BROWSE</span>
          </div>
        )}

        {data.hasImage && (
            <>
                {!isFreqMode && (
                      <img 
                        src={data.src} 
                        className="w-full h-full object-contain pointer-events-none select-none p-1"
                        style={viewSelection === 'Grayscale' ? { filter: 'grayscale(100%)' } : {}}
                        alt={`Spatial ${id}`}
                        onDoubleClick={() => fileInputRef.current.click()} 
                      />
                )}

                {isFreqMode && (
                    <>
                        {!isBackendActive ? renderOfflineSpectrum() : (
                            ftImageUrl ? (
                                <img 
                                    src={ftImageUrl} 
                                    className="w-full h-full object-contain pointer-events-none select-none p-1"
                                    alt={`Freq ${id}`}
                                />
                            ) : (
                                <RefreshCw className="animate-spin text-slate-600" size={24} />
                            )
                        )}

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
                                    zIndex: 10
                                }}
                            >
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/50 rounded-full" />
                            </div>
                        )}
                    </>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default ImageViewport;