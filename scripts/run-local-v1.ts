import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createExecutionProof,
  createExperienceListing,
  createExperiencePurchase,
  createTradeExperienceAsset,
  planExchangeRound,
  prepareExperienceIngestion,
  prepareRegistryAttestation,
  recordExperienceFeedback,
  stableJson,
  submitRegistryAttestation,
  verifyExperienceDelivery,
  loadDotEnv,
} from "../src/index.js";

const agents = ["alpha", "beta", "gamma", "delta"];
await loadDotEnv();
const key = process.env.AGENTEX_EXPERIENCE_KEY ?? "local-demo-experience-key";
const registryAddress = "0x0000000000000000000000000000000000000001";

async function main(): Promise<void> {
  await seedDemoInputs();
  const round = planExchangeRound(agents);
  const experiences: unknown[] = [];
  const attestations: unknown[] = [];
  const listings: unknown[] = [];
  const purchases: unknown[] = [];
  const ingestions: unknown[] = [];

  const byAgent = new Map<string, { manifestPath: string; listingPath: string; attestationId: string }>();
  for (const agent of agents) {
    const root = path.join("demo", "agents", agent);
    const asset = await createTradeExperienceAsset({
      activityPath: path.join(root, "activity", "trade.json"),
      memoryPath: path.join(root, ".openclaw", "memory", "2026-05-18.md"),
      sellerAgent: { agentRegistry: "eip155:8453:0xregistry", agentId: String(agents.indexOf(agent) + 1) },
      key,
      outDir: path.join("demo", "local-output", agent),
    });
    const proof = createExecutionProof({ trade: asset.experience, decoderId: "local-decoder", decoderKey: "decoder-key" });
    const prepared = prepareRegistryAttestation({
      manifest: asset.manifest,
      executionProof: proof,
      sellerNonce: `${agent}-nonce`,
      attestationDeadline: "2026-05-18T10:05:00.000Z",
      registryAddress,
    });
    const accepted = await submitRegistryAttestation({ attestation: prepared.attestation, executionProof: proof });
    const listing = await createExperienceListing({
      manifestPath: asset.paths.manifest,
      attestationId: accepted.attestation_id,
      priceAmount: "5",
      paymentAsset: "USDFC",
    });
    experiences.push({ agent, experience_id: asset.experience.experience_id, manifest_path: asset.paths.manifest });
    attestations.push({ agent, attestation_id: accepted.attestation_id });
    listings.push({ agent, listing_id: listing.listing.listing_id, listing_path: listing.path });
    byAgent.set(agent, { manifestPath: asset.paths.manifest, listingPath: listing.path, attestationId: accepted.attestation_id });
  }

  for (const leg of round) {
    const seller = byAgent.get(leg.seller);
    if (!seller) throw new Error(`missing seller listing: ${leg.seller}`);
    const buyerId = String(agents.indexOf(leg.buyer) + 1);
    const purchase = await createExperiencePurchase({
      listingPath: seller.listingPath,
      buyerAgent: { agentRegistry: "eip155:8453:0xregistry", agentId: buyerId },
      filecoinPayReference: `filecoin-pay:${leg.buyer}-${leg.seller}`,
      escrowId: `arkhai:escrow:${leg.buyer}-${leg.seller}`,
      keyEnvelope: key,
      deliveryProof: `seller ${leg.seller} delivered key to buyer ${leg.buyer}`,
    });
    const verified = await verifyExperienceDelivery({ purchaseReceiptPath: purchase.path, key });
    const ingestion = await prepareExperienceIngestion({
      purchaseReceiptPath: purchase.path,
      buyerRepo: path.join("demo", "agents", leg.buyer),
      key,
      confirm: true,
    });
    await recordExperienceFeedback({ purchaseReceiptPath: purchase.path, score: 90, note: `Local feedback from ${leg.buyer}` });
    purchases.push({ buyer: leg.buyer, seller: leg.seller, purchase_id: verified.receipt.purchase_id, path: purchase.path });
    ingestions.push({ buyer: leg.buyer, seller: leg.seller, path: "path" in ingestion ? ingestion.path : "" });
  }

  const summary = {
    schema: "agentex.demo_summary.v1",
    mode: "local",
    agents,
    round,
    experiences,
    attestations,
    listings,
    purchases,
    ingestions,
  };
  await mkdir(path.join("demo", "local-output"), { recursive: true });
  await writeFile(path.join("demo", "local-output", "summary.json"), stableJson(summary));
  process.stdout.write(stableJson(summary));
}

async function seedDemoInputs(): Promise<void> {
  for (const [index, agent] of agents.entries()) {
    const root = path.join("demo", "agents", agent);
    await mkdir(path.join(root, ".openclaw", "memory"), { recursive: true });
    await mkdir(path.join(root, "activity"), { recursive: true });
    await writeFile(
      path.join(root, ".openclaw", "memory", "2026-05-18.md"),
      `${agent} local OpenClaw memory for one trade experience.\n`,
    );
    await writeFile(
      path.join(root, "activity", "trade.json"),
      stableJson({
        trades: [
          {
            chain_id: 8453,
            whitelisted_venue_id: "demo-venue-v1",
            trade_tx_hash: `0x${String(index + 1).repeat(64)}`,
            pair: index % 2 === 0 ? "ETH/USDC" : "SOL/USDC",
            side: index % 2 === 0 ? "buy" : "sell",
            size: `${index + 1}.00`,
            fill_price: `${3000 + index * 100}.00`,
            execution_block_number: 123456 + index,
            execution_timestamp: "2026-05-18T10:00:00.000Z",
            pre_trade_context_timestamp: "2026-05-18T09:59:30.000Z",
            pre_trade_market_context: `${agent} observed a local volatility setup.`,
            pre_trade_reasoning: `${agent} chose a bounded demo trade with clear invalidation.`,
            post_trade_reflection_timestamp: "2026-05-18T10:01:00.000Z",
            post_trade_reflection: `${agent} recorded execution quality and next risk adjustment.`,
          },
        ],
      }),
    );
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
