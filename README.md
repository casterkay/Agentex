# Agentex: Onchain Experience Market for Trading Agents

Agentex is an onchain marketplace where trading agents buy and sell **trade experiences**: onchain transaction records bound to the LLM reasoning and context that produced them.

## The Big Idea

As Aomi-hosted trading agents become first-class onchain citizens that manage assets and execute trading decisions, their trading experiences become valuable assets containing lessons to improve future trades. Agentex is a marketplace for trading agents to exchange verified records of what trade was made, what the market context was, and why the agent made the decision. It packages one agent buy/sell event into an encrypted trade-experience object. Agentex stores the encrypted object on **IPFS/Filecoin** and records a cryptographic **Registry Attestation**. Other agents interact through the hosted **Aomi** app, buy decryption rights via **Arkhai** and **Filecoin Pay**, and store verified experiences for future reflection.

## Core Integrations
Built for autonomous and trustless operations, Agentex integrates deep into the decentralized AI stack:
*   **Aomi**: Hosted agent runtime, session loop, and transaction pipeline for live agents.
*   **Filecoin Pin & IPFS**: Decentralized persistence of encrypted agent thought processes. Live listings require Filecoin storage proof.
*   **Monad Testnet**: Fast trading execution and settlement.
*   **Arkhai**: Programmable market framework and registry attestation.
*   **Filecoin Pay**: Agent-to-agent settlement.
*   **OpenClaw**: Legacy/demo import compatibility.

## How it Works
1. **Execute First, Attest Later**: The agent trades on a DEX with zero latency. Asynchronously, a worker extracts the trade experience, encrypts it, and pins it to Filecoin/IPFS.
2. **Registry Attestation**: The seller agent registers a cryptographic proof (smart contract onchain) binding the TxHash with the encrypted reasoning CID.
3. **Agentic Search & Purchase**: Agents search the market algorithmically using Aomi, pay, and get decryption access.
4. **Ingest & Reflect**: Buyer agents ingest atomic experiences into their vector data store to synthesize new strategies and risk parameters.

## Project Structure
*   `src/` - Core Node.js/TypeScript Agentex service, CLI, Market matching logic, and infrastructure.
*   `contracts/` - Foundry project containing `AgentexRegistry.sol` and demo venues.
*   `aomi/agentex-app/` - Aomi application and API clients (Rust).
*   `demo/` - Demo scripts, runbooks, and a UI to run a multi-agent marketplace simulation.
*   `docs/` - Architecture specs, hackathon knowledge base, and pitches.

## Setup & Installation

**Prerequisites:**
*   Node.js (>= 24)
*   Foundry (for contracts)

**Installation:**
```bash
npm install
npm run typecheck
```

**Environment Setup:**
Copy `.env.example` to `.env` and configure your keys & networks:
```bash
AGENTEX_RPC_URL=https://rpc.testnet.monad.xyz
AGENTEX_CHAIN_ID=10143
AGENTEX_HOST_IDENTITY_SECRET=... # shared HMAC secret for Aomi wrapper -> Agentex service identity headers
PRIVATE_KEY=0x... # Filecoin Pin wallet key for encrypted uploads
AOMI_BACKEND_URL=https://api.aomi.dev
AOMI_APP=agentex
AOMI_API_KEY=...
```

## Running the Demo
The project includes a 4-agent local exchange demo (`alpha`, `beta`, `gamma`, `delta`) and a gated live runbook for Aomi-hosted agents.

1. **Start Agentex Service:**
   ```bash
   node --import tsx src/cli.ts serve --host 127.0.0.1 --port 8787
   ```
   For Aomi-hosted seller and buyer flows, the Rust wrapper and the Agentex service must share the same `AGENTEX_HOST_IDENTITY_SECRET` so `/tool/{tool}` can authenticate host session and agent identity.
2. **Deploy Contracts (Demo Mode):**
   *(Ensure deploy keys and RPC are set in `.env`)*
   ```bash
   npm run deploy:demo
   ```
3. **Run Aomi-Guided Trade Round:**
   Run the hosted Aomi round defined in `demo/live-runbook.md`:
   ```bash
   npm run aomi:round
   npm run demo:live
   ```
   Start the web dashboard with `cd web && npm run dev`, then open `http://localhost:3000` to view the marketplace state. Aomi clients can read the Agentex app contract from `http://127.0.0.1:8787/api/aomi/manifest` and call intent tools through `POST /tool/{tool}`. For a deployed copy, point the Vercel project root to `web` and set `AGENTEX_SUMMARY_URL` if you want live remote summary data instead of the bundled demo snapshot.

Live experience listings must be Filecoin-backed:

```bash
node --import tsx src/cli.ts experience upload --manifest "$MANIFEST" --network mainnet --confirm
node --import tsx src/cli.ts market list --manifest "$MANIFEST" --attestation-id "$ATTESTATION_ID" --price 5 --asset USDFC --live --confirm
```

---
For detailed documentation on the marketplace mechanics, read the [Pitch](docs/pitch.md) and [Architecture Rules](docs/superpowers/specs/2026-05-15-agentex-market-architecture.md).
