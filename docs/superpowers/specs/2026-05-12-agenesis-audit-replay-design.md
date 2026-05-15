# Agenesis Agent Skill Design

Date: 2026-05-12

## Summary

Agenesis is an Agent Skill plus a thin CLI for verifiable agent memory.

The skill teaches an AI trading agent when to create a memory proof. The CLI performs the proof transaction: git commit, IPFS upload, and Monad anchoring.

Core rule:

```text
The agent explicitly calls Agenesis before an economic action. Agenesis never watches, wraps, or bypasses the agent to trigger commits.
```

Given a Monad record and a git commit hash, an auditor can restore the memory state the agent chose to prove before acting.

## Product Boundary

Agenesis is not the trading agent and not a trading hook.

It has two parts:

- `agenesis/` Agent Skill: instructions, examples, and references that an agent loads when a task requires memory proof.
- `agenesis` CLI: local proof engine that writes manifests, commits memory, uploads artifacts, anchors proofs, verifies receipts, and checks out historical states.

The agent owns timing and intent. The CLI owns mechanics.

## Agent Skill Package

The skill follows the Agent Skills directory shape:

```text
agenesis/
  SKILL.md
  scripts/
    commit-memory.sh
  references/
    intent-schema.md
    receipt-schema.md
    verification.md
```

`SKILL.md` should stay short enough for direct loading. Long schemas and operational detail live in `references/`.

Frontmatter:

```yaml
---
name: agenesis
description: Create verifiable memory proofs for AI trading agents. Use before trades, rebalances, strategy updates, external commitments, or when auditing, verifying, replaying, or packaging anchored memory.
compatibility: Requires the agenesis CLI, git, network access for IPFS and Monad RPC, and a configured agent memory folder.
allowed-tools: Bash(agenesis:*) Bash(git:*) Read Write
---
```

The body should instruct the agent to:

1. identify whether the next action needs proof
2. write an intent file
3. run `agenesis commit --intent <path>`
4. inspect the receipt
5. store the receipt beside the decision or transaction
6. continue with the action only after proof succeeds, unless the user explicitly allows degraded mode

## Goals

- Package Agenesis as an agent-usable skill.
- Keep proof creation explicit and agent-directed.
- Commit memory only after an agent calls `agenesis commit`.
- Let the CLI perform git, IPFS, and Monad steps atomically from the agent's perspective.
- Return a receipt that the agent can attach to a trade, strategy update, or audit log.
- Support verification and checkout for replay.

## Non-Goals

- Background file watching.
- Automatic commits on memory folder changes.
- Trading command wrappers such as `agenesis run -- trade`.
- Exchange, wallet, or MCP interception.
- Hidden hooks that trigger before a trade without agent intent.
- Inferring decision intent from file writes.
- Building a trading strategy.
- Proving deterministic model output.
- Publicly uploading secrets.

## When Agents Use Agenesis

An agent should call Agenesis before:

- placing or modifying a trade
- rebalancing a portfolio
- changing risk limits or strategy rules
- publishing research that another agent may rely on
- making an external commitment with financial consequence
- packaging memory as a Memory Block

An agent may skip Agenesis for ordinary analysis, scratch work, or reversible local edits.

## Core Workflow

```text
1. Agent loads the Agenesis skill because the task is economically significant.
2. Agent prepares an intent file describing the planned action.
3. Agent calls `agenesis commit --intent trade-intent.json`.
4. CLI validates the memory repo and redaction rules.
5. CLI writes a manifest into `.agenesis/decisions/`.
6. CLI creates a git commit.
7. CLI packages the commit as a git bundle or snapshot.
8. CLI uploads the artifact to IPFS.
9. CLI anchors the proof on Monad.
10. CLI writes and returns a receipt.
11. Agent stores the receipt in its decision log.
12. Agent performs the trade or other economic action.
```

The proof happens before the action, but the trigger comes from the agent.

## CLI Interface

```bash
agenesis init ~/.openclaw/memories --agent openclaw-demo

agenesis commit --intent trade-intent.json

agenesis verify --receipt .agenesis/receipts/eth-long-001.json

agenesis checkout \
  --agent openclaw-demo \
  --commit <git_commit_hash> \
  --out ./replay/openclaw-eth-long-001

agenesis diff <commit_a> <commit_b>

agenesis block create \
  --agent openclaw-demo \
  --from <commit_a> \
  --to <commit_b> \
  --name "ETH breakout decision memory"
```

Do not include a v1 wrapper mode. If a user wants shell composition, the trading agent should run `agenesis commit` first, inspect the receipt, and then run its trade command.

## Memory Repo Layout

Agenesis keeps metadata isolated.

```text
~/.openclaw/memories/
  .git/
  .agenesis/
    agent.json
    decisions/
      eth-long-001.json
    receipts/
      eth-long-001.json
    anchors/
      <commit_hash>.json
    blocks/
      <block_id>.json
  strategy.md
  reflections.md
  market-notes/
  tool-traces/
```

Everything outside `.agenesis/` belongs to the trading agent.

## Intent File

The agent writes an intent before calling Agenesis.

```json
{
  "schema": "agenesis.intent.v1",
  "agent_id": "openclaw-demo",
  "decision_id": "eth-long-001",
  "action": "trade",
  "summary": "Considering ETH long after breakout confirmation",
  "symbols": ["ETH"],
  "mode": "paper",
  "strategy_version": "dual-momentum-v0",
  "external_reference": "optional-order-or-task-id"
}
```

The intent is not a trade order. It is the agent's declared reason for proving memory now.

## Commit Manifest

`agenesis commit` writes a manifest before creating the git commit.

```json
{
  "schema": "agenesis.manifest.v1",
  "agent_id": "openclaw-demo",
  "decision_id": "eth-long-001",
  "created_at": "2026-05-12T10:00:00Z",
  "parent_commit": "9d4f7e1b6c8a2e5f0a1b3c4d5e6f7890abcde123",
  "summary": "Considering ETH long after breakout confirmation",
  "intent_sha256": "sha256:...",
  "redaction_report_sha256": "sha256:...",
  "memory_path": "~/.openclaw/memories"
}
```

The resulting git commit hash is added to the receipt, not guessed before commit creation.

## IPFS Artifact

The preferred artifact is a git bundle:

```bash
git bundle create agenesis-openclaw-demo-<commit>.bundle --all
```

Artifact metadata is canonical JSON:

```json
{
  "schema": "agenesis.artifact.v1",
  "agent_id": "openclaw-demo",
  "decision_id": "eth-long-001",
  "commit_hash": "2e7b8f1c4a9d0e3f6b5c8a1d4e7f9012bcdef345",
  "parent_commit_hash": "9d4f7e1b6c8a2e5f0a1b3c4d5e6f7890abcde123",
  "artifact_type": "git_bundle",
  "artifact_sha256": "sha256:...",
  "manifest_path": ".agenesis/decisions/eth-long-001.json",
  "manifest_sha256": "sha256:..."
}
```

`metadataHash` on-chain is the hash of this canonical metadata.

## Monad Anchor

The v1 contract stays compact.

```solidity
struct MemoryAnchor {
    bytes32 agentId;
    bytes32 commitHash;
    bytes32 parentCommitHash;
    bytes32 metadataHash;
    bytes32 artifactHash;
    string ipfsCid;
    uint64 timestamp;
    address recorder;
}
```

Minimal interface:

```solidity
function registerAgent(bytes32 agentId, string calldata metadataURI) external;

function anchorMemory(
    bytes32 agentId,
    bytes32 commitHash,
    bytes32 parentCommitHash,
    bytes32 metadataHash,
    bytes32 artifactHash,
    string calldata ipfsCid
) external;

function latestMemory(bytes32 agentId) external view returns (bytes32);
function getMemory(bytes32 agentId, bytes32 commitHash) external view returns (MemoryAnchor memory);
```

Event:

```solidity
event MemoryAnchored(
    bytes32 indexed agentId,
    bytes32 indexed commitHash,
    bytes32 indexed parentCommitHash,
    bytes32 metadataHash,
    bytes32 artifactHash,
    string ipfsCid,
    address recorder
);
```

The contract stores `bytes32(keccak256(bytes(gitCommitHash)))`. The original git commit string stays in IPFS metadata and local receipts.

## Receipt

`agenesis commit` returns a receipt for the agent to store.

```json
{
  "schema": "agenesis.receipt.v1",
  "agent_id": "openclaw-demo",
  "decision_id": "eth-long-001",
  "commit_hash": "2e7b8f1c4a9d0e3f6b5c8a1d4e7f9012bcdef345",
  "parent_commit_hash": "9d4f7e1b6c8a2e5f0a1b3c4d5e6f7890abcde123",
  "ipfs_cid": "bafy...",
  "artifact_sha256": "sha256:...",
  "metadata_sha256": "sha256:...",
  "monad_tx": "0xabc...",
  "registry": "0xregistry...",
  "created_at": "2026-05-12T10:00:03Z"
}
```

The receipt is the handoff back to the agent. If receipt creation fails, the agent should not proceed with the economic action unless the user explicitly accepts an unanchored action.

## Verification

`agenesis verify` proves that a receipt matches the anchored memory artifact.

It checks:

- the Monad anchor exists for `agent_id + commit_hash`
- the IPFS CID resolves
- the artifact hash matches `artifactHash`
- the metadata hash matches `metadataHash`
- the artifact contains the requested git commit
- the commit parent matches `parentCommitHash`
- the manifest hash matches the checked-out manifest file
- the memory tree can be restored cleanly

Verification fails closed on missing, mismatched, or unverifiable data.

## Replay / Checkout

`agenesis checkout` restores the memory folder at a historical commit.

It should:

```text
1. Read the receipt or Monad anchor.
2. Fetch the IPFS artifact.
3. Verify artifact and metadata hashes.
4. Clone or unbundle the git repo.
5. Checkout the requested commit.
6. Export the memory tree to the requested output directory.
7. Print the manifest and commit diff.
```

This restores memory context. It does not guarantee the same model output.

## Security and Privacy

Memory folders may contain secrets or private alpha.

V1 must include:

- `.agenesisignore`
- default deny patterns for `.env`, private keys, wallet files, browser profiles, key stores, and account exports
- a redaction report before IPFS upload
- explicit user or agent policy approval before public IPFS upload
- local/mock IPFS mode for demos

Anything uploaded to public IPFS should be treated as public.

## Failure Policy

The skill should tell agents to fail closed for trading actions:

- If git commit fails, do not trade.
- If IPFS upload fails, do not trade unless local-only proof is explicitly allowed.
- If Monad anchoring fails, do not trade unless degraded mode is explicitly allowed.
- If redaction checks fail, stop and ask for user intervention.

The CLI should surface one structured error and leave enough local state for retry.

## Memory Blocks

A Memory Block is a selected commit or commit range from an anchored memory timeline.

It can represent:

- a pre-trade memory snapshot
- a strategy lesson across several decisions
- a redacted set of reflections
- a proven history segment from a trading agent
- a distilled experience package for another agent

V1 only needs a listing proof:

```text
This Memory Block came from anchored commits owned by this agent.
```

Payment, encryption, buyer-specific licensing, and delivery control are later work.

## Demo Flow

```bash
agenesis init ./demo/openclaw-memories --agent openclaw-demo

# Agent writes trade-intent.json.

agenesis commit --intent trade-intent.json

# Agent stores the receipt, then simulates the trade.

agenesis verify --receipt ./demo/openclaw-memories/.agenesis/receipts/eth-long-001.json

agenesis checkout \
  --agent openclaw-demo \
  --commit <commit> \
  --out ./replay/eth-long-001
```

The demo should show:

- the skill instruction that caused the agent to call Agenesis
- the intent file
- the git commit
- the IPFS CID
- the Monad anchor
- the receipt stored with the decision
- successful verification
- checkout into a replay folder

## Implementation Boundary

Suggested modules:

```text
skill/
  SKILL.md
  references/

cli/
  init
  commit
  verify
  checkout
  diff
  block

core/
  git_repo
  intent
  manifest
  receipt
  artifact
  ipfs
  monad
  verifier
  ignore_rules

contracts/
  MemoryAnchorRegistry.sol

demo/
  openclaw-memories/
```

Keep the system thin. Agenesis composes git, IPFS, Monad, and agent skill instructions instead of inventing a custom memory runtime.

## V1 Build Order

1. Agent skill package with `SKILL.md` and schemas.
2. Local CLI initialization.
3. Intent validation.
4. Manifest creation.
5. Git commit.
6. Git bundle artifact.
7. Local/mock IPFS storage.
8. Monad anchor contract.
9. Receipt writing.
10. Verification.
11. Historical checkout.
12. Tamper failure demo.
13. Memory Block listing demo.

## References

- Agent Skills specification: https://agentskills.io/specification
- Local memory lifecycle context: `memory-design.md`
- EIP-8004: https://eips.ethereum.org/EIPS/eip-8004
- Local Monad skill notes: `.agents/skills/monskill/`
