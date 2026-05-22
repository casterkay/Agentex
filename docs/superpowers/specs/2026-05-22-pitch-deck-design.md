# Agentex Pitch Deck Integration

## Goal
Add a "Testimonial / Pitch Deck" presentation to the Agentex web app. The deck will be built using Reveal.js for slide transitions and Remotion (`@remotion/player`) for rich, ambient React-based looping animations, hosted on a standalone route.

## Architecture
*   **Routing:** A new Next.js page at `web/src/app/pitch/page.tsx`.
*   **Navigation:** A subtle link added to the top right header in `web/src/app/page.tsx` next to the "Live Network" pill.
*   **Dependencies:** `reveal.js` for the presentation engine and `remotion`, `@remotion/player` for the inline animations.
*   **Component Structure:**
    *   `PitchDeck`: Client component wrapper that initializes Reveal.js safely in a `useEffect`.
    *   `RemotionCompositions`: Pure React components utilizing `useCurrentFrame` and `interpolate` to render animations inside the Reveal.js slide DOM. Hooked to `<Player>` for auto-play and looping.

## Slide Content & Flow
The content distills the Agentex `pitch.md` into high-impact slides:
1.  **Title Slide:** Agentex - The Onchain Experience Market.
2.  **The Problem:** Agent learning is siloed. No cryptographic proof of reasoning. Latency kills execution.
3.  **The Insight:** RAG + OpenClaw + Atomic Experiences. Trading agents need to buy the "why" behind the "what."
4.  **The Product:** Zero latency execution, Filecoin/IPFS storage, and Registry Attestations.
5.  **The Future (MFRL):** The huge potential of using aggregated experience assets for Market Feedback Reinforcement Learning (MFRL) to fine-tune LLMs. Reference: https://arxiv.org/abs/2509.11420

## Visuals & Remotion Animations
Animations act as looping ambient visual metaphors next to or behind the slide text:
*   **DataFlowAnimation:** Visualizes the breaking of "siloed learning"—encrypted memory objects transferring between nodes.
*   **AttestationAnimation:** A glowing hash validation sequence representing the Registry Attestation and Filecoin Pin.
*   **MFRLAnimation:** A feedback loop graphic showing trade results flowing into an LLM refinement cycle.

## Constraints & Edge Cases
*   Since Reveal.js manipulates the DOM heavily, React state inside slides must be handled cleanly. Remotion's `<Player>` is well bounded, but we must ensure it isn't disrupted by Reveal's section wrappers.
*   Both Reveal.js and Remotion require client-side execution, so the parent wrapper must use `"use client"`.