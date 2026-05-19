# Agentex Live V1 Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a live V1 demo where four OpenClaw trading agents create, attest, list, buy, verify, and ingest encrypted trade experiences.

**Architecture:** Keep the existing TypeScript CLI and JSON tool server as the Agentex service spine, but replace the current profile-gene asset with the spec's trade-experience asset. Add two minimal Solidity contracts: a whitelisted demo trading venue that emits decodable buy/sell fills, and an Agentex registry that verifies signed decoder proofs, seller signatures, deadlines, duplicate trades, and fill-price tolerance.

**Tech Stack:** TypeScript, Node 24, node:test, viem, zod, Foundry, Solidity, Filecoin Pin, ERC-8004, Filecoin Pay, Arkhai/NLA, OpenClaw on Kind, Aomi REST tool wrapper.

---

## Fast Pace

Day 1: contracts, data contracts, local tests, one-agent experience loop.

Day 2: Filecoin upload, registry attestation, listing, purchase, delivery verification, four-agent local round.

Day 3: live deploy, ERC-8004 registration updates, Filecoin Pay and Arkhai receipts, Aomi-guided exchange, final market view.

Cut line: the judged demo must show real onchain trade TxHashes, real encrypted Filecoin uploads, real accepted registry attestations, and real verified purchase receipts. Sophisticated DEX routing, broad venue support, tokenomics, and profitability scoring are outside this V1 demo.

## File Structure

- Modify `package.json`: add scripts for tests, contract build, contract deploy, and live demo run.
- Modify `src/shared.ts`: keep hashing/stable JSON helpers; replace gene-specific exported types with shared `AgentRef`, `TradeSummary`, and verification status types.
- Create `src/contracts.ts`: viem clients, account loading, deployed address loading, typed contract calls.
- Create `src/experience.ts`: OpenClaw activity inspection, single-trade extraction, redaction, encryption, manifest creation, delivery verification, ingestion preparation.
- Create `src/venue.ts`: whitelisted demo venue decoder, execution-proof signing, execution-proof verification.
- Create `src/registry.ts`: registry-attestation preparation, submit, status verification, duplicate/conflict error mapping.
- Rewrite `src/market.ts`: experience listings, purchases, settlement receipts, delivery receipts, buyer feedback.
- Modify `src/filecoin.ts`: rename gene upload to experience upload and ensure only encrypted payload artifacts are uploaded.
- Modify `src/tools.ts`: expose exactly the spec's Aomi tool names and preserve prepare-first confirmation.
- Modify `src/cli.ts`: replace `gene` commands with `experience`, `registry`, `market`, and `demo` commands.
- Modify `src/index.ts`: keep it as a barrel only.
- Replace `test/agentex.test.ts`: focus on trade-experience lifecycle and four-agent exchange planning.
- Create `contracts/DemoTradeVenue.sol`: emits one normalized fill event per demo buy/sell.
- Create `contracts/AgentexRegistry.sol`: accepts only valid attested experiences.
- Create `foundry.toml`: Foundry config.
- Create `scripts/compile-contracts.ts`: compile contracts with `solc` and write ABI/bytecode artifacts for TypeScript deploys.
- Create `scripts/deploy-demo-contracts.ts`: deploy venue and registry; write `deployments/live-v1.json`.
- Create `scripts/run-local-v1.ts`: local four-agent dry run.
- Create `scripts/run-live-v1.ts`: live four-agent run from prepared env and agent configs.
- Create `demo/agents/{alpha,beta,gamma,delta}/`: committed sample memory/activity inputs for dry-run tests.
- Create `demo/live-runbook.md`: exact live commands, env vars, proof checklist, and judge script.
- Create `demo/market-view.html`: static market view fed by generated JSON receipts.
- Create `aomi/agentex-app/`: thin Aomi app wrapper over the Agentex JSON tool server if the Aomi SDK is available locally.

## Task 1: Lock V1 Contracts And Schemas

**Files:**
- Modify: `package.json`
- Modify: `src/shared.ts`
- Create: `src/schemas.ts`
- Replace: `test/agentex.test.ts`

- [x] **Step 1: Add runtime dependencies**

Run:

```bash
npm install viem zod
npm install --save-dev solc
```

Expected: `package.json` contains `viem`, `zod`, and `solc`; `package-lock.json` is updated.

- [x] **Step 2: Add schema-first tests**

Write tests in `test/agentex.test.ts` for these exact schema names:

```ts
assert.equal(experience.schema, "agentex.trade_experience.v1");
assert.equal(manifest.schema, "agentex.experience_manifest.v1");
assert.equal(attestation.schema, "agentex.registry_attestation.v1");
assert.equal(listing.schema, "agentex.market_listing.v1");
assert.equal(purchase.schema, "agentex.purchase_receipt.v1");
assert.equal(quality.schema, "agentex.experience_quality.v1");
```

Run:

```bash
npm test
```

Expected: FAIL because `src/schemas.ts` does not exist.

- [x] **Step 3: Implement V1 TypeScript schemas**

Create `src/schemas.ts` with zod schemas for the required fields in the architecture spec. Use snake_case field names in persisted JSON:

```ts
export const tradeExperienceSchema = z.object({
  schema: z.literal("agentex.trade_experience.v1"),
  experience_id: z.string().min(16),
  seller_agent: agentRefSchema,
  chain_id: z.number().int().positive(),
  whitelisted_venue_id: z.string().min(1),
  trade_tx_hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  pair: z.string().min(3),
  side: z.enum(["buy", "sell"]),
  size: z.string().min(1),
  fill_price: z.string().min(1),
  execution_block_number: z.number().int().positive(),
  execution_timestamp: z.string().datetime(),
  pre_trade_context_timestamp: z.string().datetime(),
  pre_trade_market_context: z.string().min(1),
  pre_trade_reasoning: z.string().min(1),
  post_trade_reflection_timestamp: z.string().datetime(),
  post_trade_reflection: z.string().min(1),
  source_memory_path: z.string().optional(),
});
```

Run:

```bash
npm test
npm run typecheck
```

Expected: PASS for schema tests and typecheck.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/shared.ts src/schemas.ts test/agentex.test.ts
git commit -m "feat: define trade experience schemas"
```

## Task 2: Add Minimal Live Contracts

**Files:**
- Create: `contracts/DemoTradeVenue.sol`
- Create: `contracts/AgentexRegistry.sol`
- Create: `foundry.toml`
- Create: `scripts/compile-contracts.ts`
- Create: `scripts/deploy-demo-contracts.ts`
- Create: `src/contracts.ts`
- Test: `test/agentex.test.ts`

- [x] **Step 1: Write contract behavior tests as TypeScript assertions**

Add tests that compile contracts with `solc` and assert ABI functions/events exist:

```ts
assert.ok(abiNames.includes("executeTrade"));
assert.ok(abiNames.includes("TradeExecuted"));
assert.ok(abiNames.includes("submitAttestation"));
assert.ok(abiNames.includes("AttestationAccepted"));
```

Run:

```bash
npm test
```

Expected: FAIL because contracts do not exist.

- [x] **Step 2: Create `DemoTradeVenue.sol`**

The contract must expose:

```solidity
event TradeExecuted(
    address indexed seller,
    bytes32 indexed tradeId,
    string pair,
    bool isBuy,
    uint256 size,
    uint256 fillPrice,
    uint256 executionTimestamp
);

function executeTrade(string calldata pair, bool isBuy, uint256 size, uint256 fillPrice)
    external
    returns (bytes32 tradeId);
```

The `tradeId` is `keccak256(abi.encode(block.chainid, address(this), msg.sender, pair, isBuy, size, fillPrice, block.number, block.timestamp))`.

- [ ] **Step 3: Create `AgentexRegistry.sol`**

The registry must:

- store whitelisted venue IDs and venue addresses
- store authorized decoder signers
- verify the seller signature against `IERC721(ownerOf(agentId))`
- verify the decoder signature over the execution proof hash
- enforce `block.timestamp <= attestationDeadline`
- enforce equal chain, venue, trade hash, pair, side, and size
- enforce fill price within configured basis-point tolerance
- reject duplicate `{sellerRegistry, sellerAgentId, tradeTxHash}` conflicts
- emit `AttestationAccepted(bytes32 indexed attestationId, bytes32 indexed experienceId, bytes32 indexed tradeTxHash)`

- [ ] **Step 4: Add deployment script**

Create `scripts/compile-contracts.ts` that compiles both Solidity files with `solc` and writes:

```text
artifacts/DemoTradeVenue.json
artifacts/AgentexRegistry.json
```

Each artifact must include `abi`, `bytecode`, and `deployedBytecode`.

Create `scripts/deploy-demo-contracts.ts` that reads:

```text
AGENTEX_RPC_URL
AGENTEX_DEPLOYER_PRIVATE_KEY
AGENTEX_DECODER_ADDRESS
AGENTEX_CHAIN_ID
```

It deploys both contracts, whitelists `demo-venue-v1`, authorizes the decoder, and writes:

```text
deployments/live-v1.json
```

- [ ] **Step 5: Run contract checks**

```bash
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add contracts foundry.toml scripts/compile-contracts.ts scripts/deploy-demo-contracts.ts src/contracts.ts test/agentex.test.ts package.json package-lock.json
git commit -m "feat: add live demo venue and registry"
```

## Task 3: Implement Trade Experience Packaging

**Files:**
- Create: `src/experience.ts`
- Modify: `src/filecoin.ts`
- Modify: `src/index.ts`
- Test: `test/agentex.test.ts`
- Create: `demo/agents/alpha/.openclaw/memory/2026-05-18.md`
- Create: `demo/agents/alpha/activity/trade.json`

- [x] **Step 1: Write failing extraction and encryption tests**

The fixture must include exactly one trade and must fail if two trade entries are present.

Assertions:

```ts
assert.equal(asset.experience.side, "buy");
assert.equal(asset.manifest.decrypted_experience_hash, sha256(stableJson(asset.experience)));
assert.equal(encryptedText.includes("pre-trade reasoning"), false);
assert.equal(asset.manifest.public_trade_summary.trade_tx_hash, asset.experience.trade_tx_hash);
```

Run:

```bash
npm test
```

Expected: FAIL because `createTradeExperienceAsset` does not exist.

- [x] **Step 2: Implement extraction**

Create `createTradeExperienceAsset(input)` in `src/experience.ts`.

Inputs:

```ts
{
  activityPath: string;
  memoryPath: string;
  sellerAgent: AgentRef;
  key: string;
  outDir?: string;
}
```

Outputs:

```text
experience.json
experience.enc.json
manifest.json
redaction.json
```

The plaintext `experience.json` stays local and must not be uploaded. `manifest.json` commits to the encrypted hash and decrypted hash.

- [x] **Step 3: Implement fail-closed redaction**

Block plaintext containing:

```text
private_key
api_key
secret
token=
BEGIN PRIVATE KEY
seed phrase
mnemonic
```

Return structured errors such as:

```text
redaction failed: pre_trade_reasoning contains denied material
```

- [ ] **Step 4: Rename Filecoin upload boundary**

Change `uploadGeneToFilecoin` to `uploadExperienceToFilecoin`. The upload root must contain only:

```text
experience.enc.json
manifest.json
redaction.json
execution-proof.json
```

Run:

```bash
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/experience.ts src/filecoin.ts src/index.ts test/agentex.test.ts demo/agents/alpha
git commit -m "feat: package encrypted trade experiences"
```

## Task 4: Implement Venue Decoder And Registry Attestation

**Files:**
- Create: `src/venue.ts`
- Create: `src/registry.ts`
- Modify: `src/index.ts`
- Test: `test/agentex.test.ts`

- [x] **Step 1: Write failing proof tests**

Assertions:

```ts
assert.equal(proof.schema, "agentex.execution_proof.v1");
assert.equal(proof.whitelisted_venue_id, "demo-venue-v1");
assert.equal(verified.ok, true);
assert.equal(badFill.verified.ok, false);
```

Run:

```bash
npm test
```

Expected: FAIL because decoder and attestation modules do not exist.

- [ ] **Step 2: Implement execution proof creation**

`createExecutionProof(input)` reads a live transaction receipt through `AGENTEX_RPC_URL`, finds `TradeExecuted`, normalizes pair/side/size/fill price/block/time, and signs the proof hash with `AGENTEX_DECODER_PRIVATE_KEY`.

- [ ] **Step 3: Implement attestation preparation**

`prepareRegistryAttestation(input)` joins:

- seller agent
- manifest public trade summary
- encrypted experience CID
- decrypted experience hash
- execution proof hash
- seller nonce
- attestation deadline

It returns an EIP-191 seller-signable payload and the exact registry calldata preview.

- [ ] **Step 4: Implement submit and verify**

`submitRegistryAttestation(input)` sends the transaction through viem, waits for the receipt, reads registry status, and returns:

```json
{
  "status": "accepted",
  "attestation_id": "0x...",
  "registry_transaction_hash": "0x..."
}
```

It must not return `accepted` unless the transaction receipt succeeded and the registry status is accepted.

- [ ] **Step 5: Run checks and commit**

```bash
npm test
npm run typecheck
git add src/venue.ts src/registry.ts src/index.ts test/agentex.test.ts
git commit -m "feat: attest trade experiences on registry"
```

## Task 5: Replace Market Receipts With Experience Market Flow

**Files:**
- Rewrite: `src/market.ts`
- Modify: `src/index.ts`
- Test: `test/agentex.test.ts`

- [x] **Step 1: Write failing listing and purchase tests**

Assertions:

```ts
assert.equal(listing.schema, "agentex.market_listing.v1");
assert.equal(listing.status, "live");
assert.equal(listing.attestation_id, acceptedAttestationId);
assert.equal(purchase.schema, "agentex.purchase_receipt.v1");
assert.equal(purchase.decryption_verification_result.status, "verified");
assert.equal(purchase.decrypted_experience_hash, listing.decrypted_experience_hash);
```

Run:

```bash
npm test
```

Expected: FAIL because the market module still speaks profile-gene terms.

- [ ] **Step 2: Implement listing guard**

`createExperienceListing` must require:

- registry attestation status is accepted
- storage status is verified
- encrypted experience CID exists
- decrypted hash exists
- settlement framework is `arkhai_nla`
- payment asset is explicit, such as `USDFC`

- [x] **Step 3: Implement purchase and delivery verification**

`createExperiencePurchase` records Filecoin Pay payment reference and Arkhai escrow ID. `verifyExperienceDelivery` decrypts the payload and compares the plaintext SHA-256 hash with the registry commitment.

- [x] **Step 4: Implement ingestion preparation**

`prepareExperienceIngestion` writes a buyer-local file:

```text
.openclaw/imports/agentex/<experience_id>.json
```

It includes source listing, seller agent, trade summary, verified plaintext hash, and the decrypted experience. It must require confirmation before writing.

- [ ] **Step 5: Run checks and commit**

```bash
npm test
npm run typecheck
git add src/market.ts src/index.ts test/agentex.test.ts
git commit -m "feat: implement experience market receipts"
```

## Task 6: Expose The Spec's Aomi Tool Surface

**Files:**
- Rewrite: `src/tools.ts`
- Rewrite: `src/cli.ts`
- Modify: `src/server.ts`
- Modify: `src/index.ts`
- Test: `test/agentex.test.ts`

- [ ] **Step 1: Write failing tool-name tests**

Assert the server accepts these tool names:

```text
inspect_openclaw_activity
extract_trade_experience
encrypt_trade_experience
upload_experience_to_filecoin
create_execution_proof
prepare_registry_attestation
submit_registry_attestation
create_experience_listing
inspect_experience_listing
create_experience_purchase
verify_experience_delivery
prepare_experience_ingestion
record_experience_feedback
```

Run:

```bash
npm test
```

Expected: FAIL because current tools are gene-oriented.

- [ ] **Step 2: Implement prepare-first results**

Every write tool must return `confirmation_required` when `confirm !== true`. The preview must include exact IDs, public storage risk, payment amount, registry address, or ingestion path depending on the action.

- [x] **Step 3: Replace CLI commands**

New CLI shape:

```bash
node --import tsx src/cli.ts experience extract ...
node --import tsx src/cli.ts experience upload ...
node --import tsx src/cli.ts registry proof ...
node --import tsx src/cli.ts registry attest ...
node --import tsx src/cli.ts market list ...
node --import tsx src/cli.ts market buy ...
node --import tsx src/cli.ts market verify-delivery ...
node --import tsx src/cli.ts demo plan alpha beta gamma delta
```

- [ ] **Step 4: Run checks and commit**

```bash
npm test
npm run typecheck
git add src/tools.ts src/cli.ts src/server.ts src/index.ts test/agentex.test.ts
git commit -m "feat: expose aomi experience tools"
```

## Task 7: Build Four-Agent Local Demo

**Files:**
- Create: `demo/agents/beta/`
- Create: `demo/agents/gamma/`
- Create: `demo/agents/delta/`
- Create: `scripts/run-local-v1.ts`
- Create: `demo/local-output/.gitkeep`
- Test: `test/agentex.test.ts`

- [x] **Step 1: Write failing four-agent test**

The test must run the local script and assert:

```ts
assert.equal(summary.agents.length, 4);
assert.equal(summary.experiences.length, 4);
assert.equal(summary.listings.length, 4);
assert.equal(summary.purchases.length, 4);
assert.equal(summary.ingestions.length, 4);
```

- [x] **Step 2: Implement local round**

`scripts/run-local-v1.ts` must create a closed exchange:

```text
alpha buys beta
beta buys gamma
gamma buys delta
delta buys alpha
```

Local mode may use local CIDs and local accepted attestation fixtures only for development tests. The output must label local proof as `mode: "local"` so it cannot be confused with live proof.

- [ ] **Step 3: Run checks and commit**

```bash
npm test
npm run typecheck
git add demo scripts/run-local-v1.ts test/agentex.test.ts
git commit -m "feat: add four-agent local exchange demo"
```

## Task 8: Add Live Deployment Runbook And Market View

**Files:**
- Create: `scripts/run-live-v1.ts`
- Create: `demo/live-runbook.md`
- Create: `demo/market-view.html`
- Modify: `package.json`
- Test: `test/agentex.test.ts`

- [x] **Step 1: Add npm scripts**

Add:

```json
{
  "scripts": {
    "contracts:compile": "node --import tsx scripts/compile-contracts.ts",
    "deploy:demo": "node --import tsx scripts/deploy-demo-contracts.ts",
    "demo:local": "node --import tsx scripts/run-local-v1.ts",
    "demo:live": "node --import tsx scripts/run-live-v1.ts"
  }
}
```

- [x] **Step 2: Implement live script gates**

`scripts/run-live-v1.ts` must fail before spending money if any required env var is missing:

```text
AGENTEX_RPC_URL
AGENTEX_CHAIN_ID
AGENTEX_REGISTRY_ADDRESS
AGENTEX_DEMO_VENUE_ADDRESS
AGENTEX_DECODER_PRIVATE_KEY
AGENTEX_SELLER_PRIVATE_KEY_ALPHA
AGENTEX_SELLER_PRIVATE_KEY_BETA
AGENTEX_SELLER_PRIVATE_KEY_GAMMA
AGENTEX_SELLER_PRIVATE_KEY_DELTA
PRIVATE_KEY
AGENTEX_EXPERIENCE_KEY
```

- [x] **Step 3: Write live runbook**

`demo/live-runbook.md` must include exact commands for:

```bash
npm install
npm test
npm run typecheck
npm run deploy:demo
npm run demo:live
node --import tsx src/cli.ts serve --host 127.0.0.1 --port 8787
open demo/market-view.html
```

The runbook must include the final judge checklist from the spec's required live proof.

- [ ] **Step 4: Implement market view**

`demo/market-view.html` reads `demo/live-output/summary.json` and displays:

- four public trade summaries
- four encrypted CIDs
- four accepted attestation IDs
- four listing IDs
- four purchase IDs
- four decrypted-hash verification results
- four ingestion records

No plaintext reasoning is shown before verified purchase state.

- [ ] **Step 5: Run checks and commit**

```bash
npm test
npm run typecheck
git diff --check
git add scripts/run-live-v1.ts demo/live-runbook.md demo/market-view.html package.json package-lock.json test/agentex.test.ts
git commit -m "feat: add live v1 demo runbook"
```

## Task 9: Wire Aomi App Wrapper

**Files:**
- Create: `aomi/agentex-app/Cargo.toml`
- Create: `aomi/agentex-app/src/lib.rs`
- Create: `aomi/agentex-app/src/client.rs`
- Create: `aomi/agentex-app/src/tool.rs`
- Modify: `demo/live-runbook.md`

- [ ] **Step 1: Confirm SDK availability**

Run:

```bash
test -d "$AOMI_SDK_REPO" && ls "$AOMI_SDK_REPO/sdk/examples/app-template-http/src"
```

Expected: the template files exist. If `AOMI_SDK_REPO` is unset, skip only the compiled wrapper and keep the JSON tool server as the callable Aomi target for the live demo.

- [ ] **Step 2: Scaffold app wrapper**

Expose the Agentex service at:

```text
AGENTEX_SERVICE_URL=http://127.0.0.1:8787
```

Register the same 13 tool names from Task 6. Each tool calls `POST /tool/<tool_name>` and returns normalized JSON.

- [ ] **Step 3: Build wrapper**

```bash
cargo build --manifest-path aomi/agentex-app/Cargo.toml
```

Expected: PASS when the SDK checkout is available.

- [ ] **Step 4: Commit**

```bash
git add aomi/agentex-app demo/live-runbook.md
git commit -m "feat: add aomi wrapper for agentex tools"
```

## Task 10: Execute Live V1 Demo

**Files:**
- Generate: `deployments/live-v1.json`
- Generate: `demo/live-output/summary.json`
- Generate: `demo/live-output/agentex-live-v1-report.md`

- [ ] **Step 1: Clean verification**

```bash
npm test
npm run typecheck
git diff --check
```

Expected: all pass.

- [ ] **Step 2: Deploy venue and registry**

```bash
npm run deploy:demo
```

Expected:

```text
deployments/live-v1.json
```

contains chain ID, RPC label, demo venue address, registry address, decoder address, deployment tx hashes, and block numbers.

- [ ] **Step 3: Start OpenClaw cluster**

```bash
cd "$OPENCLAW_REPO"
./scripts/k8s/create-kind.sh
OPENCLAW_NAMESPACE=openclaw-alpha ./scripts/k8s/deploy.sh --show-token
OPENCLAW_NAMESPACE=openclaw-beta ./scripts/k8s/deploy.sh --show-token
OPENCLAW_NAMESPACE=openclaw-gamma ./scripts/k8s/deploy.sh --show-token
OPENCLAW_NAMESPACE=openclaw-delta ./scripts/k8s/deploy.sh --show-token
```

Expected:

```bash
kubectl get pods -n openclaw-alpha
kubectl get pods -n openclaw-beta
kubectl get pods -n openclaw-gamma
kubectl get pods -n openclaw-delta
```

shows running pods.

- [ ] **Step 4: Register or update ERC-8004 agents**

For alpha, beta, gamma, and delta, record public `{agentRegistry, agentId}` in `demo/live-output/agents.json`. Each registration file must include the Agentex verification endpoint, Aomi endpoint, supported venue `demo-venue-v1`, Filecoin/IPFS metadata, wallet metadata, and trust mechanisms.

- [ ] **Step 5: Run live round**

```bash
npm run demo:live
```

Expected `demo/live-output/summary.json` contains:

- four OpenClaw agent names
- four trade transaction hashes
- four execution proof hashes
- four encrypted Filecoin CIDs
- four accepted registry attestations
- four listing IDs
- four Filecoin Pay payment references
- four Arkhai escrow IDs
- four verified purchase receipts
- four ingestion records

- [ ] **Step 6: Open market view**

```bash
open demo/market-view.html
```

Expected: the page shows the exchange graph from trades to attestations to purchases to ingestion, without exposing plaintext reasoning before verified purchase state.

- [ ] **Step 7: Final report**

Write `demo/live-output/agentex-live-v1-report.md` with:

- deployed addresses
- public agent IDs
- trade TxHashes
- Filecoin CIDs
- attestation IDs
- Filecoin Pay references
- Arkhai escrow IDs
- verification command outputs
- known residual risks

Do not include private keys, decrypted reasoning, seed phrases, wallet exports, or model-provider API keys.

## Final Verification Gate

The demo is ready only when these commands pass:

```bash
npm test
npm run typecheck
git diff --check
npm run demo:local
```

The live demo is ready only when `demo/live-output/summary.json` proves all required live artifacts from the architecture spec:

- four OpenClaw instances in Kind
- four whitelisted onchain trade TxHashes
- four signed execution proofs
- four encrypted experience uploads to IPFS/Filecoin
- four accepted registry attestations
- four ERC-8004 registrations or updates
- four Filecoin Pay wallet/payment paths
- four Arkhai/NLA escrow or settlement flows
- one Aomi-guided autonomous exchange round
- four verified purchase receipts
- four decrypted-hash verification results
- one market view showing public trade summaries and post-purchase ingestion results
