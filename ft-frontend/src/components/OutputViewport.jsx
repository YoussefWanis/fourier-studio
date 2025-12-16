import React from 'react';
import { Radio, Activity, RefreshCw } from 'lucide-react';

const OutputViewport = ({ id, isActive, onClick, image, isProcessing }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        relative rounded-xl overflow-hidden border-2 transition-all duration-300 cursor-pointer h-full group
        ${isActive ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'border-slate-700 hover:border-slate-500'}
        bg-black
      `}
    >
      <div className="absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-md p-2 flex justify-between items-center z-10 border-b border-white/5">
        <span className={`text-xs font-mono flex items-center gap-2 ${isActive ? 'text-green-400' : 'text-slate-400'}`}>
          <Radio size={14} className={isActive ? "animate-pulse" : ""} /> OUTPUT PORT {id}
        </span>
        {isActive && <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>}
      </div>

      <div className="w-full h-full flex items-center justify-center text-slate-600">
        {image ? (
          <img src={image} className="w-full h-full object-contain" alt={`Output ${id}`} />
        ) : (
           <div className="flex flex-col items-center gap-2 opacity-30">
             <Activity size={32} />
             <span className="text-[10px] font-mono">NO SIGNAL</span>
           </div>
        )}
      </div>

      {isProcessing && isActive && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <RefreshCw className="text-green-500 animate-spin mb-2" size={32} />
            <span className="text-green-400 text-xs font-mono animate-pulse">PROCESSING FFT...</span>
        </div>
      )}
    </div>
  );
};

export default OutputViewport;