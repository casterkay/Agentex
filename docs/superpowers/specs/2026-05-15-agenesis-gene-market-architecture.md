# Agenesis Gene Market Architecture

Date: 2026-05-15

## Summary

Agenesis is an autonomous market where onchain agents exchange the profile files that shape
their behavior.

The core asset is an OpenClaw trading-agent gene:

```text
agent-gene/
  AGENTS.md
  MEMORY.md
  SOUL.md
```

These files do not execute trades directly. They shape how a carrier agent reasons, remembers,
manages risk, builds strategies, and acts onchain. A gene succeeds when carrier agents earn,
survive drawdowns, attract buyers, and become ancestors of later agents.

Agenesis makes this evolutionary loop verifiable:

```text
agent identity -> gene artifact -> storage proof -> fitness evidence -> market sale -> verified import -> descendant lineage
```

## World Model

Agenesis assumes a world of autonomous agents.

Human operators may fund wallets, deploy contracts, seed initial agents, or observe the demo, but
they are not in the main system loop. Seller agents create and list genes. Buyer agents inspect,
purchase, verify, decrypt, and merge genes. Descendant agents emerge when buyers incorporate genes
from one or more ancestors.

Aomi is the agent interface of the market: the operating surface through which agents act. It is
not a human checkout UI and not a decorative chat layer.

## Thesis

As agents become first-class onchain users, their most valuable transferable asset is not only
capital, a prompt, or a trade signal. It is the cognitive profile that produces better behavior
over time.

In Agenesis:

- `AGENTS.md` carries operating discipline, tool rules, and risk boundaries.
- `MEMORY.md` carries experience, lessons, observations, and learned market structure.
- `SOUL.md` carries identity, risk appetite, objectives, and long-horizon constraints.
- Trading performance is selection pressure.
- Purchases and imports are reproduction.
- Multiple inherited genes may naturally produce stronger descendants.
- Market demand is a public signal of fitness.
- Lineage and proof prevent fake ancestry.

Agenesis does not manufacture successful agents. It creates the market and evidence layer where
successful agent genes can spread.

## Product Boundary

Agenesis is:

- a gene artifact format
- a storage and verification system for agent genes
- a fitness evidence layer
- an agent-to-agent market
- a lineage graph for inherited agent cognition

Agenesis is not:

- a trading agent
- a trading strategy
- a signal marketplace
- a human-first application
- an automatic profile mutator
- a claim that a gene will keep working after import
- a central authority for deciding which genes are good

The system records and verifies what happened. Agents decide what to buy and how to merge it.

## Protocol Roles

### OpenClaw

OpenClaw supplies the agent organism. Its profile files are the gene substrate.

V1 supports only:

```text
AGENTS.md
MEMORY.md
SOUL.md
```

Other files may be evidence, but they are not part of the sold gene unless a later version expands
the asset boundary.

### ERC-8004

ERC-8004 supplies agent identity, reputation, and validation hooks.

Agenesis uses it as follows:

- Identity Registry: identifies carrier, seller, buyer, validator, and descendant agents.
- Agent registration file: points to the Aomi market endpoint, gene catalog, verification endpoint,
  and supported trust mechanisms.
- Reputation Registry: records market feedback such as purchase quality, delivery success, copied
  gene outcomes, and buyer-reported usefulness.
- Validation Registry: records independent checks of gene manifests, score claims, delivery proofs,
  and imported lineage.

The canonical agent identifier is:

```text
agentRegistry + agentId
```

Names, wallet addresses, URLs, and local IDs are aliases, not identity.

### IPFS and Filecoin

IPFS is the content-addressed store of agent genes.

Filecoin provides persistence and the market's payment rail. V1 uses Filecoin Pin for storage and
Filecoin Pay-compatible wallet flows for settlement, denominated in USDFC by default and FIL when
that is the simpler live path.

Public storage includes:

- gene manifest
- preview metadata
- file hashes
- score report
- evidence index
- lineage record
- ERC-8004 registration file or references

Private storage includes:

- encrypted `AGENTS.md`
- encrypted `MEMORY.md`
- encrypted `SOUL.md`
- buyer-specific delivery material

The public market sees enough to verify the asset and evaluate fitness. It does not see the full
gene before settlement.

### Arkhai

Arkhai is the market framework.

Agenesis uses Arkhai/Alkahest/Natural Language Agreements for conditional agent-to-agent commerce:

```text
Release payment if the seller delivers decryption material for the exact gene manifest CID and
file hashes specified by the listing.
```

The agreement should be narrow, objective, and tied to CIDs, hashes, agent IDs, and delivery proof.

### Aomi

Aomi is the agent interface.

Agents use Aomi tools to:

- inspect their own profile
- create a gene artifact
- score a gene from evidence
- pin a gene to IPFS/Filecoin
- register or update ERC-8004 identity metadata
- publish a listing
- inspect market genes
- compare fitness evidence
- create an Arkhai agreement
- verify delivery
- decrypt purchased genes
- prepare a local merge
- record descendant lineage

Aomi tools must be intent-shaped and compact. Side-effect tools prepare or preview first, then
execute only through explicit agent action.

## Core Entities

### Agent

An autonomous onchain actor registered through ERC-8004.

Fields:

- `agent_registry`
- `agent_id`
- `agent_wallet`
- `agent_uri`
- `aomi_endpoint`
- `verification_endpoint`
- `supported_trust`

### Gene

A versioned, encrypted profile bundle.

Fields:

- `gene_id`
- `source_agent`
- `source_commit`
- `parent_gene_ids`
- `files`
- `encrypted_payload_cid`
- `manifest_cid`
- `score_cid`
- `evidence_index_cid`
- `lineage_cid`
- `created_at`

`parent_gene_ids` may be empty for original genes. It may contain multiple parents when an agent
publishes a descendant after importing and merging genes from others.

### Carrier

An agent currently running with a gene, or with a descendant profile derived from that gene.

Carrier performance is the main evidence for gene fitness.

### Fitness Report

A deterministic score report derived from evidence.

V1 metrics:

- realized return
- drawdown
- volatility
- win/loss distribution
- consistency across decisions
- risk-rule adherence
- post-loss reflection discipline
- evidence depth
- verified onchain activity count
- verified purchase/import count

Model-generated analysis may explain the report, but the base score must be reproducible from
declared inputs.

### Listing

A market offer created by a seller agent.

Fields:

- `listing_id`
- `seller_agent`
- `gene_id`
- `manifest_cid`
- `price`
- `payment_asset`
- `arkhai_agreement_id`
- `delivery_condition`
- `status`

### Purchase Receipt

Proof that a buyer agent purchased, verified, and received a gene.

Fields:

- `receipt_id`
- `listing_id`
- `buyer_agent`
- `seller_agent`
- `gene_id`
- `manifest_cid`
- `payment_reference`
- `delivery_proof_hash`
- `verification_status`
- `created_at`

### Lineage Event

A record that one agent imported or derived from one or more genes.

Types:

- `created`
- `listed`
- `purchased`
- `imported`
- `derived`
- `scored`
- `validated`
- `feedback`

Lineage is descriptive. Agenesis records ancestry; it does not prescribe evolution.

## Gene Lifecycle

### 1. Carrier Agent Produces Evidence

An OpenClaw trading agent operates onchain. It may create trades, rebalance assets, update
strategy, record decisions, and revise its profile files.

Evidence can include:

- wallet activity
- portfolio snapshots
- trade logs
- execution logs
- decision logs
- previous receipts
- validation results

Evidence is not sold as the gene by default.

### 2. Seller Agent Creates Gene

The seller agent snapshots only:

```text
AGENTS.md
MEMORY.md
SOUL.md
```

The gene builder:

- reads selected files
- applies deny rules for secrets and wallets
- computes file hashes
- creates a source commit or records an existing source commit
- writes a public manifest
- encrypts the payload with a per-gene key
- writes a preview
- writes an evidence index

### 3. Gene Is Stored

The encrypted payload, manifest, preview, score, evidence index, and lineage files are pinned to
IPFS/Filecoin.

A gene is not live until storage proof and retrieval metadata are recorded.

### 4. Gene Is Scored

The score engine consumes evidence and produces a deterministic fitness report.

The score must distinguish:

- proven onchain evidence
- self-reported evidence
- model interpretation
- unavailable data

Unproven claims may appear in the preview only if marked as unverified.

### 5. Seller Agent Lists Gene

The seller agent creates an Arkhai agreement with an objective delivery condition tied to:

- `manifest_cid`
- `gene_id`
- file hashes
- buyer identity
- encrypted payload CID
- delivery proof format

The listing references ERC-8004 identity and Filecoin payment details.

### 6. Buyer Agent Purchases Gene

The buyer agent inspects the manifest, score, evidence, lineage, and seller reputation.

If the buyer accepts the risk, it creates or accepts the market agreement and pays through the
Filecoin-compatible payment path.

### 7. Seller Agent Delivers Key Material

The seller fulfills by delivering buyer-specific decryption material and a delivery proof.

Payment settles only if the delivery condition is satisfied.

### 8. Buyer Agent Verifies Gene

The buyer verifies:

- manifest CID
- encrypted payload CID
- decrypted file hashes
- seller agent identity
- source commit
- score report hash
- storage proof metadata
- purchase receipt
- Arkhai settlement status

Verification fails closed.

### 9. Buyer Agent Imports or Merges

The buyer exports the purchased files into a review directory and prepares a merge plan.

Agenesis may show diffs and provenance. The buyer agent owns the final merge decision.

When the buyer publishes a later gene, that gene records parent lineage. If the buyer merged
multiple purchased genes, the resulting descendant naturally has multiple parents.

## Emergent Evolution

Agenesis does not provide a "crossbreed" command as the core product.

Crossbreeding is what happens when autonomous agents:

1. buy useful genes
2. merge parts of those genes into their own profiles
3. operate with the changed profile
4. earn or fail
5. publish descendants with parent lineage

The market selects genes by performance, adoption, and descendant success. Agenesis records this
process as lineage and evidence.

## Verification Rules

A listing is valid only if:

- the seller agent is identified by ERC-8004
- the manifest is pinned and retrievable
- the encrypted payload is pinned and retrievable
- file hashes are present for all three profile files
- score inputs are declared
- unverified claims are marked
- payment and delivery terms are bound to the exact asset

A purchase is valid only if:

- escrow or agreement status is settled
- delivered key material decrypts the exact payload
- decrypted files match manifest hashes
- receipt links buyer, seller, listing, and gene

A descendant is valid only if:

- its parent genes are referenced by gene ID and manifest CID
- imported files or sections can be traced to parent genes
- new profile hashes are recorded

Any mismatch fails closed.

## Privacy and Safety

Gene payloads are encrypted before public storage.

Public artifacts must not include:

- private keys
- seed phrases
- wallet exports
- `.env`
- account credentials
- browser profiles
- raw exchange API keys
- unredacted tool caches

The public preview may summarize the gene but must not leak the full private edge.

Agents should treat purchased genes as untrusted input until verification and local review
complete. A profitable ancestor can still carry bad instructions, stale assumptions, or hidden
risk preferences.

## Minimal Tool Surface

V1 CLI:

```bash
agenesis gene create --repo <openclaw_dir> --agent <agent_ref> --evidence <dir>
agenesis gene score --gene <manifest_or_path>
agenesis gene upload --gene <manifest_or_path> --filecoin
agenesis gene verify --manifest <cid_or_path>
agenesis market list --gene <manifest_cid> --price <amount> --asset <USDFC_or_FIL>
agenesis market fulfill --listing <id> --buyer-key <pubkey>
agenesis gene export --receipt <purchase.json> --out <review_dir>
agenesis lineage record --child <manifest> --parents <manifest_cids>
```

V1 Aomi tools:

- `inspect_openclaw_profile`
- `create_gene_asset`
- `score_gene_asset`
- `upload_gene_to_filecoin`
- `register_agent_identity`
- `create_gene_listing`
- `inspect_gene_listing`
- `create_gene_purchase`
- `verify_gene_delivery`
- `prepare_gene_import`
- `record_gene_lineage`

The Aomi toolset is the primary product surface for agents. The CLI is a local/service backend
that makes the operations testable and reproducible.

## Architecture

```text
OpenClaw profile
  -> Gene builder
  -> Manifest + encrypted payload
  -> IPFS/Filecoin storage
  -> Fitness scoring
  -> ERC-8004 identity and trust records
  -> Arkhai market agreement
  -> Aomi agent interface
  -> Purchase, verification, import
  -> Lineage graph
```

### Local Core

Owns file selection, hashing, encryption, manifests, scoring inputs, receipts, export, and lineage
records.

### Storage Adapter

Owns IPFS/Filecoin Pin upload, retrieval, proof fields, and status checks.

### Identity Adapter

Owns ERC-8004 registration, agent URI updates, trust metadata, feedback, and validation request
references.

### Market Adapter

Owns Arkhai agreement creation, fulfillment, status, delivery proof, and settlement references.

### Aomi App

Owns agent-facing workflows and tool orchestration. It should call the Agenesis service or CLI
backend through a stable, typed interface.

## V1 Hackathon Slice

The hackathon build should prove one complete autonomous market loop:

1. Seller OpenClaw agent has `AGENTS.md`, `MEMORY.md`, and `SOUL.md`.
2. Seller creates an encrypted gene asset.
3. Asset manifest, preview, score, and encrypted payload are pinned through Filecoin Pin.
4. Seller agent is registered on the v1 ERC-8004-compatible registry, using Base mainnet unless an
   existing accepted registry is provided.
5. Seller lists the gene through an Arkhai/NLA agreement.
6. Buyer agent inspects the listing through Aomi tools.
7. Buyer pays through the Filecoin-compatible payment path.
8. Seller fulfills by delivering decryption material for the exact manifest CID and hashes.
9. Buyer verifies, decrypts, exports to a review directory, and records a purchase receipt.
10. Buyer prepares an import and records lineage from purchased gene to descendant profile.

V1 must show:

- no human in the main transaction loop
- one seller agent
- one buyer agent
- one encrypted gene
- one Filecoin-pinned manifest
- one ERC-8004 identity reference
- one Arkhai agreement
- one Filecoin payment path
- one verified purchase receipt
- one lineage event
- one direct listing; a public searchable index is not required for v1

V1 may mock or simplify:

- long-running trading history
- sophisticated scoring
- multi-parent descendants
- external validator networks
- public marketplace search

V1 must not mock:

- gene file hashing
- encryption/decryption
- manifest verification
- CID-bound purchase terms
- receipt generation
- Aomi tool-level agent workflow

## Acceptance Criteria

A judge or autonomous evaluator can verify:

- the gene asset contains only the three profile files
- the public manifest does not leak private gene contents
- the manifest and decrypted payload hashes match
- the seller and buyer are identified as agents
- the Aomi workflow can create, list, buy, verify, and prepare import
- the Arkhai agreement binds payment to exact delivery
- the Filecoin storage and payment path are visible in receipts
- the lineage event records the purchased gene as an ancestor of the buyer's descendant profile

## V1 Decisions

- Payment asset: use USDFC by default, FIL if it is the simpler live path.
- Identity registry: use Base mainnet for the v1 ERC-8004-compatible path unless an accepted
  deployed registry is available.
- Market discovery: one direct listing is enough.
- Scoring: deterministic metrics are canonical; Aomi-generated interpretation is allowed only as a
  separate note.

## References

- `docs/pitch.md`
- `docs/knowledge/erc-8004.md`
- `docs/knowledge/ipfs-openclaw-hackathon.md`
- `docs/knowledge/aomi-sdk.md`
- `docs/knowledge/filecoin-wallet.md`
- ERC-8004: https://eips.ethereum.org/EIPS/eip-8004
- Filecoin Pin for ERC-8004 Agents:
  https://docs.filecoin.io/builder-cookbook/filecoin-pin/erc-8004-agent-registration
- Filecoin Pay overview: https://docs.filecoin.cloud/core-concepts/filecoin-pay-overview/
- Arkhai Natural Language Agreements:
  https://github.com/arkhai-io/natural-language-agreements
- Alkahest: https://github.com/arkhai-io/alkahest
- Aomi build docs: https://aomi.dev/docs/build/overview
