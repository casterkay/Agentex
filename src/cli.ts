#!/usr/bin/env -S node --import tsx
import { writeFile } from "node:fs/promises";
import { Command } from "commander";

import {
  createExecutionProof,
  createExperienceListing,
  createExperiencePurchase,
  createAgentexServer,
  createTradeExperienceAsset,
  collectExperiencePayment,
  listArkhaiEscrows,
  planExchangeRound,
  prepareRegistryAttestation,
  requestExperienceArbitration,
  readJson,
  submitExperienceFulfillment,
  submitRegistryAttestation,
  uploadExperienceToFilecoin,
  verifyExperienceDelivery,
  loadDotEnv,
} from "./index.js";
import { type ExecutionProof, type ExperienceManifest, type RegistryAttestation, type TradeExperience } from "./schemas.js";

await loadDotEnv();

const program = new Command();

program.name("agentex").description("Agentex trade-experience market CLI").version("0.1.0");

const experience = program.command("experience").description("Extract, encrypt, upload, and verify trade experiences");

experience
  .command("extract")
  .requiredOption("--activity <path>")
  .requiredOption("--memory <path>")
  .requiredOption("--seller-registry <ref>")
  .requiredOption("--seller-id <id>")
  .option("--key <key>", "experience encryption key", process.env.AGENTEX_EXPERIENCE_KEY)
  .option("--out <path>")
  .option("--confirm", "confirm extraction and encryption")
  .action(async (options) => {
    requireConfirm(options.confirm);
    requireKey(options.key);
    const asset = await createTradeExperienceAsset({
      activityPath: options.activity,
      memoryPath: options.memory,
      sellerAgent: { agentRegistry: options.sellerRegistry, agentId: options.sellerId },
      key: options.key,
      outDir: options.out,
    });
    print({ status: "created", experience_id: asset.experience.experience_id, manifest_path: asset.paths.manifest });
  });

experience
  .command("upload")
  .requiredOption("--manifest <path>")
  .option("--private-key <key>", "Filecoin wallet private key", process.env.PRIVATE_KEY)
  .option("--network <network>", "mainnet or calibration", "mainnet")
  .option("--confirm", "confirm public encrypted upload")
  .action(async (options) => {
    requireConfirm(options.confirm);
    print(await uploadExperienceToFilecoin({ manifestPath: options.manifest, privateKey: options.privateKey, network: options.network }));
  });

const registry = program.command("registry").description("Create execution proofs and registry attestations");

registry
  .command("proof")
  .requiredOption("--experience <path>")
  .requiredOption("--decoder-id <id>")
  .requiredOption("--decoder-key <key>")
  .requiredOption("--out <path>")
  .action(async (options) => {
    const proof = createExecutionProof({
      trade: await readJson<TradeExperience>(options.experience),
      decoderId: options.decoderId,
      decoderKey: options.decoderKey,
    });
    await writeFile(options.out, JSON.stringify(proof, null, 2));
    print({ status: "created", execution_proof_path: options.out, execution_proof_hash: proof.execution_proof_hash });
  });

registry
  .command("attest")
  .requiredOption("--manifest <path>")
  .requiredOption("--proof <path>")
  .requiredOption("--seller-nonce <nonce>")
  .requiredOption("--deadline <iso>")
  .requiredOption("--registry <address>")
  .option("--out <path>")
  .option("--confirm", "submit local attestation")
  .action(async (options) => {
    const prepared = prepareRegistryAttestation({
      manifest: await readJson<ExperienceManifest>(options.manifest),
      executionProof: await readJson<ExecutionProof>(options.proof),
      sellerNonce: options.sellerNonce,
      attestationDeadline: options.deadline,
      registryAddress: options.registry,
    });
    if (options.confirm !== true) {
      print({ status: "prepared", ...prepared });
      return;
    }
    const result = await submitRegistryAttestation({ attestation: prepared.attestation, executionProof: await readJson<ExecutionProof>(options.proof) });
    if (options.out) {
      await writeFile(options.out, JSON.stringify(result.attestation, null, 2));
    }
    print(result);
  });

const market = program.command("market").description("List, buy, and verify experiences");

market
  .command("list")
  .requiredOption("--manifest <path>")
  .requiredOption("--attestation-id <id>")
  .requiredOption("--price <amount>")
  .requiredOption("--asset <asset>")
  .option("--live", "require Filecoin storage proof before listing")
  .option("--confirm")
  .action(async (options) => {
    requireConfirm(options.confirm);
    const listing = await createExperienceListing({
      manifestPath: options.manifest,
      attestationId: options.attestationId,
      priceAmount: options.price,
      paymentAsset: options.asset,
      mode: options.live ? "live" : "local",
    });
    print({ status: "listed", listing_path: listing.path, listing: listing.listing });
  });

market
  .command("buy")
  .requiredOption("--listing <path>")
  .requiredOption("--buyer-registry <ref>")
  .requiredOption("--buyer-id <id>")
  .requiredOption("--filecoin-pay-reference <ref>")
  .option("--escrow-id <id>", "existing escrow UID for manual/live settlement")
  .requiredOption("--key-envelope <text>")
  .requiredOption("--delivery-proof <text>")
  .option("--confirm")
  .action(async (options) => {
    requireConfirm(options.confirm);
    const purchase = await createExperiencePurchase({
      listingPath: options.listing,
      buyerAgent: { agentRegistry: options.buyerRegistry, agentId: options.buyerId },
      filecoinPayReference: options.filecoinPayReference,
      escrowId: options.escrowId,
      keyEnvelope: options.keyEnvelope,
      deliveryProof: options.deliveryProof,
    });
    print({ status: "purchased", purchase_path: purchase.path, receipt: purchase.receipt });
  });

market
  .command("fulfill")
  .requiredOption("--purchase <path>")
  .requiredOption("--key-envelope <text>")
  .requiredOption("--delivery-proof <text>")
  .option("--confirm")
  .action(async (options) => {
    requireConfirm(options.confirm);
    print(
      await submitExperienceFulfillment({
        purchaseReceiptPath: options.purchase,
        keyEnvelope: options.keyEnvelope,
        deliveryProof: options.deliveryProof,
      }),
    );
  });

market
  .command("verify-delivery")
  .requiredOption("--purchase <path>")
  .option("--key <key>", "experience encryption key", process.env.AGENTEX_EXPERIENCE_KEY)
  .action(async (options) => {
    requireKey(options.key);
    print(await verifyExperienceDelivery({ purchaseReceiptPath: options.purchase, key: options.key }));
  });

market
  .command("arbitrate")
  .requiredOption("--purchase <path>")
  .option("--confirm")
  .action(async (options) => {
    requireConfirm(options.confirm);
    print(await requestExperienceArbitration({ purchaseReceiptPath: options.purchase }));
  });

market
  .command("collect")
  .requiredOption("--purchase <path>")
  .option("--confirm")
  .action(async (options) => {
    requireConfirm(options.confirm);
    print(await collectExperiencePayment({ purchaseReceiptPath: options.purchase }));
  });

market
  .command("escrows")
  .action(async () => {
    print({ status: "ready", ...(await listArkhaiEscrows()) });
  });

program
  .command("demo")
  .description("Plan demo exchange flows")
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
    const server = createAgentexServer();
    await new Promise<void>((resolve) => server.listen(Number(options.port), options.host, resolve));
    print({ status: "listening", host: options.host, port: Number(options.port) });
  });

program.parseAsync().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({ status: "error", error: error instanceof Error ? error.message : String(error) })}\n`);
  process.exitCode = 1;
});

function requireKey(key: unknown): asserts key is string {
  if (typeof key !== "string" || key.length === 0) {
    throw new Error("experience encryption key required: pass --key or set AGENTEX_EXPERIENCE_KEY");
  }
}

function requireConfirm(confirm: unknown): void {
  if (confirm !== true) {
    print({ status: "confirmation_required", next_action: "rerun with --confirm" });
    process.exit(0);
  }
}

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
