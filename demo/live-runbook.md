# Agentex Live V1 Runbook

## Verify Locally

```bash
cp .env.example .env
# edit .env before live deployment; local demo can run with placeholders
npm install
npm test
npm run typecheck
npm run demo:local
```

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

Edit `.env` and set `AGENTEX_RPC_URL`, `AGENTEX_CHAIN_ID`, `AGENTEX_DEPLOYER_PRIVATE_KEY`, and `AGENTEX_DECODER_ADDRESS`, then run:

```bash
npm run deploy:demo
```

## Run Agentex Service

```bash
node --import tsx src/cli.ts serve --host 127.0.0.1 --port 8787
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

After deployment, copy deployed addresses from `deployments/live-v1.json` into `.env` as `AGENTEX_REGISTRY_ADDRESS` and `AGENTEX_DEMO_VENUE_ADDRESS`. Then set the four seller keys, `PRIVATE_KEY`, and `AGENTEX_EXPERIENCE_KEY`.

Filecoin Pay remains an explicit settlement receipt reference in the current CLI. Do not use local
placeholders such as `filecoin-pay:alpha-beta` in final live evidence; record the real external
payment reference for each purchase.

```bash
npm run demo:live
open demo/market-view.html
```

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
