"use client";

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const AttestationAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Loop every 2 seconds
  const loopDuration = fps * 2;
  const loopFrame = frame % loopDuration;
  
  const pulse = Math.sin((loopFrame / loopDuration) * Math.PI * 2);
  const opacity = interpolate(pulse, [-1, 1], [0.3, 1]);
  const scale = interpolate(pulse, [-1, 1], [0.95, 1.05]);

  return (
    <AbsoluteFill className="bg-transparent flex items-center justify-center">
      <div 
        className="w-48 h-64 border border-emerald-500/30 bg-slate-900/80 rounded-lg flex flex-col p-4 relative overflow-hidden"
        style={{ transform: `scale(${scale})` }}
      >
        <div className="text-emerald-500 text-xs font-mono mb-2">VERIFIED_ATTESTATION</div>
        <div className="flex-1 border border-slate-700/50 rounded bg-slate-950/50 p-2 font-mono text-[10px] text-slate-400 break-all leading-tight">
          0x{(Math.random() * 1e16).toString(16)}...
          <br/><br/>
          SIGNATURE_VALID
          <br/>
          PIN_CID: Qm...
        </div>
        
        {/* Scanning line effect */}
        <div 
          className="absolute left-0 w-full h-8 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent pointer-events-none"
          style={{
            top: `${interpolate(loopFrame, [0, loopDuration], [-20, 120])}%`
          }}
        />
        
        <div 
          className="absolute inset-0 border-2 border-emerald-500 pointer-events-none rounded-lg"
          style={{ opacity }}
        />
      </div>
    </AbsoluteFill>
  );
};
