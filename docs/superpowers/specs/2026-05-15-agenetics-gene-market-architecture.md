# Agenetics Gene Market Architecture

Date: 2026-05-15

## Summary

Agenetics is a gene market for onchain AI agents.

In v1, the market serves OpenClaw trading agents. A gene is the small profile bundle that shapes an
agent's behavior:

```text
AGENTS.md
MEMORY.md
```

These files are the agent's genotype. The carrier agent's onchain behavior is the phenotype. A gene
is successful when its carrier earns, manages risk well, and other agents buy and breed it with
their own profile genes.

The stack is:

- ERC-8004: agent identity, reputation, validation hooks.
- IPFS/Filecoin Pin: gene artifact, manifest, score report, evidence storage.
- Filecoin Pay: payment rails for the gene market.
- Arkhai: escrow and natural-language sale conditions.
- Aomi: the agent-facing interface of the market.

The local hackathon topology runs four OpenClaw instances in a Kind cluster:

- alpha
- beta
- gamma
- delta

Each instance starts with its own profile gene, participates as both buyer and seller, and breeds
external genes into its own Git history.

## Product Boundary

Agenetics sells verifiable agent genes, not trades.

It is not a trading bot, signal marketplace, prompt gallery, background memory watcher, hidden trade
hook, generic document store, or deterministic model-output replay system.

The product promise is narrow:

```text
This exact profile gene existed, was sold by this agent, was stored here, was sold under
these terms, and was bred into this buyer agent's profile history.
```

## Market Thesis

Autonomous agents will become economic actors: they hold wallets, manage assets, publish services,
and transact with each other. Once agents are first-class onchain users, useful behavior patterns
become tradable capital.

For OpenClaw agents, those behavior patterns live in profile files:

- `AGENTS.md`: operating rules, tool discipline, risk boundaries.
- `MEMORY.md`: lessons, market observations, mistakes, strategy updates.

Agenetics creates selection pressure:

- performance creates demand
- demand creates purchases
- purchases create breeding events
- breeding events create Git descendants
- Git descendants create usage evidence
- usage evidence feeds gene reputation

The market is successful when strong genes spread with proof.

## Core Primitives

### Agent

An agent is an ERC-8004-registered onchain user.

Agent roles:

- carrier: runs with a gene
- seller: lists a gene
- buyer: purchases a gene
- validator: verifies a claim, artifact, score, delivery, or breeding record

Agents are referenced by `{agentRegistry, agentId}`. Their registration file should advertise the
Aomi app endpoint, Agenetics verification endpoint, wallet/payment metadata, and supported trust
mechanisms.

### Gene

A gene is a portable OpenClaw profile asset.

V1 gene contents are exactly:

- `AGENTS.md`
- `MEMORY.md`

Trade logs, decisions, receipts, and portfolio history are evidence. They are not sold as the gene by
default.

### Gene Artifact

A gene artifact has public metadata and private payload.

Public:

- gene ID
- seller agent
- source commit and parent commit
- file hashes
- manifest CID
- preview CID
- score report CID
- encrypted payload CID
- Filecoin Pin proof fields

Private until settlement:

- encrypted profile files
- per-gene decryption key

### Evidence

Evidence supports a gene's fitness claim.

Evidence may include onchain transactions, portfolio snapshots, execution logs, trade intents,
decision receipts, performance reports, purchase receipts, and breeding receipts.

Any evidence used for scoring or validation must be content-addressed.

### Fitness

Fitness is a gene's market strength.

It has three parts:

- performance: return, drawdown, volatility, risk-adjusted yield
- discipline: risk-rule adherence, reflection quality, consistency, evidence depth
- adoption: purchases, breeding events, buyer feedback

The deterministic score must be reproducible from structured metrics. A model may write a valuation
note, but the note cannot change the deterministic score.

### Listing

A listing sells one exact gene manifest.

It binds seller agent, manifest CID, encrypted payload CID, score report CID, price, payment asset,
escrow terms, delivery requirement, and listing status.

### Purchase

A purchase is complete only when the buyer verifies and decrypts the exact advertised gene.

The purchase receipt binds buyer, seller, listing, escrow ID, payment status, delivery proof, manifest
CID, payload CID, and verification result.

### Breeding

Breeding is market-visible gene exchange.

Types:

- full breed: combine the purchased gene with the buyer agent's current profile
- selective breed: combine selected sections with the buyer agent's current profile

Each breeding event creates a descendant profile commit in the buyer agent's Git graph. The Git graph
is the evolution tree: branches represent variants, and breeding commits record how external genes
entered the profile history.

Every breeding event creates a receipt. Breeding receipts must reference the purchased gene, the
buyer agent's pre-breed profile state, breeding inputs, resulting commit, and resulting file hashes.

## Protocol Roles

### ERC-8004

ERC-8004 is the identity and trust layer.

Agenetics uses:

- Identity Registry to identify carriers, sellers, buyers, and validators.
- Registration files to point to Aomi, Agenetics, Filecoin/IPFS metadata, wallets, and trust methods.
- Reputation Registry for buyer feedback, seller reliability, breeding success, and gene reputation.
- Validation Registry for independent checks of gene integrity, scoring evidence, delivery, or
  breeding records.

Registration proves identity, not quality. Agenetics must bind identity to content, evidence, market
receipts, and validation records.

### IPFS and Filecoin Pin

IPFS is the content-addressed store.

Filecoin Pin makes market artifacts persistent. Receipts should record root CID, manifest CID,
encrypted payload CID, score CID, dataset ID when available, piece CID or CommP when available, PDP
or storage status when available, and retrieval URLs.

An asset is not live until its storage status is verified.

### Filecoin Pay

Filecoin Pay is the payment rail.

Each listing must make the payment asset explicit. The product may use FIL or Filecoin-supported
stable assets such as USDFC. The market economy is Filecoin-native, but receipts should not imply a
single hardcoded currency unless the live flow actually uses it.

### Arkhai

Arkhai is the conditional commerce layer.

The core natural-language agreement should stay narrow:

```text
Release payment if the seller delivers a buyer-encrypted decryption key that unlocks the exact gene payload
identified by this manifest CID and these file hashes.
```

Agenetics records escrow ID, fulfillment proof, arbitration/oracle result, and collection status in
the purchase receipt.

### Aomi

Aomi is the agent interface.

Agents use Aomi to inspect, create, score, list, buy, verify, and breed genes. The Aomi app should
expose intent-shaped tools instead of raw protocol endpoints.

Side effects must follow prepare-first execution:

1. preview the action
2. show the exact identifiers and risks
3. require explicit confirmation
4. execute through the Agenetics service or host wallet flow
5. verify the result before reporting success

### Agenetics Service

The Agenetics service owns the market logic:

- profile inspection
- gene packaging
- redaction checks
- deterministic scoring
- Filecoin Pin upload and verification
- ERC-8004 registration helpers
- listing creation
- purchase verification
- export and breeding preparation
- breeding receipt creation

Aomi calls the service. The Aomi UI must not shell directly into local commands.

## Data Contracts

### Gene Manifest

Required fields:

- schema: `agenetics.gene_manifest.v1`
- gene ID
- gene format: `openclaw.profile.v1`
- seller agent `{agentRegistry, agentId}`
- source commit and parent commit
- file hashes for `AGENTS.md`, `MEMORY.md`
- encrypted payload CID
- preview CID
- score report CID
- redaction report hash
- Filecoin Pin proof fields
- breeding provenance when available

### Score Report

Required fields:

- schema: `agenetics.gene_score.v1`
- gene ID
- evidence CIDs
- deterministic metrics
- deterministic score
- scoring formula version
- optional model-written valuation note

### Listing

Required fields:

- schema: `agenetics.market_listing.v1`
- listing ID
- seller agent
- manifest CID
- encrypted payload CID
- score report CID
- price amount
- payment asset
- escrow framework and demand
- delivery public key requirement
- status: `draft`, `live`, `sold`, `cancelled`, or `expired`

### Purchase Receipt

Required fields:

- schema: `agenetics.purchase_receipt.v1`
- listing ID
- buyer agent
- seller agent
- manifest CID
- encrypted payload CID
- escrow ID
- payment asset, amount, and status
- buyer delivery public key
- key envelope hash
- delivery proof hash
- decryption verification result
- storage verification result
- identity verification result

### Breeding Receipt

Required fields:

- schema: `agenetics.breeding_receipt.v1`
- type: `full_breed` or `selective_breed`
- buyer agent
- purchased gene ID
- purchased manifest CID
- buyer pre-breed profile hash
- breeding report CID
- resulting profile commit
- resulting file hashes

## Lifecycle

1. Inspect: seller agent selects profile files and evidence.
2. Package: Agenetics hashes files, applies redaction rules, encrypts payload, writes manifest.
3. Score: Agenetics computes deterministic metrics and optional valuation note.
4. Store: Agenetics uploads manifest, payload, preview, score, and evidence to IPFS/Filecoin Pin.
5. Register: seller agent updates ERC-8004 metadata with market and verification endpoints.
6. List: seller creates Arkhai escrow terms and publishes the listing.
7. Buy: buyer inspects listing, score, preview, evidence, identity, and payment terms.
8. Settle: buyer pays through the Filecoin Pay path; seller fulfills with a buyer-encrypted decryption key.
9. Verify: buyer verifies payload, hashes, identity, escrow, payment, and delivery.
10. Breed: buyer exports to a review directory and creates a breeding commit only after confirmation.
11. Record: Agenetics records the breeding provenance.

## Verification Rules

Agenetics fails closed when proof is missing or inconsistent.

Required checks:

- gene contains only allowed profile files
- denied secret patterns are absent
- manifest hash matches stored manifest
- encrypted payload hash matches manifest
- decrypted files match advertised hashes
- score report hash matches manifest
- storage status is verified before listing is live
- seller ERC-8004 identity resolves
- escrow condition references exact manifest and hashes
- buyer-encrypted key envelope unlocks exact payload
- breeding commit writes only after explicit confirmation

On failure, the system leaves local retry state and a structured error. It must not mark the gene
live, settled, verified, or bred.

## Aomi Tool Surface

The first Aomi app should expose this compact workflow:

- `inspect_openclaw_profile`
- `create_gene_asset`
- `score_gene_asset`
- `upload_gene_to_filecoin`
- `register_agent_profile`
- `create_gene_listing`
- `inspect_gene_listing`
- `create_gene_purchase`
- `verify_gene_delivery`
- `prepare_gene_breed`
- `record_gene_breeding`

Each tool returns stable JSON with identifiers, verification status, and next action.

Write tools require explicit confirmation and must not report success until upstream verification
finishes.

## Security and Privacy

V1 must include:

- default-deny redaction rules
- `.ageneticsignore`
- per-gene encryption keys
- public preview limited to safe summary and hashes
- no raw secret upload
- confirmation before public storage
- confirmation before profile breeding

Anything uploaded unencrypted to IPFS/Filecoin is public.

## V1 Hackathon Slice

V1 proves a four-agent exchange and evolution loop.

Required demo:

1. A local Kind cluster runs four isolated OpenClaw instances: alpha, beta, gamma, and delta.
2. Each agent starts with distinct `AGENTS.md`, `MEMORY.md`, and trade evidence.
3. Agenetics packages one encrypted starting gene per agent.
4. Filecoin Pin stores each manifest, encrypted payload, preview, and score.
5. Each agent is registered or updated through ERC-8004 metadata.
6. Each agent lists its gene with an Arkhai/NLA escrow condition.
7. Aomi coordinates an autonomous exchange round: alpha buys beta, beta buys gamma, gamma buys delta,
   and delta buys alpha.
8. Each seller delivers the buyer-encrypted decryption key for the exact manifest CID and file hashes.
9. Each buyer verifies, decrypts, exports to a review directory, and breeds selected profile sections.
10. Agenetics records purchase and breeding receipts for all four agents.
11. The demo shows the second-generation genes and their lineage graph.

Required live proof:

- four OpenClaw instances in Kind: alpha, beta, gamma, delta
- four initial encrypted genes
- four Filecoin Pin uploads
- four ERC-8004 registrations or updates
- four Filecoin Pay wallet/payment paths
- four Arkhai/NLA escrow flows
- one Aomi-guided autonomous exchange round
- four verified purchase receipts
- four breeding receipts
- one lineage view showing the second-generation gene state

V1 non-goals:

- automated trading
- profitability guarantees
- broad ranking market beyond the four-agent demo loop
- private registry support
- deterministic model-output replay
- full tokenomics

## Acceptance Criteria

A reviewer can verify:

- the gene is exactly the two OpenClaw profile files
- public metadata verifies content, identity, storage, score, and purchase
- private profile content stays encrypted until settlement
- seller and buyer are represented as ERC-8004 agents
- IPFS/Filecoin stores the market artifact
- Filecoin Pay participates in settlement
- Arkhai escrow protects delivery
- Aomi is the agent-facing interface
- alpha, beta, gamma, and delta each breed at least one external gene into a Git descendant
- Agenetics records a coherent exchange graph from starting genes to second-generation genes

## References

- ERC-8004: https://eips.ethereum.org/EIPS/eip-8004
- Filecoin Pin ERC-8004 agent registration: https://docs.filecoin.io/builder-cookbook/filecoin-pin/erc-8004-agent-registration
- Filecoin Pay overview: https://docs.filecoin.cloud/core-concepts/filecoin-pay-overview/
- Arkhai Natural Language Agreements: https://github.com/arkhai-io/natural-language-agreements
- Arkhai Alkahest: https://github.com/arkhai-io/alkahest
- Aomi build overview: https://aomi.dev/docs/build/overview
- OpenClaw Kubernetes install: https://docs.openclaw.ai/install/kubernetes
- Aomi SDK notes: `docs/knowledge/aomi-sdk.md`
- OpenClaw Kubernetes notes: `docs/knowledge/openclaw-cluster.md`
- Hackathon notes: `docs/knowledge/ipfs-openclaw-hackathon.md`
- Pitch: `docs/pitch.md`
