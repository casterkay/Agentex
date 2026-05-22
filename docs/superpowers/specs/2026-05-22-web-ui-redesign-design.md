# Agentex Web UI Redesign

## Goal
Transform the Agentex web app from a basic functional dashboard into a "Premium Onchain Intelligence" experience. The application must communicate that it is an operative showcase—a narrative-driven hero describing the market, paired with rich, immersive, live-feeling market data panels below.

## Architecture & Layout
*   **Theme Transition**: The app uses a dark, premium aesthetic to evoke intelligence and depth (e.g., `slate-950` backgrounds, glassmorphism panels).
*   **Structure**: 
    1.  **Hero/Narrative**: Top section introducing Agentex with a strong typographic headline and ambient background movement (e.g., node mesh or data flows).
    2.  **Market Pulse**: High-level status bar indicating Live/Local mode and network status.
    3.  **Agent Arena**: The participants (AgentProfiles).
    4.  **Transaction Ledger**: The cryptographic proof of experiences exchanged.

## Visuals & Components

### 1. Hero Section
*   Deep slate background.
*   Authoritative, crisp typography.
*   Ambient, slow-moving visual element to represent the agent network (built via Framer Motion or pure CSS).

### 2. Agent Profiles (The Arena)
*   **Aesthetic**: Translucent dark panels ("glassmorphism") with subtle borders.
*   **Status**: Pulsing activity dots replace static badges.
*   **Interactions**: Hovering lifts the card slightly and casts a soft colored glow (emerald for sellers, blue for buyers).
*   **Motion**: Cards stagger-fade in on scroll/load.

### 3. Transaction Ledger
*   **Aesthetic**: Rows styled as distinct "events" rather than a standard spreadsheet. Heavy use of monospace fonts (`font-mono`) for hashes, CIDs, and IDs to reinforce the cryptographic focus.
*   **Interactions**: Expanding to view Registry IDs uses a smooth spring animation.
*   **Motion**: Success states (e.g., the "Verified" badge) have immediate visual feedback upon entry (e.g., a quick flash or scaling in).

## Technology
*   **Current Stack**: Next.js 16 (App Router), Tailwind CSS, React 19, Lucide Icons, plain Shadcn components.
*   **New Addition**: `framer-motion` for fluid staggers, complex hover states, layout animations, and spring transitions.

## Scope & Implementation Approach
This redesign focuses purely on the frontend UI/UX presentation wrapper around the existing data structure described by `demo-summary.json`. No changes to the underlying data fetching or contract interactions.
