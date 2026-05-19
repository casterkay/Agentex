# Agentex Setup Guide

This guide sets up the local Agentex core, the four-agent OpenClaw demo topology, and the
external services needed for a live hackathon run.

The current repo automates local gene packaging, scoring, Filecoin Pin upload, listing receipts,
purchase receipts, breeding exports, and breeding receipts. ERC-8004 registration, Filecoin Pay
settlement, Arkhai/NLA escrow execution, and the Aomi app still require external setup or follow-up
integration code.

## 1. Local Toolchain

Required:

- Node.js 24 or newer
- npm
- git
- Docker or Podman
- Kind
- kubectl
- an OpenClaw checkout with `scripts/k8s/create-kind.sh` and `scripts/k8s/deploy.sh`

Install project dependencies:

```bash
npm install
npm run typecheck
npm test
```

The full test suite should pass before live setup:

```text
14 tests, 0 failures
```

## 2. Secrets And Wallets

Use hot wallets only for demo-sized funds. Never commit secrets, seed phrases, private keys, browser
profiles, wallet exports, or `.env` files.

Set the local experience encryption key:

```bash
export AGENTEX_EXPERIENCE_KEY="$(openssl rand -hex 32)"
```

Set Filecoin Pin credentials only when you are ready to upload:

```bash
export PRIVATE_KEY="0x..."
```

Set one OpenClaw model provider key:

```bash
export OPENROUTER_API_KEY="..."
# or ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY
```

For the full live demo, prepare:

- a funded Filecoin mainnet wallet for Filecoin Pin and Filecoin Pay
- one Filecoin Pay wallet path per demo agent: alpha, beta, gamma, delta
- a funded Base mainnet wallet for ERC-8004 registration
- Arkhai/NLA RPC, token, and oracle/LLM credentials
- Aomi API or SDK credentials for the agent-facing app

Record only public addresses and receipt IDs in repo docs. Keep private keys in the shell, a local
secret manager, or the external wallet host.

## 3. OpenClaw Four-Agent Cluster

Set your OpenClaw checkout path:

```bash
export OPENCLAW_REPO="/path/to/openclaw"
cd "$OPENCLAW_REPO"
```

Create a local Kind cluster:

```bash
./scripts/k8s/create-kind.sh
```

Deploy four isolated OpenClaw instances:

```bash
OPENCLAW_NAMESPACE=openclaw-alpha ./scripts/k8s/deploy.sh --show-token
OPENCLAW_NAMESPACE=openclaw-beta ./scripts/k8s/deploy.sh --show-token
OPENCLAW_NAMESPACE=openclaw-gamma ./scripts/k8s/deploy.sh --show-token
OPENCLAW_NAMESPACE=openclaw-delta ./scripts/k8s/deploy.sh --show-token
```

Check the pods:

```bash
kubectl get pods -n openclaw-alpha
kubectl get pods -n openclaw-beta
kubectl get pods -n openclaw-gamma
kubectl get pods -n openclaw-delta
```

Retrieve a gateway token later if needed:

```bash
kubectl get secret openclaw-secrets -n openclaw-alpha \
  -o jsonpath='{.data.OPENCLAW_GATEWAY_TOKEN}' | base64 -d
```

Port-forward each gateway only when you need to inspect it:

```bash
kubectl port-forward svc/openclaw 18789:18789 -n openclaw-alpha
```

Use separate terminal sessions and ports for multiple agents.

## 4. Agent Profile Inputs

Agentex packages exactly two profile files from each agent repo:

```text
AGENTS.md
MEMORY.md
```

Trade logs, decisions, receipts, and portfolio history go in an evidence directory. They are scoring
inputs, not sold profile content.

For each agent, make sure its working directory has:

```text
AGENTS.md
MEMORY.md
evidence/
```

Create `.agentexignore` in every agent profile repo:

```bash
cat > .agentexignore <<'EOF'
.env
*.pem
*.key
*private*
*secret*
*token*
wallet*
browser*
node_modules
.git
EOF
```

Commit the starting profile before packaging:

```bash
git add AGENTS.md MEMORY.md .agentexignore
git commit -m "seed agent profile"
```

## 5. Local Gene Dry Run

Return to the Agentex repo:

```bash
cd /Users/tcai/Projects/Agentex
```

Create one gene:

```bash
node --import tsx src/cli.ts gene create \
  --repo "$ALPHA_PROFILE_REPO" \
  --agent alpha \
  --seller-registry "eip155:8453:0xREGISTRY" \
  --seller-id "1" \
  --evidence "$ALPHA_PROFILE_REPO/evidence" \
  --key "$AGENTEX_EXPERIENCE_KEY"
```

The command prints a `manifest_path`. Use it for the next steps:

```bash
export ALPHA_MANIFEST="/path/to/manifest.json"
```

Score the gene:

```bash
node --import tsx src/cli.ts gene score \
  --manifest "$ALPHA_MANIFEST" \
  --evidence "$ALPHA_PROFILE_REPO/evidence"
```

Verify the encrypted payload:

```bash
node --import tsx src/cli.ts gene verify \
  --manifest "$ALPHA_MANIFEST" \
  --key "$AGENTEX_EXPERIENCE_KEY"
```

Export to a review directory:

```bash
node --import tsx src/cli.ts gene export \
  --manifest "$ALPHA_MANIFEST" \
  --out /tmp/agentex-alpha-review \
  --key "$AGENTEX_EXPERIENCE_KEY"
```

Do this for alpha, beta, gamma, and delta before attempting live exchange.

## 6. Filecoin Pin Upload

Run this only after the local verify step passes and `PRIVATE_KEY` is set.

```bash
node --import tsx src/cli.ts gene upload \
  --manifest "$ALPHA_MANIFEST" \
  --network mainnet \
  --confirm
```

Expected outputs:

- `status: uploaded`
- `filecoin-upload.json`
- a Filecoin upload receipt with piece CID, size, completion status, and copy metadata

If the command returns `configuration_required`, set `PRIVATE_KEY`. If it returns
`runtime_required`, switch to Node.js 24 or newer.

Do not mark a gene live in the demo until upload and storage status are verified.

## 7. ERC-8004 Registration

For each agent, prepare an agent registration file that points to:

- the Aomi app endpoint
- the Agentex verification endpoint
- the Filecoin/IPFS manifest URI
- the payment wallet metadata
- supported trust mechanisms

The registration identifier must be recorded as:

```text
agentRegistry = eip155:<chainId>:<identityRegistry>
agentId       = <tokenId>
```

For the planned Base mainnet path, use `chainId = 8453`.

After registration or update, copy the public `{agentRegistry, agentId}` into the gene creation and
market listing flow. Do not store private registration keys in the repo.

## 8. Local Market Receipts

Create a local listing receipt:

```bash
node --import tsx src/cli.ts market list \
  --manifest "$ALPHA_MANIFEST" \
  --score "$(dirname "$ALPHA_MANIFEST")/score.json" \
  --price "50" \
  --asset "USDFC" \
  --delivery-key-requirement "buyer_x25519_key" \
  --confirm
```

Create a purchase receipt after escrow is created externally:

```bash
node --import tsx src/cli.ts market buy \
  --listing "$(dirname "$ALPHA_MANIFEST")/listing.json" \
  --buyer-registry "eip155:8453:0xREGISTRY" \
  --buyer-id "2" \
  --escrow-id "arkhai:escrow:1" \
  --buyer-delivery-key "buyer_x25519_key" \
  --key-envelope "encrypted-key-envelope" \
  --delivery-proof "seller delivered key for exact manifest and payload" \
  --confirm
```

These receipts are local state. They do not replace Filecoin Pay settlement, ERC-8004 registration,
or Arkhai/NLA escrow execution.

## 9. Arkhai/NLA Escrow

Use a narrow natural-language agreement:

```text
Release payment if the seller delivers decryption access that unlocks the exact encrypted experience CID and produces plaintext whose SHA-256 hash matches the Agentex registry attestation.
```

For each exchange:

1. Buyer creates escrow with the exact attestation, encrypted CID, decrypted hash, price, and asset.
2. Seller fulfills with decryption access and delivery proof.
3. Buyer verifies the decrypted hash through Agentex.
4. Oracle/arbitration settles payment.
5. Agentex records escrow, fulfillment, arbitration, collection, and verification state in the
   purchase receipt.

Local mode creates deterministic Arkhai-style escrow receipts. Live mode uses `alkahest-ts` and
requires explicit Arkhai/Alkahest contract addresses in `.env`.

## 10. Filecoin Pay

Before the live exchange round:

1. Create or connect one Filecoin Pay wallet per agent.
2. Fund each wallet with the demo asset.
3. Record public wallet addresses and funding status in the demo runbook.
4. Use the wallets in the exchange path before creating final purchase receipts.

The live demo should show Filecoin Pay participating in settlement, not just wallet setup.

## 11. Aomi App Setup

The Aomi app should call the Agentex HTTP service, not shell directly from the UI.

Start the local Agentex tool server:

```bash
node --import tsx src/cli.ts serve --host 127.0.0.1 --port 8787
```

Tool endpoint shape:

```text
POST http://127.0.0.1:8787/tool/<tool_name>
```

Core tools:

- `inspect_openclaw_activity`
- `extract_trade_experience`
- `upload_experience_to_filecoin`
- `create_experience_listing`
- `inspect_experience_listing`
- `create_arkhai_escrow`
- `submit_experience_fulfillment`
- `verify_experience_delivery`
- `request_experience_arbitration`
- `collect_experience_payment`
- `prepare_experience_ingestion`
- `record_experience_feedback`
- `plan_exchange_round`

Write tools require `confirm: true`. The Aomi app should first preview the action, then ask for
explicit confirmation, then call the same tool again with `confirm: true`.

Example:

```bash
curl -sS http://127.0.0.1:8787/tool/plan_exchange_round \
  -H 'content-type: application/json' \
  -d '{"agents":["alpha","beta","gamma","delta"]}'
```

## 12. Four-Agent Exchange Run

Plan the round:

```bash
node --import tsx src/cli.ts exchange plan alpha beta gamma delta
```

Canonical exchange:

```text
alpha buys beta
beta buys gamma
gamma buys delta
delta buys alpha
```

For each leg:

1. Seller creates, scores, verifies, uploads, registers, and lists its gene.
2. Buyer inspects the listing, score, preview, identity, payment terms, and escrow demand.
3. Buyer creates escrow through Arkhai/NLA and pays through Filecoin Pay.
4. Seller fulfills with buyer-encrypted key delivery.
5. Buyer verifies and decrypts the exact gene.
6. Buyer exports the purchased gene to a review directory.
7. Buyer manually reviews the diff.
8. Buyer commits a full or selective breeding change.
9. Agentex records the breeding receipt.

Record a breeding receipt:

```bash
node --import tsx src/cli.ts market record-breeding \
  --purchase "/path/to/purchase-<buyer-id>.json" \
  --buyer-repo "$BUYER_PROFILE_REPO" \
  --buyer-registry "eip155:8453:0xREGISTRY" \
  --buyer-id "<buyer-agent-id>" \
  --type selective_breed \
  --pre-breed-profile-hash "<hash-before-breeding>" \
  --confirm
```

## 13. Live Acceptance Checklist

The demo is ready only when all of these are true:

- four OpenClaw namespaces are running: alpha, beta, gamma, delta
- each agent has committed `AGENTS.md` and `MEMORY.md`
- each agent has one encrypted gene manifest
- each gene has a score report
- each gene verifies locally
- each gene is uploaded with Filecoin Pin and has a receipt
- each seller has an ERC-8004 `{agentRegistry, agentId}`
- each agent has a Filecoin Pay wallet path
- each exchange leg has an Arkhai/NLA escrow ID
- each purchase has a receipt
- each buyer exports and reviews the purchased gene before breeding
- each buyer creates a profile commit after breeding
- each buyer has a breeding receipt
- the Aomi app can drive or display the full round

## 14. Teardown

Stop port-forwards with `Ctrl-C`.

Delete the local Kind cluster:

```bash
cd "$OPENCLAW_REPO"
./scripts/k8s/create-kind.sh --delete
```

Delete temporary review directories:

```bash
rm -rf /tmp/agentex-*-review
```

Keep receipts, manifests, score reports, and public addresses needed for judging. Do not keep private
keys or decrypted purchased profile files in the repo.

## References

- Architecture: `docs/superpowers/specs/2026-05-15-agentex-gene-market-architecture.md`
- Build plan: `docs/superpowers/plans/2026-05-15-ipfs-openclaw-hackathon.md`
- Filecoin Pin notes: `docs/knowledge/filecoin-pin.md`
- Filecoin wallet notes: `docs/knowledge/filecoin-wallet.md`
- ERC-8004 notes: `docs/knowledge/erc-8004.md`
- OpenClaw Kubernetes notes: `docs/knowledge/openclaw-cluster.md`
- Aomi SDK notes: `docs/knowledge/aomi-sdk.md`
