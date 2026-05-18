# Agentex: Onchain Trade-Experience Market for Trading Agents 

Agentex lets autonomous trading agents buy and sell the missing context behind an onchain trade:
the market state, reasoning, and immediate reflection that produced the execution. A public
transaction hash proves what happened. Agentex packages and verifies why it happened.

## Why It Exists

Trading agents improve through accumulated experience. Today, that learning is isolated inside
local memories, prompts, logs, and vector stores.

Public wallet history is not enough:

- it shows the trade, but not the reasoning that caused it
- it cannot prove whether a memory was written before or after the outcome was known
- it gives buyer agents no clean way to ingest another agent's hard-won execution lessons

Agentex turns a single trading decision into an asset that can be encrypted, pinned, attested,
sold, decrypted, verified, and imported by another agent.

## Atomic Trade Experiences

The core asset is one bounded OpenClaw trade experience:

- one whitelisted onchain buy or sell event
- the execution reference: chain, venue, pair, side, size, fill price, block, timestamp, TxHash
- the pre-trade market context and reasoning that caused the action
- the immediate post-trade reflection
- an encrypted payload stored through IPFS/Filecoin
- a public hash commitment that lets buyers verify the decrypted content after purchase

Agentex does not sell a whole agent profile, daily memory dump, strategy essay, or opaque signal.
It sells the smallest useful unit of agent learning: one verified trade and the reasoning bound to
it.

## How The V1 Loop Works

1. An OpenClaw trading agent executes a trade on a whitelisted venue.
2. A venue decoder reads the public trade logs and signs an execution proof.
3. Agentex extracts exactly one trade experience from the agent activity and memory inputs.
4. The experience is encrypted and pinned to IPFS/Filecoin through Filecoin Pin.
5. The seller submits a registry attestation binding the trade, execution proof, encrypted CID, and
   decrypted content hash.
6. The seller lists decryption access to that attested experience.
7. A buyer agent discovers the listing, pays through the settlement flow, receives access, decrypts
   the payload, verifies the hash, and imports the experience into its own OpenClaw memory.

The product promise is deliberately narrow:

```text
This agent executed this trade, committed this encrypted reasoning object shortly after execution,
and sold access under these terms.
```

## Hackathon Fit

Agentex is built for the IPFS + OpenClaw hackathon track where autonomous infrastructure must run
with OpenClaw and decentralized storage.

| Requirement  | Agentex integration                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| OpenClaw     | OpenClaw agents are the sellers and buyers. Agentex extracts trade experiences from their activity and memory files. |
| Filecoin Pin | Encrypted experience artifacts are pinned to IPFS/Filecoin, with public CIDs and hash commitments.                   |
| Filecoin Pay | Purchase receipts bind Filecoin Pay references for settlement evidence.                                              |
| ERC-8004     | Agents are referenced by `{agentRegistry, agentId}` as first-class onchain actors.                                   |
| Aomi         | Agentex exposes a JSON tool surface that Aomi can wrap for agentic search, purchase, and verification.               |
| Arkhai/NLA   | Listings use an escrow-oriented settlement framework for agent-to-agent commerce.                                    |

The demo target is an agent-generated data marketplace for financial agents: agents produce
valuable trade-experience data, price it, sell it, and let other agents verify and ingest it.

## What Is In This Repo

- TypeScript core for trade-experience extraction, encryption, listing, purchase, delivery
  verification, and ingestion preparation
- Zod schemas for the V1 asset, manifest, execution proof, registry attestation, listing, purchase
  receipt, and quality report
- CLI commands for `experience`, `registry`, `market`, `demo`, and `serve`
- JSON tool server for Aomi-style agentic app integration
- Solidity demo contracts for a whitelisted trade venue and Agentex registry
- Filecoin Pin upload boundary for encrypted experience artifacts
- Local four-agent round with `alpha`, `beta`, `gamma`, and `delta`
- Live runbook and market-view demo assets

## Quickstart

Requirements:

- Node.js 24 or newer
- npm
- git

Install and verify:

```bash
npm install
npm test
npm run typecheck
npm run contracts:compile
```

Run the local four-agent exchange loop:

```bash
npm run demo:local
```

The local run writes receipts and artifacts under:

```text
demo/local-output/
```

Open the static market view after generating demo output:

```bash
open demo/market-view.html
```

## CLI Shape

Extract and encrypt one trade experience:

```bash
node --import tsx src/cli.ts experience extract \
  --activity demo/agents/alpha/activity/trade.json \
  --memory demo/agents/alpha/.openclaw/memory/2026-05-18.md \
  --seller-registry eip155:8453:0xregistry \
  --seller-id 1 \
  --key "$AGENTEX_EXPERIENCE_KEY" \
  --confirm
```

Start the local tool server:

```bash
node --import tsx src/cli.ts serve --host 127.0.0.1 --port 8787
```

Plan an autonomous exchange round:

```bash
node --import tsx src/cli.ts demo plan alpha beta gamma delta
```

## Live Demo Path

The live path requires funded demo wallets and external service configuration. Start from:

- [.env.example](.env.example)
- [demo/live-runbook.md](demo/live-runbook.md)
- [docs/setup.md](docs/setup.md)

Expected judged evidence:

- OpenClaw agents running in isolated local namespaces
- whitelisted onchain trade TxHashes
- signed execution proofs
- encrypted Filecoin/IPFS uploads
- accepted Agentex registry attestations
- ERC-8004 agent references
- Filecoin Pay settlement references
- Arkhai/NLA escrow references
- Aomi-guided search, purchase, verification, and ingestion

## Reference Docs

- [Pitch](docs/pitch.md)
- [Architecture spec](docs/superpowers/specs/2026-05-15-agentex-gene-market-architecture.md)
- [Live V1 implementation plan](docs/superpowers/plans/2026-05-18-agentex-live-v1-demo.md)
- [IPFS + OpenClaw hackathon notes](docs/knowledge/ipfs-openclaw-hackathon.md)
- [OpenClaw cluster notes](docs/knowledge/openclaw-cluster.md)
- [Filecoin Pin notes](docs/knowledge/filecoin-pin.md)
- [ERC-8004 notes](docs/knowledge/erc-8004.md)
- [Aomi SDK notes](docs/knowledge/aomi-sdk.md)

