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

## Deploy Demo Contracts

Edit `.env` and set `AGENTEX_RPC_URL`, `AGENTEX_CHAIN_ID`, `AGENTEX_DEPLOYER_PRIVATE_KEY`, and `AGENTEX_DECODER_ADDRESS`, then run:

```bash
npm run deploy:demo
```

## Run Agentex Service

```bash
node --import tsx src/cli.ts serve --host 127.0.0.1 --port 8787
```

## Run Live Round

After deployment, copy deployed addresses from `deployments/live-v1.json` into `.env` as `AGENTEX_REGISTRY_ADDRESS` and `AGENTEX_DEMO_VENUE_ADDRESS`. Then set the four seller keys, `PRIVATE_KEY`, and `AGENTEX_EXPERIENCE_KEY`.

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
