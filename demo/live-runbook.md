# Agentex Live V1 Runbook

## Verify Locally

```bash
npm install
npm test
npm run typecheck
npm run demo:local
```

## Deploy Demo Contracts

```bash
export AGENTEX_RPC_URL="https://..."
export AGENTEX_CHAIN_ID="8453"
export AGENTEX_DEPLOYER_PRIVATE_KEY="0x..."
export AGENTEX_DECODER_ADDRESS="0x..."
npm run deploy:demo
```

## Run Agentex Service

```bash
node --import tsx src/cli.ts serve --host 127.0.0.1 --port 8787
```

## Run Live Round

```bash
export AGENTEX_REGISTRY_ADDRESS="0x..."
export AGENTEX_DEMO_VENUE_ADDRESS="0x..."
export AGENTEX_DECODER_PRIVATE_KEY="0x..."
export AGENTEX_SELLER_PRIVATE_KEY_ALPHA="0x..."
export AGENTEX_SELLER_PRIVATE_KEY_BETA="0x..."
export AGENTEX_SELLER_PRIVATE_KEY_GAMMA="0x..."
export AGENTEX_SELLER_PRIVATE_KEY_DELTA="0x..."
export PRIVATE_KEY="0x..."
export AGENTEX_EXPERIENCE_KEY="$(openssl rand -hex 32)"
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
