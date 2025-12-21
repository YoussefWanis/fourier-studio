import React from 'react';
import { Radio, Activity, RefreshCw, RotateCcw } from 'lucide-react'; // Added RotateCcw
import { useImageAdjuster, ViewportHeader, AdjustmentOverlay } from './viewport-shared.jsx';

const OutputViewport = ({ id, isActive, onClick, image, isProcessing }) => {
  // Use Shared Hook
  const { brightness, contrast, startAdjustment, reset, isAdjusted, filterStyle } = useImageAdjuster();

  return (
    <div 
      onClick={onClick}
      className={`
        relative rounded-xl overflow-hidden border-2 transition-all duration-300 h-full group select-none flex flex-col
        ${isActive ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'border-slate-700 hover:border-slate-500'}
        bg-black
      `}
    >
      <ViewportHeader 
        title={`OUTPUT PORT ${id}`}
        colorClass={isActive ? 'text-green-400' : 'text-slate-400'}
        icon={<Radio size={14} className={isActive ? "animate-pulse" : ""} />}
        rightControls={
            <div className="flex items-center gap-2">
                {/* Reset Button (Only shows if adjusted) */}
                {isAdjusted && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent viewport selection when clicking reset
                            reset();
                        }}
                        className="text-[10px] text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20 flex items-center gap-1 hover:bg-yellow-400/20 transition-colors"
                        title="Reset Brightness/Contrast"
                    >
                        <RotateCcw size={10} /> RESET B/C
                    </button>
                )}
                {/* Status Indicator */}
                {isActive && <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>}
            </div>
        }
      />

      {/* Main Image Area */}
      <div 
        className={`flex-1 w-full relative flex items-center justify-center overflow-hidden ${image ? 'cursor-move' : 'cursor-default'}`}
        onMouseDown={image ? startAdjustment : undefined}
        onDoubleClick={reset}
      >
        {image ? (
          <img 
            src={image} 
            className="w-full h-full object-contain pointer-events-none transition-none will-change-[filter]" 
            alt={`Output ${id}`} 
            style={{ filter: filterStyle }}
          />
        ) : (
           <div className="flex flex-col items-center gap-2 opacity-30 pointer-events-none">
             <Activity size={32} />
             <span className="text-[10px] font-mono">NO SIGNAL</span>
           </div>
        )}
        
        {/* Overlays */}
        <AdjustmentOverlay brightness={brightness} contrast={contrast} visible={isAdjusted && image} />
        
        {isProcessing && isActive && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 pointer-events-none">
              <RefreshCw className="text-green-500 animate-spin mb-2" size={32} />
              <span className="text-green-400 text-xs font-mono animate-pulse">PROCESSING FFT...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputViewport;