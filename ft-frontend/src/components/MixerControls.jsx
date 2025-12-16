import React from 'react';
import { Sliders, Maximize, Scan, Aperture, Link, RefreshCw } from 'lucide-react';

const MixerControls = ({ 
  weights, 
  setWeights, 
  regionSettings,
  setRegionSettings,
  isProcessing,
  mixMode,
  setMixMode,
  processingMode,
  setProcessingMode,
  isLinked,
  setIsLinked
}) => {

  const updateWeight = (type, imgId, val) => {
    setWeights(prev => ({
        ...prev,
        [type]: prev[type].map((w, i) => (i === imgId - 1 ? val : w))
    }));
  };

  const renderSliderGroup = (title, key, colorClass = "text-slate-300", accentClass = "accent-slate-500") => (
    <div className="mb-6 last:mb-2">
      <div className={`text-xs font-bold uppercase tracking-wider mb-3 pl-1 border-l-2 ${colorClass.replace('text-', 'border-')} ${colorClass}`}>
        {title}
      </div>
      {[1, 2, 3, 4].map((idx) => {
        const val = weights[key][idx-1];
        return (
          <div key={`${key}-${idx}`} className="mb-2">
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Img {idx}</span>
              <span className={`font-mono ${colorClass}`}>{val}%</span>
            </div>
            <input 
              type="range" min="0" max="100" value={val}
              onChange={(e) => updateWeight(key, idx, parseInt(e.target.value))}
              className={`w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer ${accentClass} hover:brightness-125`}
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col gap-3 h-full shadow-xl relative overflow-hidden">
      
      {/* Header */}
      <div className="flex bg-slate-900 rounded-lg p-2 border border-slate-700 items-center justify-center">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
           <Sliders size={14} /> MANUAL MIXER
        </span>
      </div>

      {/* Processing Mode Toggle (Whole vs Region) */}
      <div className="flex border border-slate-600 rounded overflow-hidden">
        <button
           onClick={() => setProcessingMode('whole')}
           className={`flex-1 py-1.5 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${processingMode === 'whole' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
        >
           <Maximize size={12} /> WHOLE IMG
        </button>
        <button
           onClick={() => setProcessingMode('region')}
           className={`flex-1 py-1.5 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${processingMode === 'region' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
        >
           <Scan size={12} /> REGION
        </button>
      </div>

      {/* Mix Component Mode Tabs */}
      <div className="flex border-b border-slate-700 mt-1">
          <button
              onClick={() => setMixMode('mag_phase')}
              className={`flex-1 pb-2 text-xs font-bold transition-colors relative ${mixMode === 'mag_phase' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
              Mag / Phase
              {mixMode === 'mag_phase' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>}
          </button>
          <button
              onClick={() => setMixMode('real_imag')}
              className={`flex-1 pb-2 text-xs font-bold transition-colors relative ${mixMode === 'real_imag' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
              Real / Imag
              {mixMode === 'real_imag' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>}
          </button>
      </div>

      {/* Sliders Area */}
      <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 py-2">
          {mixMode === 'mag_phase' ? (
             <>
               {renderSliderGroup("Magnitude", "mag", "text-cyan-400", "accent-cyan-500")}
               {renderSliderGroup("Phase", "phase", "text-pink-400", "accent-pink-500")}
             </>
          ) : (
             <>
               {renderSliderGroup("Real Component", "real", "text-emerald-400", "accent-emerald-500")}
               {renderSliderGroup("Imaginary Component", "imag", "text-amber-400", "accent-amber-500")}
             </>
          )}
      </div>

      {/* Region Controls - Only shown in Region Mode */}
      {processingMode === 'region' && (
        <div className="border-t border-slate-700 pt-3 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between text-purple-400 font-bold text-xs">
               <div className="flex items-center gap-2">
                 <Aperture size={14} /> <span>FILTER REGION</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="font-mono text-[10px] text-slate-500">
                    {isLinked ? "Positions Linked" : "Unified Size"}
                 </span>
                 <button 
                    onClick={() => setIsLinked(!isLinked)}
                    className={`p-1 rounded transition-colors ${isLinked ? 'bg-purple-500 text-white' : 'text-slate-500 hover:text-white bg-slate-800'}`}
                    title={isLinked ? "Unlink Positions" : "Link Positions"}
                 >
                    <Link size={14} />
                 </button>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Width</span>
                        <span className="font-mono text-purple-300">{regionSettings.width}%</span>
                    </div>
                    <input 
                        type="range" min="5" max="100" value={regionSettings.width}
                        onChange={(e) => setRegionSettings({...regionSettings, width: parseInt(e.target.value)})}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Height</span>
                        <span className="font-mono text-purple-300">{regionSettings.height}%</span>
                    </div>
                    <input 
                        type="range" min="5" max="100" value={regionSettings.height}
                        onChange={(e) => setRegionSettings({...regionSettings, height: parseInt(e.target.value)})}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                </div>
            </div>

            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
            <button 
                className={`flex-1 py-1.5 text-[10px] rounded transition-all ${regionSettings.type === 'inner' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
                onClick={() => setRegionSettings({...regionSettings, type: 'inner'})}
            >
                INNER (PASS)
            </button>
            <button 
                className={`flex-1 py-1.5 text-[10px] rounded transition-all ${regionSettings.type === 'outer' ? 'bg-red-600 text-white' : 'text-slate-400'}`}
                onClick={() => setRegionSettings({...regionSettings, type: 'outer'})}
            >
                OUTER (REJECT)
            </button>
            </div>
        </div>
      )}

      {/* FOOTER STATUS */}
      <div className="mt-auto pt-4 border-t border-slate-700 flex items-center justify-between">
         <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            {isProcessing ? (
                <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>PROCESSING...</span>
                </>
            ) : (
                <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                    <span>LIVE UPDATES ACTIVE</span>
                </>
            )}
         </div>
      </div>
    </div>
  );
};

export default MixerControls;