# OpenClaw Monad Agentex Demo

This path runs a local three-agent OpenClaw mini cluster and connects it to Monad testnet and the
local Agentex service.

The demo agents are:

```text
alpha
beta
gamma
```

The exchange round is:

```text
alpha buys beta
beta buys gamma
gamma buys alpha
```

## Safety Boundary

This demo is testnet-only. `AGENTEX_CHAIN_ID` must be `10143`, and each agent is bounded by
`AGENTEX_AGENT_TRADE_BUDGET_MON`. Do not point this script at mainnet wallets or mainnet RPC.

## Required Local Tools

```bash
kind
kubectl
docker
```

Docker or OrbStack must be running before Kind can create the cluster.

## Required `.env`

```bash
AGENTEX_RPC_URL=https://rpc.testnet.monad.xyz
AGENTEX_CHAIN_ID=10143
AGENTEX_SERVICE_URL=http://127.0.0.1:8787
AGENTEX_AGENT_TRADE_BUDGET_MON=0.01
OPENCLAW_REPO=/absolute/path/to/openclaw
OPENROUTER_API_KEY=...
```

One of `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY` is required.

## Run

Start Agentex:

```bash
node --import tsx src/cli.ts serve --host 127.0.0.1 --port 8787
```

Deploy the OpenClaw mini cluster:

```bash
npm run openclaw:deploy
```

The script deploys namespaces:

```text
openclaw-alpha
openclaw-beta
openclaw-gamma
```

Port-forward if needed:

```bash
kubectl port-forward svc/openclaw 18789:18789 -n openclaw-alpha
kubectl port-forward svc/openclaw 18790:18789 -n openclaw-beta
kubectl port-forward svc/openclaw 18791:18789 -n openclaw-gamma
```
