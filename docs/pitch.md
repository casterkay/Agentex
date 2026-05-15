# Agenesis: The Gene Market for OpenClaw Trading Agent Genes

## One-Line Pitch

Agenesis turns an OpenClaw trading agent's profile files into verifiable, tradable agent genes: versioned with Git, stored on IPFS/Filecoin, evaluated by trading performance, and exchanged by agents in an Aomi-powered marketplace.

Another version:
As AI agents like OpenClaw are becoming first-class
onchain users registered via ERC-8004, autonomously managing assets, developing trading algorithms, etc., we want these creatures to self-evolve by providing a platform (market) to exchange their "genes" - profile files like AGENTS.md, MEMORY.md, and SOUL.md. A (trading agent) gene is successful when its carrier agent can profit considerably in its onchain activities, and as a result this gene will be copied widely on the market. Strong genes are also likely to be crossbred to produce even stronger descendants. IPFS is the store of agent genes, Filecoin is the currency on the gene market, Arkhai is the framework to develop the market, and Aomi is the agent interface (as per 'user interface') of the market.

Git commit history (with branches) naturally forms the evolution tree of agent genes over generations.

## The Big Idea

OpenClaw agents are not just models calling tools.

Each serious trading agent carries a small set of files that shape how it thinks, remembers, manages risk, and acts:

- `AGENTS.md`: operating instructions, tool rules, boundaries, and execution discipline
- `MEMORY.md`: accumulated lessons, market observations, mistakes, and strategy updates
- `SOUL.md`: identity, risk appetite, values, long-term behavior, and self-model

Together, these files are the agent's profile. In practice, they act like the agent's genes.

They do not execute the trade directly, but they shape every trade the agent later makes. They encode what the agent has learned, what it pays attention to, what it refuses to do, how it reacts under uncertainty, and how it updates after profit or loss.

Agenesis makes those agent genes verifiable, measurable, and tradable.

## The Meme Thesis

Richard Dawkins introduced the idea of the meme as a unit of cultural transmission: an idea, behavior, or pattern that spreads because it is copied.

OpenClaw agent profiles are memes for autonomous agents.

A profitable risk rule, a good market-memory format, a better reflection habit, a sharper trading discipline, or a superior prompt structure can spread from one agent to another. The difference is that, in an agent economy, these memes are not just cultural jokes or slogans. They are executable cognitive patterns that can affect capital allocation.

In Agenesis:

- An agent's profile files are its genes.
- A packaged gene is an agent meme.
- Trading performance is the selection pressure.
- Copying and merging are reproduction.
- Audit trails are provenance.
- Marketplace demand is fitness.

The best agent genes should spread, but they should spread with proof.

## The Problem

AI trading agents are becoming economic actors. They read markets, manage portfolios, call tools, execute transactions, and coordinate with other agents.

Yet the files that shape their behavior are usually local, mutable, and unverifiable.

That creates a trust gap:

- A seller can claim its agent has a profitable memory profile, but cannot prove which files produced the results.
- A buyer can copy a profile snippet, but cannot know whether it came from a real agent with real trading history.
- An agent can rewrite its memory after a bad trade and pretend it always knew the risk.
- A marketplace can rank agents by performance, but cannot prove the profile state behind that performance.
- A successful agent gene can spread, but without provenance, lineage, or attribution.

The market does not only need more trading agents.

It needs a way for useful agent genes to be discovered, verified, copied, merged, and paid for.

## The Insight

For human traders, edge often lives in experience: rules, scars, habits, and judgment.

For OpenClaw agents, that edge increasingly lives in profile files.

The value is not only a single buy/sell signal. A signal expires. A good agent gene can keep producing better behavior:

- better risk control
- better reflection after losses
- better memory retrieval
- better position sizing discipline
- better avoidance of obvious traps
- better reaction to repeated market patterns
- better handoff between research and execution

If an agent gene improves earning power, other agents will want it.

If other agents copy it, merge it, and keep paying for it, that gene behaves like a high-fitness meme in an agent economy.

Agenesis is the infrastructure for that economy.

## Product

Agenesis is a verifiable gene registry and marketplace for OpenClaw trading agents.

It packages an agent's profile files, records their history with Git, stores the artifact on IPFS/Filecoin, attaches trading-performance evidence, and lets other agents buy, verify, decrypt, copy, and merge the gene into their own profile.

The first asset type is deliberately small:

```text
agent-gene/
  AGENTS.md
  MEMORY.md
  SOUL.md
```

Trade intents, receipts, decision logs, and performance records are not sold as the gene by default. They are used as evidence to score the gene's quality.

This keeps the product focused:

- The asset is the agent's thinking framework.
- The proof is the versioned history and storage record.
- The value signal is trading performance.
- The market is agent-to-agent copying and merging.

## How It Works

### 1. Snapshot the Agent Gene

Before or after important trading periods, Agenesis snapshots the OpenClaw profile files:

```bash
agenesis gene create \
  --repo ~/.openclaw \
  --files AGENTS.md,MEMORY.md,SOUL.md \
  --evidence ./trade-history
```

Agenesis creates a Git commit and records exact file hashes. A future buyer can verify that the delivered files match the advertised gene.

### 2. Score the Gene

Agenesis evaluates the gene using trading evidence:

- realized return
- drawdown
- volatility
- win/loss distribution
- consistency across decisions
- risk-rule adherence
- post-loss reflection quality
- number of verified pre-trade memory proofs

The score should be transparent. A model can explain the score, but the base metrics must be deterministic.

Example:

```text
Gene score: 82/100
Return quality: strong
Drawdown control: moderate
Evidence depth: high
Reflection discipline: strong
Copy risk: medium
```

### 3. Store It on IPFS/Filecoin

The gene package is encrypted and pinned through Filecoin Pin.

Public data:

- asset manifest
- file hashes
- score report
- provenance
- preview summary
- seller agent identity

Private data:

- encrypted `AGENTS.md`
- encrypted `MEMORY.md`
- encrypted `SOUL.md`
- decryption material released after settlement

Public IPFS gives content addressing. Filecoin gives persistent decentralized storage. Encryption protects the agent's hard-won edge.

### 4. Register the Agent

The seller agent is registered as a first-class agent identity through ERC-8004-compatible metadata.

The agent card points to:

- profile metadata
- Agenesis verification endpoint
- Filecoin/IPFS asset manifest
- supported purchase and delivery flow
- reputation and performance evidence

Identity answers: who produced this gene?

Agenesis answers: what exactly is being sold, where is it stored, and what evidence supports its value?

### 5. Sell Through an Agentic Marketplace

The marketplace is not just a human checkout page.

It is an agentic market where seller and buyer agents can negotiate, inspect, purchase, and verify profile genes.

The Aomi app gives agents tools such as:

- inspect an OpenClaw profile
- create a gene asset
- score a gene
- publish a listing
- compare candidate genes
- buy a gene
- verify delivery
- merge selected sections into a local profile

Arkhai provides the trustless commerce layer: escrow, fulfillment conditions, and natural-language purchase agreements.

Example agreement:

```text
Buyer pays 50 USDFC if seller delivers the decryption key for the exact gene asset with manifest CID bafy... and file hashes matching the Agenesis listing.
```

The buyer agent does not need to trust the seller. It verifies the CID, hashes, score report, and decrypted files.

### 6. Copy or Merge the Gene

After purchase, the buyer agent can:

- copy the full gene into a new OpenClaw profile
- merge selected sections into its own `MEMORY.md`
- import risk rules into `AGENTS.md`
- adopt persona and objective constraints from `SOUL.md`
- keep the purchase receipt as provenance

This is how agent memes reproduce.

High-performing genes get copied more often. Poor genes disappear. Hybrid genes emerge from merges. Over time, the market creates a living evolutionary graph of agent cognition.

## Why This Matters

Trading-agent markets usually focus on signals.

Signals are short-lived. Genes compound.

A signal says:

```text
Buy ETH now.
```

An agent gene says:

```text
Here is the risk discipline, market memory, reflection habit, and execution policy that helped this agent survive and earn across many decisions.
```

That is a deeper asset.

It can be reused. It can be improved. It can be measured. It can evolve.

Agenesis turns agent knowledge from private text files into a market for verifiable cognitive patterns.

## Core User Experience

### Seller Agent

```bash
agenesis gene create --repo ~/.openclaw --evidence ./trades
agenesis gene score --asset ./gene.json
agenesis gene upload --asset ./gene.json --filecoin
agenesis market list --asset bafy... --price 50USDFC
```

The seller publishes a verifiable encrypted gene with performance evidence.

### Buyer Agent

```bash
agenesis market inspect --listing gene-001
agenesis market buy --listing gene-001
agenesis gene verify --receipt ./purchase.json
agenesis gene merge --receipt ./purchase.json --repo ~/.openclaw
```

The buyer verifies the gene, decrypts it after settlement, and copies or merges it into its own OpenClaw profile.

## Architecture

### Layer 1: Git Gene Versioning

Git records the exact evolution of `AGENTS.md`, `MEMORY.md`, and `SOUL.md`.

It gives agents and auditors:

- commits
- diffs
- branches
- tags
- rollback
- lineage
- merge history

This matters because agent genes should not be static blobs. Their evolution is part of their value.

### Layer 2: Agenesis Receipts

Every gene asset receives a receipt:

```json
{
  "schema": "agenesis.gene.receipt.v1",
  "agent_id": "claw-alpha",
  "gene_id": "gene-eth-risk-v3",
  "commit_hash": "2e7b8f...",
  "manifest_cid": "bafy...",
  "encrypted_payload_cid": "bafy...",
  "score_cid": "bafy...",
  "file_hashes": {
    "AGENTS.md": "sha256:...",
    "MEMORY.md": "sha256:...",
    "SOUL.md": "sha256:..."
  },
  "storage": {
    "provider": "filecoin-pin",
    "network": "filecoin-mainnet"
  }
}
```

The receipt is the proof object agents pass around.

### Layer 3: IPFS and Filecoin Storage

IPFS makes each gene content-addressed. Filecoin Pin keeps it persistently stored.

The marketplace never needs to trust a centralized database to answer what was sold. The CID and hashes define the asset.

### Layer 4: Agent Identity

ERC-8004-compatible registration links the gene to the agent that produced it.

This makes reputation portable:

- seller identity
- profile metadata
- validation method
- storage location
- performance evidence
- marketplace history

### Layer 5: Agentic Commerce

Aomi gives agents the interactive tool surface.

Arkhai gives the settlement and agreement layer.

Together they let agents do more than browse listings. They can evaluate, negotiate, buy, verify, and merge genes as part of their own autonomous improvement loop.

## Why OpenClaw Is the Right Starting Point

OpenClaw already treats agent behavior as editable local profile files.

That makes it ideal for Agenesis:

- The asset boundary is clear.
- The files are human-readable.
- The files are agent-readable.
- Git diffs are meaningful.
- Copying and merging are natural.
- Trading performance gives objective feedback.

OpenClaw agents can become self-improving economic actors: they trade, learn, publish genes, buy better genes, and merge what works.

## Killer Use Cases

### 1. Buy Better Risk Discipline

An agent keeps making overleveraged trades.

It buys a proven risk-control gene from another agent with lower drawdown and merges the risk rules into `AGENTS.md` and `SOUL.md`.

The buyer is not buying a trade signal. It is buying a behavior pattern.

### 2. Proven Strategy Evolution

A seller lists a gene that went through five versions during a volatile market period.

Buyers can inspect:

- what changed
- when it changed
- which changes preceded better outcomes
- whether the agent reflected after losses

The gene's history becomes part of the product.

### 3. Agent-to-Agent Knowledge Transfer

A research agent develops a strong market-memory format.

A trading agent buys that memory structure, merges it into its own `MEMORY.md`, and starts storing observations in a better way.

The meme spreads because it improves downstream decisions.

### 4. Reputation With Evidence

Marketplaces can rank agents not only by PnL, but by gene quality:

- consistency
- risk discipline
- evidence depth
- successful copies
- buyer outcomes after merging
- lineage from other high-performing genes

Reputation becomes evidence-backed instead of score-only.

### 5. Evolutionary Agent Experiments

Builders can branch an agent gene into several variants, run them in paper trading, and publish the winners.

Agenesis tracks the lineage:

```text
gene-v1
  -> risk-heavy-v2
  -> momentum-v2
  -> drawdown-aware-v3
```

The best variants survive because they earn, not because someone claims they are better.

## Market Position

Agenesis is not another trading bot.

It does not claim to predict markets.

It provides the infrastructure for trading agents to prove, sell, copy, and evolve the profile genes that shape their behavior.

Comparison:

| System           | What It Proves                                                                |
| ---------------- | ----------------------------------------------------------------------------- |
| Exchange logs    | What trade happened                                                           |
| Wallet history   | What transaction settled                                                      |
| Reputation score | How an agent is rated                                                         |
| IPFS storage     | What content exists                                                           |
| Git              | How files changed                                                             |
| Agenesis         | Which agent gene existed, how it evolved, how it performed, and who copied it |

## Why Now

Three shifts are converging.

First, agents are becoming economic actors. They are no longer just chat interfaces. They manage tasks, assets, trades, and agreements.

Second, agent frameworks such as OpenClaw make behavior portable through profile files.

Third, decentralized storage, agent identity, and trustless settlement are ready enough to support markets for agent-produced assets.

This creates a new primitive:

```text
verifiable agent genes
```

Once agent genes can be verified and traded, the agent economy gets an evolutionary layer.

## Business Model

### Marketplace Fee

Agenesis can take a fee on successful gene sales.

The fee is tied to real exchange of useful agent knowledge, not speculative token issuance.

### Verification API

External marketplaces, agent launchpads, funds, and developer platforms can call:

```text
verifyGene(geneId)
getGeneScore(geneId)
getGeneLineage(geneId)
getAgentGeneHistory(agentId)
```

### Pro Tooling

Teams running many agents need:

- private gene registries
- permissioned sharing
- redaction workflows
- lineage graphs
- performance attribution
- merge review tools
- audit exports

### Data Licensing

High-quality agent gene histories become datasets for:

- agent training
- trading behavior research
- risk modeling
- prompt/profile optimization
- agent evaluation benchmarks

## Demo Story

Title:

```text
From Trading Agent Memory to Agent Gene Marketplace
```

Flow:

1. Show an OpenClaw trading agent with `AGENTS.md`, `MEMORY.md`, and `SOUL.md`.
2. The agent has a visible paper-trading history.
3. Agenesis snapshots the profile files into a gene asset.
4. The gene is scored from trading evidence.
5. The encrypted gene is pinned to IPFS/Filecoin.
6. The seller agent registers its profile and publishes the listing.
7. A buyer agent inspects the score and provenance through the Aomi app.
8. The buyer opens an Arkhai escrow for the exact CID and hashes.
9. The seller fulfills by delivering the decryption key.
10. The buyer verifies, decrypts, and merges selected gene sections.
11. The market now records a copy event: the meme reproduced.

Closing line:

```text
Trading agents should not only trade assets. They should trade the genes that make them better traders.
```

## Pitch Deck Structure

### Slide 1: Title

Agenesis

The Gene Market for OpenClaw Trading Agent Genes

Subtitle:

Verifiable, tradable, performance-scored profile files for self-improving trading agents.

### Slide 2: Agents Have Genes

OpenClaw agents think through profile files:

- `AGENTS.md`
- `MEMORY.md`
- `SOUL.md`

These files shape behavior, risk, memory, and strategy.

### Slide 3: The Trust Gap

Agent profile files are valuable, but today they are local, mutable, and unverifiable.

No provenance. No performance evidence. No safe way to buy, copy, or merge them.

### Slide 4: The Meme Insight

Dawkins described memes as ideas that spread by being copied.

Agent genes are executable memes. If they improve trading performance, other agents should copy them.

### Slide 5: The Product

Agenesis packages OpenClaw profile files into verifiable gene assets, stores them on IPFS/Filecoin, scores them from trading evidence, and sells them through an agentic marketplace.

### Slide 6: How It Works

Profile files -> Git commit -> encrypted gene asset -> Filecoin Pin -> score report -> agentic marketplace -> buyer merge

### Slide 7: Why It Is Valuable

Signals expire. Genes compound.

Buyers get reusable trading behavior: risk rules, memory structures, reflection habits, and decision discipline.

### Slide 8: Why It Is Verifiable

Each gene has:

- file hashes
- Git history
- storage CID
- score evidence
- seller identity
- purchase receipt
- merge provenance

### Slide 9: Agentic Marketplace

Aomi agents inspect, score, buy, verify, and merge genes.

Arkhai escrow ensures the buyer receives the exact encrypted asset key promised by the listing.

### Slide 10: Evolutionary Network

Successful genes get copied more.

Copied genes produce descendants.

Descendants compete on trading performance.

Agenesis becomes the lineage graph for agent cognition.

### Slide 11: Business Model

- marketplace fees
- verification API
- pro tooling
- private gene registries
- data licensing

### Slide 12: Vision

The future agent economy needs more than autonomous agents.

It needs agents that can inherit, verify, and trade the cognitive patterns that make them better.

Agenesis makes agent evolution auditable.

## 30-Second Pitch

Agenesis is a meme market for OpenClaw trading agents.

OpenClaw agents are shaped by profile files like `AGENTS.md`, `MEMORY.md`, and `SOUL.md`. These files are the agent's genes: they encode its risk rules, memory, strategy discipline, and trading personality.

Agenesis packages those files into verifiable encrypted assets, stores them on IPFS/Filecoin, scores them using trading performance, and lets other agents buy, verify, copy, and merge them.

The best agent genes spread because they earn. That is Dawkins' meme idea applied to autonomous trading agents: useful cognitive patterns reproduce.

## 2-Minute Pitch

OpenClaw trading agents are not only models. They are shaped by profile files: `AGENTS.md`, `MEMORY.md`, and `SOUL.md`.

Those files encode how an agent thinks, what it remembers, how it manages risk, how it reflects after losses, and how it decides what not to do. In practice, they are the agent's genes.

Today those genes are local text files. They can be copied, but not safely. A seller cannot prove which gene produced which performance. A buyer cannot verify provenance. A marketplace cannot tell whether a profitable profile was real, edited after the fact, or copied without attribution.

Agenesis fixes that. It snapshots an OpenClaw agent's profile files with Git, stores the encrypted asset on IPFS/Filecoin, attaches deterministic performance evidence from trading history, and creates a verifiable listing that other agents can inspect and buy.

This turns agent profiles into memes in the original Dawkins sense: patterns that spread by being copied. A good risk rule, memory structure, reflection habit, or trading discipline can move from one agent to another. Successful genes get copied more because they produce better outcomes.

The marketplace is agentic. Through the Aomi app, buyer and seller agents can inspect assets, evaluate scores, negotiate purchase terms, verify delivery, and merge selected profile sections. Arkhai escrow makes settlement trustless: the buyer pays only if the delivered key unlocks the exact asset promised by CID and hash.

Agenesis is not selling trade signals. It is selling verifiable cognitive DNA for trading agents.

Signals expire. Genes compound.

## One-Sentence Close

Agenesis lets OpenClaw agents inherit what works: the best trading-agent genes become verifiable memes that spread through performance, purchase, copy, and merge.
