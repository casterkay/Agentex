# Agentex Live V1 Runbook

## Manual Setup Boundary

Agentex can verify local code, compile contracts, write deployment receipts, prepare encrypted upload
bundles, reject unsafe live listings, and render the market view. You must manually provide and confirm:

- funded demo wallets for contract deployment, four seller agents, and Filecoin Pin/Filecoin Pay
- the live RPC endpoint and chain ID
- one model-provider key for OpenClaw
- a local OpenClaw checkout at `OPENCLAW_REPO`
- ERC-8004 registrations for alpha, beta, gamma, and delta
- real Filecoin Pay payment references
- live Arkhai/Alkahest addresses if final evidence must use live escrow instead of local settlement receipts
- `AOMI_SDK_REPO` if the SDK-specific Aomi plugin must be built

Never paste private keys into chat. Put them only in local `.env`.

## Verify Locally

```bash
cp .env.example .env
# edit .env before live deployment; local demo can run with placeholders
npm install
npm test
npm run typecheck
npm run demo:local
npm run live:check
```

`npm run live:check` prints:

- missing or placeholder env vars
- whether `deployments/live-v1.json` has address and block-number receipts
- OpenClaw local prerequisites
- Aomi SDK availability
- the next automated command that is safe to run

## Upload Encrypted Experiences To Filecoin

Use Node.js 24 or newer and set `PRIVATE_KEY` to the Filecoin wallet key used for Filecoin Pin.
Run this only after local extraction and verification pass.

```bash
node --import tsx src/cli.ts experience upload \
  --manifest "$ALPHA_MANIFEST" \
  --network mainnet \
  --confirm
```

Expected output:

- `status: uploaded`
- `filecoin-upload.json`
- `manifest.json` updated with `storage_proof_fields.provider: "filecoin-pin"`

The upload bundle contains only `experience.enc.json`, `manifest.json`, `redaction.json`, and
`execution-proof.json` when present. It must not include plaintext `experience.json`.

## Deploy Demo Contracts

Manual setup:

- set `AGENTEX_RPC_URL`, `AGENTEX_CHAIN_ID`, `AGENTEX_DEPLOYER_PRIVATE_KEY`, and `AGENTEX_DECODER_ADDRESS`
- fund the deployer wallet for the target chain
- confirm the deployer is a demo-funded hot wallet, not a long-term treasury key

Automated step:

```bash
npm run live:check
npm run deploy:demo
npm run live:check
```

Live commands read `registry_address` and `demo_venue_address` from `deployments/live-v1.json`.
Set `AGENTEX_REGISTRY_ADDRESS` and `AGENTEX_DEMO_VENUE_ADDRESS` only if you want explicit
override checks.

## Run Agentex Service

```bash
node --import tsx src/cli.ts serve --host 127.0.0.1 --port 8787
```

## Start Four OpenClaw Instances

Manual setup:

- install and start Docker, OrbStack, or Podman
- install `kind` and `kubectl`
- set `OPENCLAW_REPO` to a local OpenClaw checkout
- set one of `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY`
- confirm `AGENTEX_AGENT_TRADE_BUDGET_MON` is bounded and acceptable

Automated step:

```bash
npm run live:check
npm run openclaw:deploy
```

## Create Live Listings

After Filecoin upload and registry attestation, create each live listing with the Filecoin proof gate:

```bash
node --import tsx src/cli.ts market list \
  --manifest "$ALPHA_MANIFEST" \
  --attestation-id "$ALPHA_ATTESTATION_ID" \
  --price 5 \
  --asset USDFC \
  --live \
  --confirm
```

`--live` rejects manifests that still use `local:*` CIDs or local storage proof.

## Run Live Round

After deployment, set the four seller keys, `PRIVATE_KEY`, and `AGENTEX_EXPERIENCE_KEY`.

Filecoin Pay remains an explicit settlement receipt reference in the current CLI. Do not use local
placeholders such as `filecoin-pay:alpha-beta` in final live evidence; record the real external
payment reference for each purchase.

```bash
npm run live:check
npm run demo:live
cd web && npm run dev
```

Without a live evidence file, `npm run demo:live` writes `demo/live-output/preflight.json` after env
and deployment checks. After the funded OpenClaw, Filecoin Pay, ERC-8004, and Arkhai/Alkahest steps
produce the evidence, write it to `demo/live-input/evidence.json` or set `AGENTEX_LIVE_EVIDENCE_PATH`.
Then rerun:

```bash
npm run demo:live
```

Expected output:

- `status: live_summary_created`
- `demo/live-output/summary.json`

The evidence file must use `schema: "agentex.live_evidence.v1"` and include exactly four agents,
the alpha/beta/gamma/delta exchange round, four Filecoin-backed experiences, four accepted registry
attestations, four listings, four verified purchases with Filecoin Pay and Arkhai references, four
ERC-8004 registration records, and four ingestion records.

Open `http://localhost:3000` to inspect the web dashboard, or configure `AGENTEX_SUMMARY_URL` when
deploying the app so it can read a public summary endpoint.

## Judge Checklist

- four OpenClaw instances in Kind: alpha, beta, gamma, delta
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
