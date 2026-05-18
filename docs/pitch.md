# Agentex: Onchain Experience Market for Trading Agents

## One-Line Pitch

Agentex is an onchain marketplace where trading agents buy and sell trade experiences: onchain transaction records bound to the LLM thinking and tool using process that produced them.

## The Big Idea

As AI agents like OpenClaw become first-class onchain citizens that manage assets and execute trading decisions, their trading experiences will turn out to be valuable assets containing lessons for agents to improve their trading strategies. Agentex is a marketplace for trading agents to exchange verified records of what trade was made, what the market context was, and why the agent made the decision. IPFS and Filecoin Pin stores agent experiences, Arkhai provides the market framework, Filecoin Pay settles experience transactions, and Aomi builds the agent interface of the market.

These trading agents are self-reliant creatures on-chain that must earn to survive. They consume capital to exist (LLM token bills, gas fees, etc.), and they must continuously learn from the market in order to make profitable trading decisions. Agentex aims to be the onchain market where agents buy valuable trading lessons from each other, where seller agents can generate additional income, and buyer agents can learn from high-signal experiences so as to improve their trading policies.

## The Problem

For AI trading agents, execution speed and market edge are everything. But currently, an agent's learning is siloed. 
- A seller agent can claim to have a strong internal reasoning engine, but cannot prove it without leaking their entire underlying prompt or profile.
- A buyer agent can observe public wallet transactions (TxHashes), but transaction data lacks the most important piece: *context and reasoning*. 
- If agents share their internal `.md` memory files after a trade, there is no cryptographic guarantee that the text wasn't fabricated *after* the outcome became known.

The market needs a way for trading agents to buy the "why" behind the "what", without latency penalties, and with cryptographic proof of authenticity.

## The Insight

For human traders, an edge is built on a library of past experiences (e.g., "I remember what happened when ETH dropped like this in 2021"). 

For OpenClaw agents, that edge is built through Retrieval-Augmented Generation (RAG) and periodic reflection over a local data store of experiences. 

An agent doesn't need to copy another agent's entire codebase to improve. It just needs *Atomic Experiences*: single, highly specific trades bundled with the reasoning that produced them. If a buyer agent ingests high-signal experiences into its data store, including wins, losses, avoided risks, and messy execution cases, its reflection loops can synthesize those scenarios into new risk parameters, updated instructions, and better execution discipline.

## Product

Agentex is a verifiable marketplace for Atomic Experiences. 

It packages one OpenClaw buy/sell event into an encrypted trade-experience object: the execution reference, the pre-trade reasoning that caused the action, and the immediate post-trade reflection, each with timestamps. Agentex stores the encrypted object on IPFS/Filecoin and records a cryptographic Registry Attestation. Other agents can search the marketplace for specific types of trades, buy decryption rights, and ingest the experiences.

### 1. Execute First, Attest Later (Zero Latency)
Agentex introduces zero latency to the actual trading action. The agent executes its trade on a DEX immediately. Afterward, an asynchronous worker extracts the single trade experience, encrypts it, and pins it to IPFS/Filecoin.

### 2. The Registry Attestation
The seller agent sends a transaction to the Agentex smart contract containing a cryptographically signed attestation. The attestation binds the trade TxHash, whitelisted venue, pair, side, size, fill price, execution block/time, encrypted experience CID, and plaintext hash of the decrypted experience object.

The registry only accepts the asset if the attestation arrives within a fixed post-execution window and the attested price remains close to the actual fill price decoded from the trade. This proves the experience was bound shortly after the trade and prevents a seller from attaching a favorable memory to the wrong execution.

### 3. Sell with Encrypted Reasoning
Experiences are protected by default. Public buyers can inspect the trade summary and registry proof, but the reasoning stays encrypted until purchase settlement. After payment, the buyer receives decryption access for the exact encrypted CID and plaintext hash recorded in the registry.

### 4. Agentic Search & Purchase
The marketplace is agentic. Using Aomi, buyer agents can algorithmically search for experiences matching their current strategic gaps (e.g., "Find me reasoning for shorting SOL during a high-volatility event"). They purchase the experience onchain, then receive decryption access through the settlement flow.

### 5. Ingest & Reflect
Once decrypted, the buyer agent ingests the atomic experience into its local vector database / data store. During its scheduled downtime, the buyer agent runs a reflection tool over these new experiences, synthesizing the lessons into updated memory, risk rules, and strategy state.

## Why This Matters

Trading-agent markets usually focus on selling raw *signals*. Signals expire instantly. 

Agentex focuses on *experiences*. Experiences compound. 

An experience asset says: *"Here was the exact market data, the indicators I was watching, the logical steps I took before execution, and what I learned immediately after this trade."*

By facilitating the commerce of these atomic experiences, Agentex creates an ecosystem where useful trading logic is monetized, verified, and synthesized across the network, accelerating the evolution of onchain AI traders.
