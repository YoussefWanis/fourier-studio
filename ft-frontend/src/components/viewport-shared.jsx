// viewport-shared.js
import React, { useState, useRef, useCallback } from 'react';

// --- CUSTOM HOOK: Handles Brightness/Contrast Drag Logic ---
export const useImageAdjuster = (initialB = 100, initialC = 100) => {
  const [brightness, setBrightness] = useState(initialB);
  const [contrast, setContrast] = useState(initialC);
  
  // Refs for tracking drag deltas without re-renders
  const startPos = useRef({ x: 0, y: 0 });
  const startValues = useRef({ b: initialB, c: initialC });

  // Call this when the user clicks to start adjusting
  const startAdjustment = useCallback((e) => {
    e.preventDefault();
    startPos.current = { x: e.clientX, y: e.clientY };
    startValues.current = { b: brightness, c: contrast };

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startPos.current.x; // Right = More Contrast
      const deltaY = startPos.current.y - moveEvent.clientY; // Up = More Brightness (Inverted Y)

      // Sensitivity: 1px movement = 1 unit change
      setContrast(Math.max(0, startValues.current.c + deltaX));
      setBrightness(Math.max(0, startValues.current.b + deltaY));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [brightness, contrast]);

  const reset = useCallback(() => {
    setBrightness(initialB);
    setContrast(initialC);
  }, [initialB, initialC]);

  const isAdjusted = brightness !== initialB || contrast !== initialC;

  // Helper to generate the CSS filter string
  const filterStyle = `brightness(${brightness}%) contrast(${contrast}%)`;

  return { brightness, contrast, startAdjustment, reset, isAdjusted, filterStyle };
};

// --- COMPONENT: Standardized Viewport Header ---
export const ViewportHeader = ({ title, colorClass, icon, rightControls }) => {
  return (
    <div className="absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-md p-2 flex justify-between items-center z-10 border-b border-white/5 select-none h-10">
      <span className={`text-xs font-mono flex items-center gap-2 ${colorClass}`}>
        {icon} {title}
      </span>
      <div className="flex items-center gap-2">
        {rightControls}
      </div>
    </div>
  );
};

// --- COMPONENT: Values Overlay (Shows B: 120% | C: 90%) ---
export const AdjustmentOverlay = ({ brightness, contrast, visible }) => {
  if (!visible) return null;
  return (
    <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur text-[10px] text-slate-300 px-2 py-1 rounded font-mono border border-slate-800 pointer-events-none z-20">
      B: {Math.round(brightness)}% | C: {Math.round(contrast)}%
    </div>
  );
};