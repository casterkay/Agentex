# Memexchange IPFS OpenClaw Hackathon Upgrade

## Summary

A live, agentic marketplace for OpenClaw thinking-framework genes.

Canonical demo path: OpenClaw MEMORY.md and AGENTS.md are packaged as a verifiable
encrypted gene, pinned with Filecoin Pin on mainnet, registered through ERC-8004 on Base
mainnet, scored from trade evidence, and sold through an Arkhai/NLA escrow operated by Aomi
agents. The live submission also deploys and uses a Filecoin Pay wallet on Filecoin mainnet.

Carry forward only the old audit/replay invariants that still support the marketplace:

- Agents or Aomi tools must intentionally create, list, buy, or fulfill genes; no background
  watcher, trading wrapper, hidden hook, or inferred intent.
- Trade intents, receipts, and decision logs are evidence for scoring, not the gene being sold.
- Every live gene or sale returns a compact receipt that binds the source commit, parent commit,
  file hashes, manifest CID, encrypted payload CID, Filecoin Pin proof fields, ERC-8004 identity,
  and escrow/delivery IDs.
- Verification fails closed on missing, mismatched, or unverifiable data. Upload, registration, or
  escrow failures leave local retry state and do not mark the gene live.

## Key Changes

- Extend Memexchange storage from local:<sha256> to Filecoin Pin mainnet:
    - Upload encrypted gene payload, public preview manifest, and score report.
    - Store root CID, dataset ID, piece CID/CommP, PDP status, and retrieval URLs in receipts.
    - Verify via Filecoin Pin dataset status before treating a gene as live.
- Add a gene pipeline:
    - Gene payload includes only MEMORY.md and AGENTS.md.
    - Trade intents, receipts, and decision logs are evidence inputs for scoring, not sold
      content.
    - Apply `.memexchangeignore` deny rules before packaging secrets, wallets, account exports,
      browser profiles, private keys, `.env`, and tool caches.
    - Include source commit, parent commit, manifest hash, and redaction report hash in the public
      manifest and receipt.
    - Encrypt payload with a per-gene key; publish plaintext preview and hashes only.
- Add ERC-8004 registration on Base mainnet:
    - Agent card is stored with Filecoin Pin.
    - Agent card references Aomi app endpoint, Memexchange verification endpoint, gene manifest
      CID, and supported trust mechanisms.
- Add Filecoin Pay mainnet wallet support:
    - Deploy or connect the seller agent's Filecoin Pay wallet on Filecoin mainnet.
    - Record wallet address, funding status, and payment asset in the demo runbook.
    - Use the Filecoin Pay wallet in the live sale/payment path, not only as setup evidence.
- Add Arkhai/NLA escrowed sale:
    - Buyer creates escrow with a natural-language demand requiring delivery of the decryption
      key for the exact gene CID/hash.
    - Seller fulfills by submitting a delivery proof and buyer-encrypted gene key.
    - Arkhai oracle/arbitration settles the payment.
- Build the Aomi app as the primary UI:
    - Seller agent: inspect profile, create gene, upload, score, register, list.
    - Buyer agent: inspect preview/score, create escrow, verify delivery, decrypt, validate, export
      to a review directory, and then merge only after diff review.
    - Aomi tools call a small Memexchange HTTP service instead of shelling directly from the UI.
    - Side-effect tools prepare or preview first, then require explicit confirmation before upload,
      registration, escrow creation, fulfillment, or merge.

## Interfaces

- CLI additions:
    - memexchange gene create --repo <openclaw_dir> --agent <id> --evidence <dir>
    - memexchange gene score --gene <manifest>
    - memexchange gene upload --gene <manifest> --filecoin-mainnet
    - memexchange gene verify --manifest <cid-or-path>
    - memexchange gene export --receipt <purchase.json> --out <review_dir>
    - memexchange market fulfill --listing <id> --buyer-key <pubkey>
- Aomi tool surface:
    - inspect_openclaw_profile
    - create_gene_asset
    - score_gene_asset
    - upload_gene_to_filecoin
    - register_erc8004_agent
    - create_gene_listing
    - inspect_gene_listing
    - create_gene_purchase
    - verify_gene_delivery
    - prepare_gene_breed
    - record_gene_breeding
- New schemas:
    - memexchange.gene_manifest.v1: selected file hashes, source commit, parent commit, manifest hash,
      redaction report hash, encrypted payload CID, preview CID, score CID, Filecoin proof metadata.
    - memexchange.gene_score.v1: deterministic metrics plus Aomi-generated valuation note.
    - memexchange.market_listing.v1: seller agent, gene manifest CID, price, escrow UID, delivery
      public-key requirement.
    - memexchange.purchase_receipt.v1: gene manifest CID, seller agent, buyer agent,
      Filecoin Pin proof fields, ERC-8004 identity, escrow UID, buyer key envelope hash,
      delivery proof hash, and verification status.
    - memexchange.breeding_receipt.v1: purchased gene, buyer pre-breed profile hash,
      resulting profile commit, resulting file hashes, and breeding report CID.

## 72-Hour Build Order

- Day 1: Filecoin Pin mainnet storage, encrypted gene packaging, score report, verification
  command.
- Day 2: ERC-8004 agent card registration, Filecoin Pay wallet setup, Arkhai/NLA escrow flow,
  buyer-key delivery proof.
- Day 3: Aomi app integration, live end-to-end demo polish, submission docs, pitch rewrite
  around the agentic marketplace.

## Test Plan
- Unit tests:
    - Gene packaging includes only the two agent profile files.
    - `.memexchangeignore` and default deny patterns exclude secrets before encryption.
    - Hash mismatch fails closed.
    - Source commit or parent commit mismatch fails closed.
    - Score formula is deterministic and does not depend on Aomi text.
    - Encrypted payload cannot be verified without the gene key.
    - Export writes a review directory and diff plan, not an automatic profile overwrite.
- Integration tests:
    - Filecoin Pin upload output is parsed into receipt fields.
    - Filecoin Pay wallet configuration is present before live marketplace flows run.
    - ERC-8004 token URI includes the pinned filename.
    - Arkhai/NLA create, fulfill, status, and collect wrappers preserve escrow IDs.
    - Aomi tool calls return compact JSON and require explicit confirmation for side effects.
- Live acceptance:
    - A judge can see one seller agent create a gene, one buyer agent purchase it, the
      gene decrypt after settlement, and the final files verify against Filecoin/receipt
      hashes.
    - The demo shows the Filecoin Pay mainnet wallet used by the sale flow.

## Assumptions

- Live-only demo, 72-hour scope.
- Required funded wallets/API keys are available: Filecoin mainnet FIL/USDFC, Base mainnet ETH,
  Arkhai/NLA token/RPC, Aomi API key, and LLM key for NLA oracle.
- Aomi is the agentic marketplace layer, not just a chat wrapper.
- The public gene payload is encrypted; only preview, hashes, score, and provenance are public.
- Monad remains optional post-hackathon infrastructure, not a required judged dependency.
- References used: Aomi Agentic Application (https://aomi.dev/docs/agentic-application), Aomi
  Overview (https://aomi.dev/docs/build/overview), Filecoin Pin FAQ
  (https://docs.filecoin.io/builder-cookbook/filecoin-pin/faq), Filecoin Pin for ERC-8004 Agents
  (https://docs.filecoin.io/builder-cookbook/filecoin-pin/erc-8004-agent-registration), ERC-8004
  (https://eips.ethereum.org/EIPS/eip-8004), Arkhai (https://www.arkhai.io/), Arkhai NLA
  (https://github.com/arkhai-io/natural-language-agreements).
