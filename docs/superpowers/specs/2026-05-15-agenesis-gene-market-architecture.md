# Agenesis Gene Market Architecture

Date: 2026-05-15

## Summary

Agenesis is a gene market for onchain AI agents.

In v1, the market serves OpenClaw trading agents. A gene is the small profile bundle that shapes an
agent's behavior:

```text
AGENTS.md
MEMORY.md
SOUL.md
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

## Product Boundary

Agenesis sells verifiable agent genes, not trades.

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
- `SOUL.md`: identity, objectives, risk appetite, long-term constraints.

Agenesis creates selection pressure:

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
Aomi app endpoint, Agenesis verification endpoint, wallet/payment metadata, and supported trust
mechanisms.

### Gene

A gene is a portable OpenClaw profile asset.

V1 gene contents are exactly:

- `AGENTS.md`
- `MEMORY.md`
- `SOUL.md`

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
- per-asset decryption key

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

Agenesis uses:

- Identity Registry to identify carriers, sellers, buyers, and validators.
- Registration files to point to Aomi, Agenesis, Filecoin/IPFS metadata, wallets, and trust methods.
- Reputation Registry for buyer feedback, seller reliability, breeding success, and gene reputation.
- Validation Registry for independent checks of gene integrity, scoring evidence, delivery, or
  breeding records.

Registration proves identity, not quality. Agenesis must bind identity to content, evidence, market
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
Release payment if the seller delivers a decryption key that unlocks the exact gene payload
identified by this manifest CID and these file hashes.
```

Agenesis records escrow ID, fulfillment proof, arbitration/oracle result, and collection status in
the purchase receipt.

### Aomi

Aomi is the agent interface.

Agents use Aomi to inspect, create, score, list, buy, verify, and breed genes. The Aomi app should
expose intent-shaped tools instead of raw protocol endpoints.

Side effects must follow prepare-first execution:

1. preview the action
2. show the exact identifiers and risks
3. require explicit confirmation
4. execute through the Agenesis service or host wallet flow
5. verify the result before reporting success

### Agenesis Service

The Agenesis service owns the market logic:

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

- schema: `agenesis.gene_manifest.v1`
- gene ID
- gene format: `openclaw.profile.v1`
- seller agent `{agentRegistry, agentId}`
- source commit and parent commit
- file hashes for `AGENTS.md`, `MEMORY.md`, `SOUL.md`
- encrypted payload CID
- preview CID
- score report CID
- redaction report hash
- Filecoin Pin proof fields
- breeding provenance when available

### Score Report

Required fields:

- schema: `agenesis.gene_score.v1`
- gene ID
- evidence CIDs
- deterministic metrics
- deterministic score
- scoring formula version
- optional model-written valuation note

### Listing

Required fields:

- schema: `agenesis.market_listing.v1`
- listing ID
- seller agent
- manifest CID
- encrypted payload CID
- score report CID
- price amount
- payment asset
- escrow framework and demand
- status: `draft`, `live`, `sold`, `cancelled`, or `expired`

### Purchase Receipt

Required fields:

- schema: `agenesis.purchase_receipt.v1`
- listing ID
- buyer agent
- seller agent
- manifest CID
- encrypted payload CID
- escrow ID
- payment asset, amount, and status
- delivery proof hash
- decryption verification result
- storage verification result
- identity verification result

### Breeding Receipt

Required fields:

- schema: `agenesis.breeding_receipt.v1`
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
2. Package: Agenesis hashes files, applies redaction rules, encrypts payload, writes manifest.
3. Score: Agenesis computes deterministic metrics and optional valuation note.
4. Store: Agenesis uploads manifest, payload, preview, score, and evidence to IPFS/Filecoin Pin.
5. Register: seller agent updates ERC-8004 metadata with market and verification endpoints.
6. List: seller creates Arkhai escrow terms and publishes the listing.
7. Buy: buyer inspects listing, score, preview, evidence, identity, and payment terms.
8. Settle: buyer pays through the Filecoin Pay path; seller fulfills with the decryption key.
9. Verify: buyer verifies payload, hashes, identity, escrow, payment, and delivery.
10. Breed: buyer exports to a review directory and creates a breeding commit only after confirmation.
11. Record: Agenesis records the breeding provenance.

## Verification Rules

Agenesis fails closed when proof is missing or inconsistent.

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
- delivery unlocks exact payload
- breeding commit writes only after explicit confirmation

On failure, the system leaves local retry state and a structured error. It must not mark the asset
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
- `.agenesisignore`
- per-asset encryption keys
- public preview limited to safe summary and hashes
- no raw secret upload
- confirmation before public storage
- confirmation before profile breeding

Anything uploaded unencrypted to IPFS/Filecoin is public.

## V1 Hackathon Slice

V1 proves one complete market loop.

Required demo:

1. Seller OpenClaw agent has profile files and trade evidence.
2. Agenesis packages one encrypted gene.
3. Filecoin Pin stores the manifest, encrypted payload, preview, and score.
4. Seller agent is registered or updated through ERC-8004 metadata.
5. Seller lists the gene with an Arkhai/NLA escrow condition.
6. Buyer agent inspects the listing through Aomi.
7. Buyer pays through the Filecoin Pay path.
8. Seller delivers the decryption key for the exact manifest CID and file hashes.
9. Buyer verifies, decrypts, exports to a review directory, and prepares a breeding commit.
10. Agenesis records purchase and breeding receipts.

Required live proof:

- one seller agent
- one buyer agent
- one encrypted gene
- one Filecoin Pin upload
- one ERC-8004 registration or update
- one Filecoin Pay wallet/payment path
- one Arkhai/NLA escrow flow
- one Aomi-guided buyer/seller workflow
- one verified purchase receipt
- one breeding receipt

V1 non-goals:

- automated trading
- profitability guarantees
- broad ranking market
- private registry support
- deterministic model-output replay
- full tokenomics

## Acceptance Criteria

A reviewer can verify:

- the gene is exactly the three OpenClaw profile files
- public metadata verifies content, identity, storage, score, and purchase
- private profile content stays encrypted until settlement
- seller and buyer are represented as ERC-8004 agents
- IPFS/Filecoin stores the market artifact
- Filecoin Pay participates in settlement
- Arkhai escrow protects delivery
- Aomi is the agent-facing interface
- breeding into the buyer agent's own profile creates a Git descendant and receipt

## References

- ERC-8004: https://eips.ethereum.org/EIPS/eip-8004
- Filecoin Pin ERC-8004 agent registration: https://docs.filecoin.io/builder-cookbook/filecoin-pin/erc-8004-agent-registration
- Filecoin Pay overview: https://docs.filecoin.cloud/core-concepts/filecoin-pay-overview/
- Arkhai Natural Language Agreements: https://github.com/arkhai-io/natural-language-agreements
- Arkhai Alkahest: https://github.com/arkhai-io/alkahest
- Aomi build overview: https://aomi.dev/docs/build/overview
- Aomi SDK notes: `docs/knowledge/aomi-sdk.md`
- Hackathon notes: `docs/knowledge/ipfs-openclaw-hackathon.md`
- Pitch: `docs/pitch.md`
