"use client";

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const MFRLAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Loop every 4 seconds
  const loopDuration = fps * 4;
  const loopFrame = frame % loopDuration;
  
  const rotation = interpolate(loopFrame, [0, loopDuration], [0, 360]);

  return (
    <AbsoluteFill className="bg-transparent flex items-center justify-center">
      <div className="relative w-80 h-80 flex items-center justify-center">
        {/* Central LLM Node */}
        <div className="absolute w-24 h-24 rounded-2xl bg-indigo-900 border-2 border-indigo-400 flex items-center justify-center z-20 shadow-[0_0_30px_rgba(99,102,241,0.5)]">
          <span className="font-bold text-indigo-200">LLM</span>
        </div>

        {/* Outer rotating ring of data */}
        <div 
          className="absolute w-64 h-64 rounded-full border-2 border-dashed border-indigo-500/20 z-10"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Data point 1 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
          {/* Data point 2 */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-6 h-6 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
          {/* Data point 3 */}
          <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.8)]" />
          {/* Data point 4 */}
          <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.8)]" />
        </div>
        
        {/* Arrows indicating inward flow */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div 
            className="w-48 h-48 rounded-full border-4 border-indigo-500/10" 
            style={{ 
              transform: `scale(${interpolate(loopFrame % (fps * 2), [0, fps * 2], [1.2, 0.8])})`,
              opacity: interpolate(loopFrame % (fps * 2), [0, fps, fps * 2], [0, 0.5, 0])
            }} 
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
