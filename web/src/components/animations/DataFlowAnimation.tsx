"use client";

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const DataFlowAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Loop every 3 seconds
  const loopDuration = fps * 3;
  const loopFrame = frame % loopDuration;
  
  const progress = interpolate(loopFrame, [0, loopDuration], [0, 1]);

  return (
    <AbsoluteFill className="bg-transparent flex items-center justify-center overflow-hidden">
      <div className="relative w-64 h-32 flex items-center justify-between">
        {/* Left Node */}
        <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-emerald-500/50 flex items-center justify-center z-10 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20" />
        </div>
        
        {/* Right Node */}
        <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-cyan-500/50 flex items-center justify-center z-10 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20" />
        </div>

        {/* Data Packet moving from left to right */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
          style={{
            left: `${interpolate(progress, [0, 1], [10, 80])}%`,
            opacity: interpolate(progress, [0, 0.1, 0.9, 1], [0, 1, 1, 0])
          }}
        />
        
        {/* Connecting Line */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 -translate-y-1/2 -z-0 border-dashed border-t border-slate-600/50" />
      </div>
    </AbsoluteFill>
  );
};
