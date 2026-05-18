# Agentex Live V1 Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the smallest end-to-end Agentex V1 demo where at least three trading agents sell and
buy encrypted trade experiences bound to whitelisted onchain trades by registry attestations.

**Architecture:** Keep one compact TypeScript core and one minimal Solidity registry. The demo runs a
closed three-agent loop: `alpha` sells to `beta`, `beta` sells to `gamma`, and `gamma` sells to
`alpha`. Each sale proves the same spine: extracted experience, encrypted/pinned payload, signed
execution proof, registry attestation, listing, purchase, decrypt, verify, ingest.

**Tech Stack:** TypeScript 5, Node.js 24, commander, node:test, viem, Solidity/Foundry, Filecoin Pin
upload path in `src/filecoin.ts`.

---

## Non-Negotiable Demo Cut

Ship only this path:

```text
3 OpenClaw-style agent fixtures
-> 3 extracted trade experiences
-> 3 encrypted payloads pinned to IPFS/Filecoin
-> 3 signed execution proofs for one whitelisted demo venue
-> 3 registry attestations deployed onchain
-> 3 listings
-> 3 purchases in a closed loop
-> 3 decrypted-hash verifications
-> 3 buyer inbox imports
```

Closed loop:

```text
alpha -> beta
beta  -> gamma
gamma -> alpha
```

## Hard Cuts

- No Kubernetes or Kind cluster.
- No broad UI.
- No multi-venue support.
- No autonomous trading wrapper.
- No offchain broker/CEX support.
- No quality scoring unless the core loop is already passing.
- No settlement automation beyond purchase receipts and explicit payment references.
- No ERC-8004 metadata, Aomi app, Filecoin Pay, or Arkhai until the three-agent loop is deployed.

## Deployment Shape

Use a real deployed registry contract plus local demo agents.

Supported deployment modes:

- **Local onchain smoke:** `anvil` plus `forge script --broadcast`, with `AGENTEX_STORAGE_MODE=local`.
- **Public live demo:** any EVM testnet with a funded deployer wallet, RPC URL, and
  `AGENTEX_STORAGE_MODE=filecoin`.

The demo is complete when the runbook prints:

```text
registry=<address>
agents=alpha,beta,gamma
attestations=3
listings=3
purchases=3
verified=3
imports=3
```

## File Map

- Create `src/experience.ts`: trade-experience schema, extraction, encryption, decryption, hash
  verification, review-directory export.
- Create `src/venue.ts`: whitelisted venue config, execution-proof schema, signer verification,
  price-closeness validation.
- Create `src/registry.ts`: registry-attestation schema, local validation, onchain calldata/receipt
  helpers.
- Create `contracts/AgentexExperienceRegistry.sol`: minimal onchain attestation registry.
- Create `script/DeployAgentexExperienceRegistry.s.sol`: Foundry deploy script.
- Create `foundry.toml`: minimal Foundry config.
- Modify `src/filecoin.ts`: expose a deterministic local CID fallback and real Filecoin upload path
  behind the same return shape.
- Modify `src/market.ts`: experience listing and purchase receipts.
- Modify `src/tools.ts`: compact Aomi-compatible tool surface.
- Modify `src/cli.ts`: `experience`, `venue`, `registry`, `market`, and `demo` commands.
- Modify `src/index.ts`: export new modules.
- Rewrite `test/agentex.test.ts`: focused live-spine tests.
- Create `demo/live-v1/.env.example`: deploy and demo environment variables.
- Create `demo/live-v1/README.md`: exact end-to-end runbook.
- Create `demo/live-v1/run-three-agent-loop.sh`: one command for the final demo.
- Create `demo/live-v1/agents/alpha/.openclaw/memory/2026-05-18.md`.
- Create `demo/live-v1/agents/alpha/activity/trade.json`.
- Create `demo/live-v1/agents/beta/.openclaw/memory/2026-05-18.md`.
- Create `demo/live-v1/agents/beta/activity/trade.json`.
- Create `demo/live-v1/agents/gamma/.openclaw/memory/2026-05-18.md`.
- Create `demo/live-v1/agents/gamma/activity/trade.json`.
- Create `demo/live-v1/agents/alpha/inbox/.gitkeep`.
- Create `demo/live-v1/agents/beta/inbox/.gitkeep`.
- Create `demo/live-v1/agents/gamma/inbox/.gitkeep`.

## Task 1: Experience Payload Core

**Files:**
- Create: `src/experience.ts`
- Modify: `src/shared.ts`
- Test: `test/agentex.test.ts`

- [ ] Add `TradeExperience`, `EncryptedExperiencePayload`, and `ExperienceManifest` types.
- [ ] Implement `extractTradeExperience({ memoryPath, activityPath, outDir })`.
- [ ] Implement `encryptTradeExperience({ experiencePath, key })`.
- [ ] Implement `verifyExperiencePayload({ manifestPath, key })`.
- [ ] Implement `exportExperienceForReview({ manifestPath, key, out })`.
- [ ] Test extraction for exactly one buy/sell experience.
- [ ] Test that encrypted payload does not expose pre-trade reasoning.
- [ ] Test that decrypted hash mismatches fail closed.
- [ ] Run:

```bash
npm test
npm run typecheck
```

## Task 2: Whitelisted Venue Execution Proof

**Files:**
- Create: `src/venue.ts`
- Test: `test/agentex.test.ts`

- [ ] Add one demo venue ID: `demo-uniswap-v2`.
- [ ] Add `ExecutionProof` type with chain ID, venue ID, trade TxHash, pair, side, size, actual fill
  price, execution block/time, decoder ID, and decoder signature.
- [ ] Implement deterministic local proof signing.
- [ ] Implement proof verification and price-closeness check.
- [ ] Test valid proof acceptance.
- [ ] Test wrong pair, wrong side, wrong signer, duplicate TxHash, and out-of-tolerance price
  rejection.
- [ ] Run:

```bash
npm test
npm run typecheck
```

## Task 3: Minimal Registry Contract And Deploy Script

**Files:**
- Create: `contracts/AgentexExperienceRegistry.sol`
- Create: `script/DeployAgentexExperienceRegistry.s.sol`
- Create: `foundry.toml`
- Create: `src/registry.ts`
- Test: `test/agentex.test.ts`

- [ ] Add a minimal contract that stores accepted attestation hashes and emits
  `ExperienceAttested`.
- [ ] Keep contract fields compact: seller, chain ID, venue ID, trade TxHash, encrypted CID,
  decrypted hash, execution proof hash, execution timestamp, attestation deadline.
- [ ] Enforce fixed deadline from execution timestamp.
- [ ] Enforce duplicate/conflict rejection by `(seller, chainId, tradeTxHash)`.
- [ ] Add deploy script reading `ATTESTATION_WINDOW_SECONDS`.
- [ ] Make the deploy script write the deployed address to
  `demo/live-v1/out/registry-address.txt`.
- [ ] Verify contract compilation:

```bash
forge build
```

- [ ] In TypeScript, implement `createRegistryAttestation`.
- [ ] In TypeScript, implement `submitRegistryAttestation` with viem.
- [ ] In TypeScript, implement local validation mirroring the contract checks.
- [ ] Test deadline rejection, duplicate rejection, accepted attestation receipt creation, and
  calldata generation.
- [ ] Run:

```bash
npm test
npm run typecheck
forge build
```

## Task 4: Filecoin/IPFS Storage Path

**Files:**
- Modify: `src/filecoin.ts`
- Modify: `src/experience.ts`
- Test: `test/agentex.test.ts`

- [ ] Add `storeEncryptedExperience({ manifestPath, payloadPath, mode })`.
- [ ] Support `mode=local` for deterministic `local:<sha256>` smoke-test fallback.
- [ ] Support `mode=filecoin` using existing Filecoin upload plumbing.
- [ ] Store the returned encrypted CID/ref in the manifest and later listing.
- [ ] Test local mode.
- [ ] Test Filecoin mode input validation without requiring live credentials.
- [ ] Run:

```bash
npm test
npm run typecheck
```

## Task 5: Experience Listing And Purchase

**Files:**
- Modify: `src/market.ts`
- Test: `test/agentex.test.ts`

- [ ] Replace listing fields with experience fields: attestation ID, experience ID, encrypted CID,
  decrypted hash, public trade summary, price, asset, delivery requirement, status.
- [ ] Replace purchase receipt fields with buyer, seller, listing ID, attestation ID, encrypted CID,
  decrypted hash, payment reference, delivery proof, and verification statuses.
- [ ] Require accepted attestation status before listing.
- [ ] Test that unaccepted attestations cannot be listed.
- [ ] Test that purchase receipts bind the same encrypted CID and decrypted hash as the listing.
- [ ] Run:

```bash
npm test
npm run typecheck
```

## Task 6: CLI, HTTP Tools, And Demo Command

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/tools.ts`
- Modify: `src/index.ts`
- Test: `test/agentex.test.ts`

- [ ] Add CLI commands:

```bash
agentex experience extract
agentex experience encrypt
agentex experience store
agentex experience verify
agentex experience export
agentex venue proof
agentex registry attest
agentex market list
agentex market buy
agentex demo run-three-agent-loop
```

- [ ] Add HTTP/Aomi-compatible tools:

```text
inspect_openclaw_activity
extract_trade_experience
encrypt_trade_experience
store_encrypted_experience
create_execution_proof
prepare_registry_attestation
submit_registry_attestation
create_experience_listing
create_experience_purchase
verify_experience_delivery
prepare_experience_ingestion
```

- [ ] Keep every write tool prepare-first with `confirm:true`.
- [ ] Test one CLI happy path by invoking:

```bash
node --import tsx src/cli.ts experience extract \
  --memory demo/live-v1/agents/alpha/.openclaw/memory/2026-05-18.md \
  --activity demo/live-v1/agents/alpha/activity/trade.json \
  --out demo/live-v1/out/alpha
```
- [ ] Test one HTTP tool call through `createAgentexServer`.
- [ ] Run:

```bash
npm test
npm run typecheck
```

## Task 7: Three-Agent Fixtures

**Files:**
- Create: `demo/live-v1/.env.example`
- Create: `demo/live-v1/agents/alpha/.openclaw/memory/2026-05-18.md`
- Create: `demo/live-v1/agents/alpha/activity/trade.json`
- Create: `demo/live-v1/agents/beta/.openclaw/memory/2026-05-18.md`
- Create: `demo/live-v1/agents/beta/activity/trade.json`
- Create: `demo/live-v1/agents/gamma/.openclaw/memory/2026-05-18.md`
- Create: `demo/live-v1/agents/gamma/activity/trade.json`
- Create: `demo/live-v1/agents/alpha/inbox/.gitkeep`
- Create: `demo/live-v1/agents/beta/inbox/.gitkeep`
- Create: `demo/live-v1/agents/gamma/inbox/.gitkeep`

- [ ] Add one memory file per agent with pre-trade context, decision reasoning, and immediate
  post-trade reflection.
- [ ] Add one activity record per agent with matching trade fields:
  - `alpha`: ETH/USDC buy
  - `beta`: SOL/USDC sell
  - `gamma`: WBTC/USDC buy
- [ ] Add `.env.example`:

```bash
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
REGISTRY_ADDRESS=
ATTESTATION_WINDOW_SECONDS=900
AGENTEX_EXPERIENCE_KEY=0123456789abcdef0123456789abcdef
AGENTEX_STORAGE_MODE=filecoin
FILECOIN_PRIVATE_KEY=
DEMO_DECODER_SECRET=demo-decoder-secret
DEMO_PRICE_TOLERANCE_BPS=50
```

- [ ] Run fixture extraction for all three agents.

## Task 8: End-To-End Deployment Runbook

**Files:**
- Create: `demo/live-v1/README.md`
- Create: `demo/live-v1/run-three-agent-loop.sh`

- [ ] Write the local onchain smoke commands:

```bash
npm install
npm test
npm run typecheck
forge build
anvil
source demo/live-v1/.env
export AGENTEX_STORAGE_MODE=local
forge script script/DeployAgentexExperienceRegistry.s.sol:DeployAgentexExperienceRegistry \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
test -s demo/live-v1/out/registry-address.txt
export REGISTRY_ADDRESS="$(cat demo/live-v1/out/registry-address.txt)"
```

- [ ] Write the public live deployment command:

```bash
source demo/live-v1/.env
export AGENTEX_STORAGE_MODE=filecoin
forge script script/DeployAgentexExperienceRegistry.s.sol:DeployAgentexExperienceRegistry \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --verify
test -s demo/live-v1/out/registry-address.txt
export REGISTRY_ADDRESS="$(cat demo/live-v1/out/registry-address.txt)"
```

- [ ] Write the service startup command:

```bash
node --import tsx src/cli.ts serve --host 127.0.0.1 --port 8787
```

- [ ] Write the scripted three-agent loop command:

```bash
bash demo/live-v1/run-three-agent-loop.sh
```

- [ ] Make the script run this exact loop:
  - alpha extracts, encrypts, stores, proves, attests, lists
  - beta extracts, encrypts, stores, proves, attests, lists
  - gamma extracts, encrypts, stores, proves, attests, lists
  - beta buys alpha
  - gamma buys beta
  - alpha buys gamma
  - each buyer verifies and exports the purchased experience into its inbox

- [ ] Make the script write final artifacts under `demo/live-v1/out/`:

```text
alpha/manifest.json
alpha/payload.enc.json
alpha/execution-proof.json
alpha/attestation.json
alpha/listing.json
beta/purchase-alpha.json
beta/inbox/<alpha-experience-id>/experience.md
beta/manifest.json
beta/payload.enc.json
beta/execution-proof.json
beta/attestation.json
beta/listing.json
gamma/purchase-beta.json
gamma/inbox/<beta-experience-id>/experience.md
gamma/manifest.json
gamma/payload.enc.json
gamma/execution-proof.json
gamma/attestation.json
gamma/listing.json
alpha/purchase-gamma.json
alpha/inbox/<gamma-experience-id>/experience.md
summary.json
```

- [ ] Make `summary.json` include:

```json
{
  "registry": "0x1111111111111111111111111111111111111111",
  "agents": ["alpha", "beta", "gamma"],
  "attestations": 3,
  "listings": 3,
  "purchases": 3,
  "verified": 3,
  "imports": 3
}
```

## Task 9: Final Deployment Check

**Files:**
- Modify only if verification reveals a real gap.

- [ ] Run:

```bash
npm test
npm run typecheck
forge build
```

- [ ] Run the local onchain smoke from `demo/live-v1/README.md`.
- [ ] Run the public live deployment from `demo/live-v1/README.md` when RPC, wallet, and Filecoin
  credentials are available.
- [ ] Run:

```bash
bash demo/live-v1/run-three-agent-loop.sh
cat demo/live-v1/out/summary.json
```

- [ ] Confirm the final demo shows:
  - deployed registry address
  - three encrypted experience refs/CIDs
  - three signed execution proofs
  - three registry attestations
  - three live listings
  - three purchase receipts
  - three decrypted-hash verifications
  - three buyer inbox imports

## Optional After The Core Demo Works

Add these only after Task 9 passes:

- ERC-8004 registration metadata.
- Aomi app surface around the HTTP tools.
- Filecoin Pay or Arkhai settlement integration.
- Fourth agent.

## Acceptance Criteria

- A reviewer can run one documented command sequence and see a deployed three-agent experience
  market loop.
- At least three agents participate as both sellers and buyers.
- Each experience is encrypted before listing.
- Each public record binds trade summary, encrypted ref/CID, decrypted hash, execution proof, and
  seller attestation.
- The fixed attestation deadline and price-closeness checks are enforced.
- Each buyer decrypts and verifies the exact purchased payload.
- The final summary reports `attestations=3`, `listings=3`, `purchases=3`, `verified=3`, and
  `imports=3`.
