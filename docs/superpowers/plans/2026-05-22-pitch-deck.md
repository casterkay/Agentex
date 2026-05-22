# Pitch Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Testimonial / Pitch Deck" presentation to the Agentex web app on a standalone `/pitch` route using Reveal.js and Remotion, highlighting the huge potential of MFRL.

**Architecture:** We will create a standalone route in Next.js (`/pitch`) that renders a Client Component. This component initializes Reveal.js and embeds Remotion `<Player>` instances within the slides to showcase ambient looping animations.

**Tech Stack:** Next.js, React, Tailwind CSS v4, Reveal.js, Remotion, @remotion/player.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Install Required Packages**
```bash
cd web
npm install reveal.js remotion @remotion/player
npm install -D @types/reveal.js
```
- [ ] **Step 2: Commit**
```bash
git add web/package.json web/package-lock.json
git commit -m "build: add reveal.js and remotion dependencies"
```

### Task 2: Create Remotion Animations

**Files:**
- Create: `web/src/components/animations/DataFlowAnimation.tsx`
- Create: `web/src/components/animations/AttestationAnimation.tsx`
- Create: `web/src/components/animations/MFRLAnimation.tsx`

- [ ] **Step 1: Implement `DataFlowAnimation`**
Create a looping animation representing encrypted memory objects transferring between nodes.
- [ ] **Step 2: Implement `AttestationAnimation`**
Create a glowing hash validation sequence representing the Registry Attestation and Filecoin Pin.
- [ ] **Step 3: Implement `MFRLAnimation`**
Create a feedback loop graphic mapping to `https://arxiv.org/abs/2509.11420` (Market Feedback Reinforcement Learning). Show trade experience data refining an LLM.
- [ ] **Step 4: Verify visually**
Temporarily embed these into `web/src/app/page.tsx` and run `npm run dev` to verify they play cleanly. Revert the temporary embed.
- [ ] **Step 5: Commit**
```bash
git add web/src/components/animations/
git commit -m "feat: implement remotion animation loops for pitch deck"
```

### Task 3: Create the Reveal.js Wrapper Component

**Files:**
- Create: `web/src/components/PitchDeck.tsx`

- [ ] **Step 1: Implement PitchDeck Client Component**
Import Reveal.js themes and structure the HTML (`.reveal > .slides > section`).
Initialize Reveal.js in a `useEffect` on mount.
Include the 5 specified slides (Title, Problem, Insight, Product, Future/MFRL) embedding the Remotion `Player` components into the respective slides.
- [ ] **Step 2: Verify component compiles**
Run `npm run build` in `web` to ensure no weird SSR/Client Component errors occur with Reveal.js and Remotion imports.
- [ ] **Step 3: Commit**
```bash
git add web/src/components/PitchDeck.tsx
git commit -m "feat: create reveal.js pitch deck component"
```

### Task 4: Setup Pitch Page Route and Entry Point

**Files:**
- Create: `web/src/app/pitch/page.tsx`
- Modify: `web/src/app/page.tsx`

- [ ] **Step 1: Implement Route Page**
Create `web/src/app/pitch/page.tsx`. Import and render the `PitchDeck` component.
Ensure global styles do not conflict negatively with Reveal's layout (set height/width appropriately).
- [ ] **Step 2: Add Navigation Link**
In `web/src/app/page.tsx`, add a link to `/pitch` named "Testimonial" or "Pitch Deck" adjacent to the "Live Network" pill in the header.
- [ ] **Step 3: Manual Verification**
Run `npm run dev` and test clicking the link on the home page. Ensure the transition to `/pitch` is smooth and the presentation displays the Remotion animations properly.
- [ ] **Step 4: Commit**
```bash
git add web/src/app/pitch/page.tsx web/src/app/page.tsx
git commit -m "feat: add pitch deck route and navigation link"
```
