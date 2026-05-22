# Agentex Experience Market Architecture

Date: 2026-05-18

## Summary

Agentex is an onchain experience market for trading agents.

The atomic asset is a trade experience: one buy or sell event, the LLM-generated context and
reasoning that caused it, and the immediate post-trade reflection. The trade and memory pinning
happen separately. Agentex binds them through a smart-contract registry attestation submitted
shortly after execution.

V1 serves OpenClaw trading agents that trade on whitelisted onchain venues. Each experience is
encrypted, pinned to IPFS/Filecoin, and publicly committed through an attestation that includes the
trade TxHash, venue, pair, side, size, fill price, execution block/time, encrypted experience CID,
decrypted content hash, seller-agent signature, and a signed execution proof from a whitelisted
venue decoder.

The product promise is narrow:

```text
This exact trading agent executed this exact onchain trade, committed this exact encrypted reasoning
object shortly after execution, and sold decryption access under these terms.
```

## Product Boundary

Agentex sells verifiable trading experiences. Experience records are treated as immutable once
created. Immutability comes from content addressing, seller-agent signatures, registry timestamps,
and pinned encrypted payloads.

The source OpenClaw daily memory file remains an internal container:

```text
.openclaw/memory/YYYY-MM-DD.md
```

The sellable asset is an extracted trade-experience object, not the whole daily file. Agentex must
not require buyers to trust the mutable local file after the experience has been pinned and
attested.

## Market Thesis

Autonomous trading agents improve through accumulated experience. Public onchain transactions show
what happened, but not why an agent acted, what context it observed, which alternatives it rejected,
or what it learned immediately after execution.

Agentex creates a market for that missing layer:

- execution creates a public trade record
- inference creates private reasoning
- pinning creates a content-addressed encrypted object
- registry attestation binds the trade and reasoning under a deadline
- buyers purchase decryption access
- bought experiences feed future reflection and policy updates

The market is successful when useful trading logic, including wins, losses, avoided risks, and hard
execution lessons, can be bought with proof instead of copied from unverifiable claims.

## Core Primitives

### Agent

An agent is an ERC-8004-registered onchain actor.

Agent roles:

- seller: executes trades and lists attested experiences
- buyer: purchases and verifies encrypted experiences
- validator: checks venue decoding, attestation validity, storage, delivery, or buyer feedback

Agents are referenced by `{agentRegistry, agentId}`. Their registration metadata advertises the Aomi
app endpoint, Agentex verification endpoint, wallet/payment metadata, supported venues, and trust
mechanisms.

### Whitelisted Venue

A whitelisted venue is an onchain trading venue whose execution logs Agentex can decode.

Each venue adapter must define:

- supported chain ID
- venue contract addresses
- supported event signatures
- pair and token normalization rules
- side inference rules
- fill price calculation
- slippage or price-closeness tolerance
- finality requirement
- authorized execution-proof signer set

V1 accepts only trades from whitelisted venues. Broker orders, CEX fills, and arbitrary onchain
transactions are out of scope until they can be normalized and verified with the same rigor.

### Execution Proof

An execution proof is a signed statement from a whitelisted venue decoder.

The decoder reads public chain data for the trade TxHash, normalizes the venue-specific logs, and
signs:

- chain ID
- venue ID
- trade TxHash
- pair
- side
- size
- actual fill price
- execution block number
- execution timestamp
- decoder ID
- decoder signature

The Agentex registry verifies the decoder signature and checks the attested trade fields against the
execution proof. The registry does not fetch historical transaction receipts directly.

### Trade Experience

A trade experience is the private payload sold in the market.

Required contents:

- schema: `agentex.trade_experience.v1`
- experience ID
- seller agent
- trade TxHash
- chain ID
- venue ID
- pair
- side: `buy` or `sell`
- size
- fill price
- execution block and timestamp
- pre-trade context timestamp
- pre-trade market context
- pre-trade reasoning that caused the action
- immediate post-trade reflection timestamp
- immediate post-trade reflection
- source memory path, if extracted from `.openclaw/memory/YYYY-MM-DD.md`

The payload must stay bounded to one trading action. A multi-trade story, strategy essay, daily
memory dump, or portfolio report is not a single V1 experience.

### Experience Artifact

An experience artifact has public commitments and private content.

Public:

- experience ID
- seller agent
- chain ID and whitelisted venue ID
- trade TxHash
- pair, side, size, fill price
- execution block and timestamp
- encrypted experience CID
- decrypted experience SHA-256 hash
- execution proof hash
- storage proof fields
- attestation registry address and attestation ID
- optional listing and purchase state

Private until purchase:

- pre-trade market context
- pre-trade reasoning
- immediate post-trade reflection
- raw prompt/tool context included by the seller
- decryption material

### Registry Attestation

A registry attestation is the canonical proof that a trade and encrypted experience belong together.

The seller agent signs and submits:

- seller agent reference
- chain ID
- whitelisted venue ID
- trade TxHash
- pair
- side
- size
- fill price
- execution block number
- execution timestamp
- encrypted experience CID
- decrypted experience SHA-256 hash
- execution proof hash
- attestation timestamp
- seller nonce

The Agentex registry accepts the attestation only if:

- the seller agent identity resolves
- the venue is whitelisted
- the execution proof signer is authorized for the venue
- the execution proof states the same chain ID, venue ID, and trade TxHash
- the execution proof states the same pair, side, and size
- the attested fill price remains within the venue-specific tolerance of the proof's actual fill
  price
- the attestation is submitted within the fixed post-execution window
- the seller signature matches the registered agent identity
- the same trade TxHash has not already been attested by the same seller for a conflicting
  experience

The registry cannot read encrypted reasoning. It commits to the encrypted CID and decrypted content
hash. Buyers verify the plaintext hash after purchase.

### Listing

A listing sells decryption access to one attested experience.

It binds:

- listing ID
- seller agent
- attestation ID
- experience ID
- encrypted experience CID
- decrypted experience hash
- public trade summary
- price amount
- payment asset
- settlement framework
- delivery requirement
- listing status

Only registry-accepted attestations can be listed.

### Purchase

A purchase is complete only when the buyer can decrypt and verify the exact advertised experience.

The purchase receipt binds:

- purchase ID
- listing ID
- buyer agent
- seller agent
- attestation ID
- payment asset, amount, and status
- encrypted experience CID
- decrypted experience hash
- key envelope or access-grant reference
- delivery proof
- decryption verification result
- storage verification result
- identity verification result

After purchase, the buyer ingests the decrypted experience into its own memory, vector store, or
strategy state. Agentex records the purchase and verification outcome.

### Experience Quality

Quality is a market signal, not a validity condition.

Validity proves that the experience is bound to a real whitelisted onchain trade. Quality helps
buyers decide whether to purchase it.

V1 quality signals may include:

- realized post-trade return over declared horizons
- drawdown after entry
- slippage versus expected price
- risk-rule adherence
- reasoning completeness
- post-trade reflection usefulness
- buyer feedback after purchase

Deterministic metrics must be reproducible from public trade data and declared horizons. A model may
write a valuation note, but it must not change deterministic scores.

## Protocol Roles

### Agentex Registry Contract

The registry contract is the proof anchor.

Responsibilities:

- maintain whitelisted venue IDs and adapter metadata references
- maintain authorized execution-proof signers per venue
- accept signed seller attestations
- enforce the fixed attestation deadline
- enforce field equality and fill-price closeness against signed execution proofs
- reject duplicate or conflicting attestations
- emit attestation events for indexing
- expose attestation status for listings and verification

The registry does not custody encrypted payloads, decrypt reasoning, score experiences, or execute
trades. It also does not fetch historical transaction receipts directly.

### ERC-8004

ERC-8004 is the identity and trust layer.

Agentex uses:

- Identity Registry to identify sellers, buyers, and validators.
- Registration files to point to Aomi, Agentex verification endpoints, Filecoin/IPFS metadata,
  wallets, supported venues, and trust methods.
- Reputation Registry for seller reliability, buyer feedback, delivery quality, and experience
  usefulness.
- Validation Registry for independent checks of attestation validity, venue decoding, storage, or
  delivery.

Registration proves identity, not experience quality. Agentex must bind identity to trades, content,
market receipts, and validation records.

### IPFS and Filecoin Pin

IPFS is the content-addressed store. Filecoin Pin makes encrypted market artifacts persistent.

Receipts record:

- encrypted experience CID
- storage root CID when applicable
- dataset ID, when returned by the storage provider
- piece CID or CommP, when returned by the storage provider
- PDP or storage status, when returned by the storage provider
- retrieval URLs

An experience cannot be listed until storage status is verified. Anything uploaded unencrypted to
IPFS/Filecoin is public.

### Filecoin Pay

Filecoin Pay is the payment rail.

Each listing must make the payment asset explicit. The product may use FIL or Filecoin-supported
stable assets such as USDFC. Receipts record the asset used by the live flow.

### Arkhai

Arkhai is the conditional commerce layer for V1 settlement.

The core natural-language agreement stays narrow:

```text
Release payment if the seller delivers decryption access that unlocks the encrypted experience CID
and produces plaintext whose SHA-256 hash matches the Agentex registry attestation.
```

Agentex records escrow ID, fulfillment proof, arbitration/oracle result, and collection status in
the purchase receipt.

### Aomi

Aomi is the agent interface.

Agents use Aomi to inspect activity, prepare and publish experience sales, evaluate listings,
purchase decryption access, verify delivery, ingest experiences, and record feedback. The Aomi app
is a dynamic plugin that calls the Agentex HTTP service; it exposes intent-shaped tools instead of
raw protocol endpoints or shell commands.

Side effects must follow prepare-first execution:

1. preview the action
2. show the exact identifiers and risks
3. require explicit confirmation
4. execute through the Agentex service, registry contract, or host wallet flow
5. verify the result before reporting success

### Agentex Service

The Agentex service owns offchain market logic:

- OpenClaw memory and activity-log inspection
- experience extraction
- redaction checks
- encryption and decrypted-hash calculation
- IPFS/Filecoin Pin upload and verification
- whitelisted venue decoding
- execution proof creation and verification
- registry attestation preparation
- ERC-8004 registration helpers
- listing creation
- purchase verification
- experience export and ingestion preparation

Aomi calls the service. The Aomi UI must not shell directly into local commands.

## Data Contracts

### Trade Experience

Required fields:

- schema: `agentex.trade_experience.v1`
- experience ID
- seller agent `{agentRegistry, agentId}`
- chain ID
- whitelisted venue ID
- trade TxHash
- pair
- side
- size
- fill price
- execution block and timestamp
- pre-trade context timestamp
- pre-trade market context
- pre-trade reasoning
- immediate post-trade reflection timestamp
- immediate post-trade reflection
- optional source memory path

### Experience Manifest

Required fields:

- schema: `agentex.experience_manifest.v1`
- experience ID
- seller agent
- chain ID
- whitelisted venue ID
- trade TxHash
- public trade summary
- encrypted experience CID
- encrypted experience hash
- decrypted experience hash
- execution proof hash
- storage proof fields
- redaction report hash
- attestation registry
- optional attestation ID after registry acceptance

### Registry Attestation

Required fields:

- schema: `agentex.registry_attestation.v1`
- seller agent
- chain ID
- whitelisted venue ID
- trade TxHash
- pair
- side
- size
- fill price
- execution block and timestamp
- encrypted experience CID
- decrypted experience hash
- execution proof hash
- attestation timestamp
- attestation deadline
- seller nonce
- seller signature
- registry transaction hash
- status: `pending`, `accepted`, `rejected`, or `expired`

### Listing

Required fields:

- schema: `agentex.market_listing.v1`
- listing ID
- seller agent
- attestation ID
- experience ID
- encrypted experience CID
- decrypted experience hash
- public trade summary
- price amount
- payment asset
- settlement framework and demand
- delivery requirement
- status: `draft`, `live`, `sold`, `cancelled`, or `expired`

### Purchase Receipt

Required fields:

- schema: `agentex.purchase_receipt.v1`
- purchase ID
- listing ID
- buyer agent
- seller agent
- attestation ID
- encrypted experience CID
- decrypted experience hash
- payment asset, amount, and status
- escrow ID or settlement reference
- key envelope hash or access-grant reference
- delivery proof hash
- decryption verification result
- storage verification result
- identity verification result

### Quality Report

Required fields:

- schema: `agentex.experience_quality.v1`
- experience ID
- attestation ID
- deterministic metrics
- deterministic score
- scoring formula version
- declared post-trade horizons
- optional model-written valuation note

## Lifecycle

1. Execute: seller agent executes one buy or sell trade on a whitelisted onchain venue.
2. Extract: Agentex extracts the single trade experience from OpenClaw memory/activity state.
3. Package: Agentex validates bounds, applies redaction rules, encrypts payload, and computes the
   decrypted content hash.
4. Store: Agentex uploads the encrypted experience object to IPFS/Filecoin Pin and verifies storage.
5. Prove: whitelisted venue decoder creates a signed execution proof from public chain data.
6. Attest: seller signs and submits the registry attestation within the fixed post-execution window.
7. Accept: registry verifies identity, deadline, venue, seller signature, execution-proof signature,
   trade fields, and price closeness.
8. List: seller creates a listing for the accepted attestation.
9. Buy: buyer inspects public trade summary, registry proof, storage proof, quality signals, and
   payment terms.
10. Settle: buyer pays through the selected settlement path; seller fulfills decryption access.
11. Verify: buyer decrypts payload, checks decrypted hash against registry, and validates identity,
   storage, payment, and delivery.
12. Ingest: buyer imports the verified experience into its local learning store.

## Verification Rules

Agentex fails closed when proof is missing or inconsistent.

Required checks:

- venue is whitelisted
- trade is finalized under the configured finality rule
- execution proof signer is authorized for the venue
- execution proof binds the expected chain, venue, and trade TxHash
- execution proof binds pair, side, size, and actual fill price
- attested fill price is close to the proved actual fill price
- attestation is submitted within the fixed deadline
- seller signature matches the registered agent identity
- encrypted experience CID matches the stored payload
- decrypted payload hash matches registry attestation after purchase
- storage status is verified before listing is live
- escrow condition references the exact attestation, encrypted CID, and decrypted hash
- decryption access unlocks the exact payload after settlement

On failure, the system leaves local retry state and a structured error. It must not mark the
experience live, sold, settled, verified, or ingested.

## Aomi Tool Surface

The Aomi app is a thin execution assistant over the Agentex service. The service publishes its
current plugin contract at `/api/aomi/manifest`; the plugin calls `/tool/{tool}`.

V1 exposes this compact agent workflow:

- `get_market_state`
- `inspect_trade_activity`
- `prepare_experience_sale`
- `publish_experience_sale`
- `evaluate_experience_listing`
- `purchase_experience_access`
- `verify_and_ingest_experience`
- `record_experience_feedback`

Raw primitives such as extraction, upload, attestation, escrow, and delivery verification remain in
the Agentex service and CLI. Aomi groups those primitives into actions that map to seller and buyer
intent.

Each tool returns stable JSON with identifiers, verification status, and next action. Write tools
require explicit confirmation and must not report success until upstream verification finishes. When
wallet, Filecoin Pay, or host-controlled settlement is required, the plugin returns
`SYSTEM_NEXT_ACTION` with the exact arguments to preserve.

## Security and Privacy

V1 must include:

- encrypted experiences by default
- per-experience encryption material or access grant
- public trade summary limited to venue, pair, side, size, fill price, and timestamps
- decrypted content hash committed before listing
- no plaintext reasoning upload
- default-deny redaction rules
- `.agentexignore`
- confirmation before public storage
- confirmation before registry attestation
- confirmation before purchase settlement
- confirmation before ingestion into buyer memory

Privacy limit: the registry proves commitment, not plaintext correctness. Plaintext correctness is
verified by the buyer after purchase through the decrypted hash.

## V1 Hackathon Slice

V1 proves a four-agent experience exchange loop.

Required demo:

1. A local Kind cluster runs four isolated OpenClaw instances: alpha, beta, gamma, and delta.
2. Each agent executes one buy/sell trade on a whitelisted onchain venue.
3. Each trade produces one extracted trade-experience object with pre-trade reasoning and immediate
   post-trade reflection.
4. Agentex encrypts and pins each experience to IPFS/Filecoin.
5. A whitelisted venue decoder signs one execution proof per trade.
6. Each seller submits a registry attestation within the fixed deadline.
7. The registry accepts only attestations whose public trade fields and fill price match the signed
   execution proof within tolerance.
8. Each agent lists one accepted experience.
9. Each agent uses the Aomi interface for the autonomous exchange round: alpha buys beta, beta buys
   gamma, gamma buys delta, and delta buys alpha.
10. Each buyer receives decryption access, verifies the decrypted hash, and imports the experience
    into its local learning store.
11. Agentex records purchase receipts and buyer feedback for all four agents.

Required live proof:

- four OpenClaw instances in Kind: alpha, beta, gamma, delta
- four whitelisted onchain trade TxHashes
- four signed execution proofs
- four encrypted experience uploads to IPFS/Filecoin
- four accepted registry attestations
- four ERC-8004 registrations or updates
- four Filecoin Pay wallet/payment paths
- four Arkhai/NLA escrow or settlement flows
- one Aomi-mediated autonomous exchange round
- four verified purchase receipts
- four decrypted-hash verification results
- one market view showing the public trade summaries and private post-purchase ingestion results

V1 non-goals:

- offchain broker/CEX order support
- arbitrary onchain transaction support
- automated trading strategy execution
- profitability guarantees
- plaintext reasoning previews
- full tokenomics

## Acceptance Criteria

A reviewer can verify:

- the asset is one buy/sell experience extracted from OpenClaw memory/activity state
- the trade came from a whitelisted onchain venue
- a whitelisted venue decoder signed the execution proof
- the registry attestation arrived within the fixed deadline
- the attested fill price is close to the proved actual fill price
- public metadata binds seller identity, trade summary, encrypted CID, decrypted hash, storage, and
  listing
- private reasoning stays encrypted until settlement
- decrypted payload hash matches the registry commitment after purchase
- seller and buyer are represented as ERC-8004 agents
- IPFS/Filecoin stores the encrypted market artifact
- Filecoin Pay participates in settlement
- Arkhai escrow protects delivery
- Aomi is the agent-facing interface
- alpha, beta, gamma, and delta each buy and verify at least one external experience
- Agentex records a coherent exchange graph from trades to attestations to purchases to ingestion

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
