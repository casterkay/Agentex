#!/usr/bin/env -S node --import tsx
import { Command } from "commander";

import {
  createGeneAsset,
  createAgeneticsServer,
  createGeneListing,
  createGenePurchase,
  exportGeneAsset,
  planExchangeRound,
  recordGeneBreeding,
  scoreGeneAsset,
  uploadGeneToFilecoin,
  verifyGeneAsset,
} from "./index.js";

const program = new Command();

program
  .name("agenetics")
  .description("Agenetics OpenClaw gene market CLI")
  .version("0.1.0");

const gene = program.command("gene").description("Create, score, verify, and export profile genes");

gene
  .command("create")
  .requiredOption("--repo <path>")
  .requiredOption("--agent <id>")
  .requiredOption("--seller-registry <address>")
  .requiredOption("--seller-id <id>")
  .option("--evidence <path>")
  .option("--out <path>")
  .option("--key <key>", "gene encryption key", process.env.AGENETICS_GENE_KEY)
  .action(async (options) => {
    requireKey(options.key);
    const asset = await createGeneAsset({
      repo: options.repo,
      agent: options.agent,
      seller: { agentRegistry: options.sellerRegistry, agentId: options.sellerId },
      evidenceDir: options.evidence,
      outDir: options.out,
      key: options.key,
    });
    print({
      status: "created",
      gene_id: asset.manifest.gene_id,
      manifest_path: asset.paths.manifest,
      encrypted_payload_ref: asset.manifest.encrypted_payload_ref,
    });
  });

gene
  .command("score")
  .requiredOption("--manifest <path>")
  .option("--evidence <path>")
  .option("--note <text>")
  .action(async (options) => {
    const scored = await scoreGeneAsset({
      manifestPath: options.manifest,
      evidenceDir: options.evidence,
      valuationNote: options.note,
    });
    print({ status: "scored", score_path: scored.path, report: scored.report });
  });

gene
  .command("verify")
  .requiredOption("--manifest <path>")
  .option("--key <key>", "gene encryption key", process.env.AGENETICS_GENE_KEY)
  .action(async (options) => {
    requireKey(options.key);
    const result = await verifyGeneAsset({ manifestPath: options.manifest, key: options.key });
    print({ status: result.ok ? "verified" : "failed", ...result });
    if (!result.ok) {
      process.exitCode = 1;
    }
  });

gene
  .command("export")
  .requiredOption("--manifest <path>")
  .requiredOption("--out <path>")
  .option("--key <key>", "gene encryption key", process.env.AGENETICS_GENE_KEY)
  .action(async (options) => {
    requireKey(options.key);
    const result = await exportGeneAsset({
      manifestPath: options.manifest,
      key: options.key,
      out: options.out,
    });
    print({ status: "exported_for_review", ...result });
  });

gene
  .command("upload")
  .requiredOption("--manifest <path>")
  .option("--private-key <key>", "Filecoin wallet private key", process.env.PRIVATE_KEY)
  .option("--network <network>", "mainnet or calibration", "mainnet")
  .option("--confirm", "confirm public Filecoin upload")
  .action(async (options) => {
    if (options.confirm !== true) {
      print({
        status: "confirmation_required",
        action: "upload_gene_to_filecoin",
        manifest_path: options.manifest,
        next_action: "rerun with --confirm",
      });
      return;
    }
    const result = await uploadGeneToFilecoin({
      manifestPath: options.manifest,
      privateKey: options.privateKey,
      network: options.network,
    });
    print(result);
  });

const market = program.command("market").description("Create local market receipts");

market
  .command("list")
  .requiredOption("--manifest <path>")
  .requiredOption("--score <path>")
  .requiredOption("--price <amount>")
  .requiredOption("--asset <asset>")
  .requiredOption("--delivery-key-requirement <requirement>")
  .option("--confirm", "confirm listing creation")
  .action(async (options) => {
    if (options.confirm !== true) {
      print({
        status: "confirmation_required",
        action: "create_gene_listing",
        manifest_path: options.manifest,
        score_path: options.score,
        next_action: "rerun with --confirm",
      });
      return;
    }
    const listing = await createGeneListing({
      manifestPath: options.manifest,
      scorePath: options.score,
      priceAmount: options.price,
      paymentAsset: options.asset,
      deliveryPublicKeyRequirement: options.deliveryKeyRequirement,
    });
    print({ status: "listed", listing_path: listing.path, listing: listing.listing });
  });

market
  .command("buy")
  .requiredOption("--listing <path>")
  .requiredOption("--buyer-registry <address>")
  .requiredOption("--buyer-id <id>")
  .requiredOption("--escrow-id <id>")
  .requiredOption("--buyer-delivery-key <key>")
  .requiredOption("--key-envelope <text>")
  .requiredOption("--delivery-proof <text>")
  .option("--confirm", "confirm purchase receipt creation")
  .action(async (options) => {
    if (options.confirm !== true) {
      print({
        status: "confirmation_required",
        action: "create_gene_purchase",
        listing_path: options.listing,
        next_action: "rerun with --confirm",
      });
      return;
    }
    const purchase = await createGenePurchase({
      listingPath: options.listing,
      buyer: { agentRegistry: options.buyerRegistry, agentId: options.buyerId },
      escrowId: options.escrowId,
      buyerDeliveryPublicKey: options.buyerDeliveryKey,
      keyEnvelope: options.keyEnvelope,
      deliveryProof: options.deliveryProof,
    });
    print({ status: "purchased", purchase_path: purchase.path, receipt: purchase.receipt });
  });

market
  .command("record-breeding")
  .requiredOption("--purchase <path>")
  .requiredOption("--buyer-repo <path>")
  .requiredOption("--buyer-registry <address>")
  .requiredOption("--buyer-id <id>")
  .requiredOption("--type <type>", "full_breed or selective_breed")
  .requiredOption("--pre-breed-profile-hash <hash>")
  .option("--breeding-report-ref <ref>")
  .option("--confirm", "confirm breeding receipt creation")
  .action(async (options) => {
    if (options.confirm !== true) {
      print({
        status: "confirmation_required",
        action: "record_gene_breeding",
        purchase_receipt_path: options.purchase,
        next_action: "rerun with --confirm",
      });
      return;
    }
    const breeding = await recordGeneBreeding({
      purchaseReceiptPath: options.purchase,
      buyerRepo: options.buyerRepo,
      buyer: { agentRegistry: options.buyerRegistry, agentId: options.buyerId },
      type: parseBreedingType(options.type),
      preBreedProfileHash: options.preBreedProfileHash,
      breedingReportRef: options.breedingReportRef,
    });
    print({ status: "breeding_recorded", breeding_path: breeding.path, receipt: breeding.receipt });
  });

program
  .command("exchange")
  .description("Plan exchange flows")
  .command("plan")
  .argument("<agents...>")
  .action((agents: string[]) => {
    print({ status: "planned", round: planExchangeRound(agents) });
  });

program
  .command("serve")
  .description("Start the local JSON tool server")
  .option("--host <host>", "host", "127.0.0.1")
  .option("--port <port>", "port", "8787")
  .action(async (options) => {
    const server = createAgeneticsServer();
    await new Promise<void>((resolve) => server.listen(Number(options.port), options.host, resolve));
    print({ status: "listening", host: options.host, port: Number(options.port) });
  });

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ status: "error", error: message })}\n`);
  process.exitCode = 1;
});

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function requireKey(key: unknown): asserts key is string {
  if (typeof key !== "string" || key.length === 0) {
    throw new Error("encryption key required: pass --key or set AGENETICS_GENE_KEY");
  }
}

function parseBreedingType(value: string): "full_breed" | "selective_breed" {
  if (value !== "full_breed" && value !== "selective_breed") {
    throw new Error("type must be full_breed or selective_breed");
  }
  return value;
}
