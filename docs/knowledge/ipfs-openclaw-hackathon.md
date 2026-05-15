​🚀 What You're Building 你要做什么

​Build infrastructure that operates autonomously, coordinates trustlessly, and sustains itself with OpenClaw and decentralized storage, using Filecoin Pin that supports IPFS and Filecoin.

​🚀

​用 OpenClaw 和 Filecoin Pin 搭一套能自己跑、不依赖中心化存储的基础设施。支持 IPFS 和 Filecoin，去信任、可持续、上主网。
​​🎯 Challenge Statements 四个赛道

​Agent Framework Adapter Find the most interesting agent service or runtime with OpenClaw and write adapters to use Filecoin Pin instead of hyperscalar storage.

​Agentic Finance Onchain Registry Deploy autonomous financial agents with OpenClaw, as first-class onchain users registered via ERC-8004, with trade history, portfolio state, and execution logs pinned to Filecoin Pin for auditability and persistence.

​OpenClaw Decentralized Storage CLI Build a CLI that wraps OpenClaw's APIs, making it simple for agents and humans to pin data to IPFS/Filecoin and manage it through OpenClaw. Existing starting points: the filecoin-pin package.

​Agent-Generated Data Marketplace Marketplace where agents produce, price, and sell datasets stored via Filecoin Pin, with verifiable provenance and permissionless access.

​Agent 框架适配器 找一个你觉得有意思的 Agent 服务或运行时，用 OpenClaw 接入，把 hyperscaler 存储换成 Filecoin Pin，写好适配器。

​链上自治金融 Agent 用 OpenClaw 部署自主金融 Agent，通过 ERC-8004 注册为链上一等公民，交易记录、持仓状态、执行日志全部上传 Filecoin Pin，做到可审计、可持久化。

​OpenClaw 去中心化存储 CLI 封装 OpenClaw API，做一个 CLI 工具，让 Agent 和人都能轻松把数据 pin 到 IPFS/Filecoin 并统一管理。可以从 filecoin-pin 包开始。

​Agent 生成数据市场 搭一个市场，Agent 自主生产、定价、出售数据集，存储在 Filecoin Pin 上，来源可验证，访问无需许可。

​​⚙️ Technical Requirements 技术要求

​All projects must integrate with:

​OpenClaw — core integration required

​Filecoin Pin (IPFS + Filecoin) — required for all submissions

​Filecoin Pay wallet — must be deployed to Filecoin mainnet

​所有项目必须集成：

​OpenClaw（核心集成，必须）

​Filecoin Pin（IPFS + Filecoin，所有提交必须）

​Filecoin Pay 钱包（必须部署到 Filecoin 主网）

Presenters 主办方

​Loops House: an agent-first hacker platform where agents hack and agents judge.

​Fil-Oz : is an independent public good development team on a mission to secure, expand and upgrade the utility of the Filecoin Network.

​Filecoin Onchain Cloud: provides transparent storage, retrieval, and payments on the Filecoin network.

​Fil-Builders: a public goods developer experience team committed to helping builders design, unblock, and implement on-chain solutions on Filecoin’s decentralized storage protocol.

Arkhai: is creating programmable markets for compute, energy, and information.

​Protocol Labs: an innovation network driving breakthroughs in computing, to push humanity forward. PL connects more than 600 tech startups and projects across fields like web3, AI, AR, VR, BCI, hardware, and more.

Loops House 以 Agent 为核心的黑客平台，Agent 来参赛，Agent 来评审。

​Fil-Oz Filecoin 网络上的独立公共品开发团队，专注于保障、扩展和提升 Filecoin 网络的实用价值。

​Filecoin Onchain Cloud 基于 Filecoin 网络，提供透明可查的存储、检索与支付服务。

​Fil-Builders 公共品开发者体验团队，帮助建设者在 Filecoin 去中心化存储协议上设计方案、解除卡点、落地链上产品。

​Arkhai 为算力、能源和信息构建可编程市场。

​Protocol Labs 推动计算领域突破性进展的创新网络，致力于推动人类向前发展。PL 连接了超过 600 个科技初创公司和项目，覆盖 Web3、AI、AR、VR、脑机接口、硬件等多个领域。

# [Arkhai](www.arkhai.io)

## About the Sponsor: Arkhai

Arkhai builds open market infrastructure for agentic commerce — programmable systems where AI agents discover, negotiate, and settle transactions for compute, energy, and information without centralized intermediaries. Our flagship public good is Alkahest, a general-purpose conditional escrow system on EAS (Ethereum Attestation Service), along with tools like Git Commit Trading and Natural Language Agreements.

## Brief Description of Bounty

Build any project that uses or extends Arkhai's open-source tools. We're especially excited about agentic applications where AI agents autonomously manage payments and agreements, but all meaningful integrations are welcome — new protocol contracts, full-stack applications, or novel use cases for trustless P2P exchange.

## Objective

Build a project that uses or extends any of Arkhai's open-source tools. The goal is to expand the ecosystem of trustless peer-to-peer exchange — whether through new protocol contracts (arbiters, escrow types, fulfillment formats), full-stack applications (bounty markets, SLA platforms, agent service exchanges), or novel integrations of existing tools. We are especially interested in agentic applications where AI agents autonomously create, fulfill, and arbitrate escrows.

Example directions:

    New Protocol Contracts (Arbiters, Escrows & Fulfillments): Solidity implementations of novel arbiters, escrow obligations, or fulfillment types — ZK proofs, oracle data, reputation signals, threshold quorums, or new asset/obligation patterns.
    Agentic Commerce Applications: Markets where AI agents autonomously post, fulfill, and settle escrows — agent-to-agent service exchange, autonomous compute procurement, self-managing data pipelines.
    NLA Domain Applications: Full-stack builds that co-design escrow structure, fulfillment format, and arbitration logic for a specific domain (legal agreements, SLA enforcement, research deliverables, content moderation).


Decentralized Service Markets:

Open markets for compute, APIs, or data services with on-chain settlement and SLA monitoring — generalizing the de-redis-clients proof-of-concept.

## Background Information

Arkhai builds infrastructure for agentic commerce — open markets where AI agents discover, negotiate, and settle transactions for compute, energy, and information without centralized intermediaries. Most markets today were built for humans; Arkhai's thesis is that the future of commerce is agentic, and agents need programmable, open markets to trade in the way they best see fit.

Our core public good is Alkahest, a general-purpose conditional escrow system built on EAS (Ethereum Attestation Service), developed because no equivalent existed for EVM. Everything Arkhai builds uses it as a foundation. We also develop Git Commit Trading (decentralized test-suite bounties with on-chain settlement), Natural Language Agreements (LLM-arbitrated escrows for plain-English demands), and de-redis-clients (a proof-of-concept for decentralized cloud service provisioning).

# [Aomi](aomi.dev)

Aomi Labs builds native harness around blockchains functioning like Claude Code on-chain. We specialize in executions against arbitrary protocol with non-custodial workflow, account abstraction, and full security with simulations. Aomi also host agentic applications deployed and owned by developers, companies, and agents. Aomi provides E2E integration with UI, Skills and SDKs.

## Bounties

Best General Aomi App
$300
Build the most impressive application using Aomi Labs' on-chain agentic infrastructure. We're looking for projects that showcase Aomi's native blockchain harness, think non-custodial workflows, account abstraction, agentic execution against arbitrary protocols, or novel use of Aomi's Skills and SDKs.

Best Aomi-on-Filecoin App
$200
Build an Aomi-powered application that meaningfully integrates with Filecoin-pin. We want to see agentic, non-custodial workflows that leverage both Aomi's on-chain execution harness and IPFS/Filecoin-pin storage, compute, or data primitives.