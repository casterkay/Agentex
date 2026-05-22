"use client";

import React, { useEffect, useRef } from "react";
import { Player } from "@remotion/player";

import "reveal.js/reveal.css";
import "reveal.js/theme/black.css";

// Dynamic import for reveal.js since it needs browser environment
import type Reveal from "reveal.js";

import { DataFlowAnimation } from "./animations/DataFlowAnimation";
import { AttestationAnimation } from "./animations/AttestationAnimation";
import { MFRLAnimation } from "./animations/MFRLAnimation";

export default function PitchDeck() {
  const deckRef = useRef<HTMLDivElement>(null);
  const revealInstance = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const initReveal = async () => {
      if (!deckRef.current || revealInstance.current) return;

      try {
        const Reveal = (await import("reveal.js")).default;
        
        if (!isMounted) return;

        const deck = new Reveal(deckRef.current, {
          embedded: true,
          hash: true,
          transition: "slide",
          backgroundTransition: "fade",
          controls: true,
          progress: true,
        });

        revealInstance.current = deck;
        await deck.initialize();
      } catch (error) {
        console.error("Failed to initialize Reveal.js:", error);
      }
    };

    initReveal();

    return () => {
      isMounted = false;
      if (revealInstance.current) {
        try {
          revealInstance.current.destroy();
          revealInstance.current = null;
        } catch (e) {
          console.warn("Reveal.js destroy cleanup failed", e);
        }
      }
    };
  }, []);

  return (
    <div className="reveal h-full w-full bg-slate-950" ref={deckRef}>
      <div className="slides">
        
        {/* Slide 1: Title */}
        <section>
          <h1 className="text-5xl font-bold text-slate-50 tracking-tight">Agentex</h1>
          <h3 className="text-2xl text-emerald-400 mt-4">The Onchain Experience Market</h3>
          <p className="text-slate-400 mt-8 text-sm uppercase tracking-widest">A cryptographic proof of reasoning</p>
        </section>

        {/* Slide 2: The Problem */}
        <section>
          <div className="flex w-full items-center justify-between">
            <div className="w-1/2 text-left">
              <h2 className="text-4xl font-bold text-slate-50 mb-6">The Problem</h2>
              <ul className="text-xl text-slate-300 space-y-4">
                <li>Agent learning is siloed.</li>
                <li>No cryptographic proof of reasoning.</li>
                <li>Latency kills execution.</li>
              </ul>
            </div>
            <div className="w-1/2 flex justify-center">
               <Player
                  component={DataFlowAnimation}
                  durationInFrames={90}
                  compositionWidth={400}
                  compositionHeight={300}
                  fps={30}
                  autoPlay
                  loop
                  style={{ width: "100%", height: "300px" }}
                />
            </div>
          </div>
        </section>

        {/* Slide 3: The Insight */}
        <section>
          <h2 className="text-4xl font-bold text-slate-50 mb-8">The Insight</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-lg">
              <div className="text-emerald-400 mb-2">01</div>
              <h4 className="text-xl text-slate-200">RAG + OpenClaw</h4>
            </div>
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-lg">
              <div className="text-emerald-400 mb-2">02</div>
              <h4 className="text-xl text-slate-200">Atomic Experiences</h4>
            </div>
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-lg">
              <div className="text-emerald-400 mb-2">03</div>
              <h4 className="text-xl text-slate-200">Trading the "Why"</h4>
            </div>
          </div>
        </section>

        {/* Slide 4: The Product */}
        <section>
          <div className="flex w-full items-center justify-between space-x-8">
            <div className="w-1/2 flex justify-center">
               <Player
                  component={AttestationAnimation}
                  durationInFrames={60}
                  compositionWidth={300}
                  compositionHeight={400}
                  fps={30}
                  autoPlay
                  loop
                  style={{ width: "100%", height: "400px" }}
                />
            </div>
            <div className="w-1/2 text-left">
              <h2 className="text-4xl font-bold text-slate-50 mb-6">The Product</h2>
              <ul className="text-xl text-slate-300 space-y-4">
                <li>Zero latency execution</li>
                <li>Filecoin/IPFS storage</li>
                <li>Registry Attestations</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Slide 5: The Future, MFRL */}
        <section>
          <h2 className="text-4xl font-bold text-slate-50 mb-4">The Future (MFRL)</h2>
          <p className="text-sm text-slate-400 mb-8">
            Market Feedback Reinforcement Learning (<a href="https://arxiv.org/abs/2509.11420" target="_blank" rel="noreferrer" className="text-indigo-400">arXiv:2509.11420</a>)
          </p>
          <div className="flex justify-center mb-8">
            <Player
                component={MFRLAnimation}
                durationInFrames={120}
                compositionWidth={400}
                compositionHeight={400}
                fps={30}
                autoPlay
                loop
                style={{ width: "100%", height: "400px" }}
              />
          </div>
          <p className="text-lg text-slate-300">
            Using aggregated experience assets from Agentex to fine-tune next-generation trading LLMs.
          </p>
        </section>

      </div>
    </div>
  );
}
