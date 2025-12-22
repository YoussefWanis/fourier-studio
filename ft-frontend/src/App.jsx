import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layers, Wifi, WifiOff } from 'lucide-react';

// Configuration
import { API_URL } from './config';

// Components
import ImageViewport from "./components/ImageViewport.jsx";
import MixerControls from "./components/MixerControls.jsx";
import OutputViewport from "./components/OutputViewport.jsx";

const App = () => {
  // --- STATE ---
  const [images, setImages] = useState([
    { id: 1, hasImage: false, src: null },
    { id: 2, hasImage: false, src: null },
    { id: 3, hasImage: false, src: null },
    { id: 4, hasImage: false, src: null },
  ]);
  
  const [weights, setWeights] = useState({
    mag: [0, 0, 0, 0],
    phase: [0, 0, 0, 0],
    real: [0, 0, 0, 0],
    imag: [0, 0, 0, 0]
  });

  const [mixMode, setMixMode] = useState('mag_phase'); // 'mag_phase' | 'real_imag'
  const [processingMode, setProcessingMode] = useState('region'); // 'whole' or 'region'
  const [isLinked, setIsLinked] = useState(false);
  
  // Region State
  const [regionSettings, setRegionSettings] = useState({ width: 50, height: 50, type: 'inner' });
  const [regionPositions, setRegionPositions] = useState({
    1: { x: 50, y: 50 },
    2: { x: 50, y: 50 },
    3: { x: 50, y: 50 },
    4: { x: 50, y: 50 },
  });

  const updateRegionPosition = (id, x, y) => {
    if (isLinked) {
      setRegionPositions({
        1: { x, y }, 2: { x, y }, 3: { x, y }, 4: { x, y },
      });
    } else {
      setRegionPositions(prev => ({ ...prev, [id]: { x, y } }));
    }
  };

  const [activeOutput, setActiveOutput] = useState(1);
  const [outputs, setOutputs] = useState({ 1: null, 2: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBackendActive, setIsBackendActive] = useState(true); 
  const pollingRef = useRef(null);

  // --- API HANDLERS ---

  const handleUpload = async (id, file) => {
    const localUrl = URL.createObjectURL(file);
    setImages(prev => prev.map(img => img.id === id ? { ...img, hasImage: true, src: localUrl } : img));

    const formData = new FormData();
    formData.append('image', file);

    try {
        const res = await fetch(`${API_URL}/upload/${id}`, {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error('Backend failed');
        setIsBackendActive(true);
    } catch (e) {
        console.warn("Backend unavailable. Switching to Demo Mode.", e);
        setIsBackendActive(false); 
    }
  };

  const pollProgress = async () => {
    try {
        const res = await fetch(`${API_URL}/progress`);
        const data = await res.json();
        
        if (data.status === 'completed' && data.result) {
            setOutputs(prev => ({
                ...prev,
                [activeOutput]: `data:image/png;base64,${data.result}`
            }));
            setIsProcessing(false);
            if (pollingRef.current) clearInterval(pollingRef.current);
        } else if (data.status === 'error') {
            setIsProcessing(false);
            if (pollingRef.current) clearInterval(pollingRef.current);
            alert("Mixing Error: " + data.error);
        }
    } catch (e) {
        console.error("Polling error", e);
        setIsProcessing(false);
    }
  };

  const handleProcess = useCallback(async () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setIsProcessing(true);

    // If backend is dead, simulate mixing locally
    if (!isBackendActive) {
        setTimeout(() => {
            const uploaded = images.filter(i => i.hasImage);
            if (uploaded.length > 0) {
                const simResult = uploaded[Math.floor(Math.random() * uploaded.length)].src;
                setOutputs(prev => ({ ...prev, [activeOutput]: simResult }));
            }
            setIsProcessing(false);
        }, 1500);
        return;
    }

    // Construct Payload
    const payload = {
        mix_mode: mixMode,
        mag_weights: {}, phase_weights: {}, real_weights: {}, imag_weights: {},
        region: processingMode === 'whole' 
            ? { width: 100, height: 100, type: 'inner', x: 50, y: 50 } 
            : {
                width: regionSettings.width,
                height: regionSettings.height,
                type: regionSettings.type,
                x: regionPositions[1].x,
                y: regionPositions[1].y
            },
        region_positions: regionPositions
    };

    [1, 2, 3, 4].forEach((id, idx) => {
        payload.mag_weights[id] = weights.mag[idx];
        payload.phase_weights[id] = weights.phase[idx];
        payload.real_weights[id] = weights.real[idx];
        payload.imag_weights[id] = weights.imag[idx];
    });

    try {
        const res = await fetch(`${API_URL}/start_mix`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            pollingRef.current = setInterval(pollProgress, 500);
        } else {
            setIsProcessing(false);
        }
    } catch (e) {
        console.error("Failed to start mix", e);
        setIsProcessing(false);
        setIsBackendActive(false); 
    }
  }, [weights, regionSettings, regionPositions, mixMode, isBackendActive, activeOutput, images, processingMode]);

  // --- AUTO-TRIGGER EFFECT ---
  useEffect(() => {
    const hasImages = images.some(i => i.hasImage);
    if (!hasImages) return;

    const timer = setTimeout(() => {
        handleProcess();
    }, 400); 

    return () => clearTimeout(timer);
  }, [weights, regionSettings, regionPositions, mixMode, images, processingMode, handleProcess]);


  // --- RENDER ---
  return (
    <div className="h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 overflow-hidden flex flex-col">
      {/* Navbar */}
      <nav className="h-12 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center px-4 justify-between z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-cyan-500 to-purple-600 p-1.5 rounded-lg">
            <Layers size={18} className="text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            FOURIER STUDIO <span className="text-[10px] text-slate-500 font-mono font-normal ml-2">v2.0 PRO</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
            {isBackendActive ? (
                <span className="flex items-center gap-1 text-green-500"><Wifi size={10}/> BACKEND ONLINE</span>
            ) : (
                <span className="flex items-center gap-1 text-yellow-500"><WifiOff size={10}/> DEMO MODE</span>
            )}
        </div>
      </nav>

      <main className="flex-1 p-2 grid grid-cols-12 gap-2 overflow-hidden h-[calc(100vh-3rem)]">
        {/* LEFT: INPUTS */}
        <div className="col-span-12 lg:col-span-5 grid grid-cols-2 grid-rows-2 gap-2 h-full min-h-0">
          {images.map((img) => (
            <ImageViewport 
              key={img.id}
              id={img.id}
              data={img}
              onUpload={handleUpload}
              regionSettings={regionSettings}
              regionPosition={regionPositions[img.id]}
              onPositionChange={updateRegionPosition}
              isBackendActive={isBackendActive}
              processingMode={processingMode}
            />
          ))}
        </div>

        {/* CENTER: CONTROLS */}
        <div className="col-span-12 lg:col-span-3 h-full min-h-0">
          <MixerControls 
            weights={weights} setWeights={setWeights}
            regionSettings={regionSettings} setRegionSettings={setRegionSettings}
            isProcessing={isProcessing}
            mixMode={mixMode} setMixMode={setMixMode}
            processingMode={processingMode} setProcessingMode={setProcessingMode}
            isLinked={isLinked} setIsLinked={setIsLinked}
          />
        </div>

        {/* RIGHT: OUTPUTS */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-2 h-full min-h-0">
          <div className="flex-1 min-h-0">
            <OutputViewport 
              id={1} 
              isActive={activeOutput === 1} 
              onClick={() => setActiveOutput(1)}
              image={outputs[1]}
              isProcessing={isProcessing}
            />
          </div>
          <div className="flex-1 min-h-0">
            <OutputViewport 
              id={2} 
              isActive={activeOutput === 2} 
              onClick={() => setActiveOutput(2)}
              image={outputs[2]}
              isProcessing={isProcessing}
            />
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default App;