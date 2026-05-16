#!/usr/bin/env -S node --import tsx
import { Command } from "commander";

import {
  createGeneAsset,
  createAgeneticsServer,
  exportGeneAsset,
  planExchangeRound,
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
