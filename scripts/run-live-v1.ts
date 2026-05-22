import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadDotEnv, readDemoDeployment, requireEnv, stableJson } from "../src/index.js";

const required = [
  "AGENTEX_RPC_URL",
  "AGENTEX_CHAIN_ID",
  "AGENTEX_DECODER_PRIVATE_KEY",
  "AGENTEX_SELLER_PRIVATE_KEY_ALPHA",
  "AGENTEX_SELLER_PRIVATE_KEY_BETA",
  "AGENTEX_SELLER_PRIVATE_KEY_GAMMA",
  "AGENTEX_SELLER_PRIVATE_KEY_DELTA",
  "PRIVATE_KEY",
  "AGENTEX_EXPERIENCE_KEY",
];

async function main(): Promise<void> {
  await loadDotEnv();
  requireEnv(required);
  const deploymentPath = process.env.AGENTEX_DEPLOYMENT_PATH ?? path.join("deployments", "live-v1.json");
  const outputDir = process.env.AGENTEX_LIVE_OUTPUT_DIR ?? path.join("demo", "live-output");
  const deployment = await readDemoDeployment(deploymentPath);
  assertCompleteDeployment(deployment);
  if (deployment.chain_id !== Number(process.env.AGENTEX_CHAIN_ID)) {
    throw new Error(`deployment chain ${deployment.chain_id} does not match AGENTEX_CHAIN_ID`);
  }
  const registryAddress = optionalEnv("AGENTEX_REGISTRY_ADDRESS") ?? deployment.registry_address;
  const demoVenueAddress = optionalEnv("AGENTEX_DEMO_VENUE_ADDRESS") ?? deployment.demo_venue_address;
  if (deployment.registry_address !== registryAddress) {
    throw new Error("deployment registry address does not match AGENTEX_REGISTRY_ADDRESS");
  }
  if (deployment.demo_venue_address !== demoVenueAddress) {
    throw new Error("deployment venue address does not match AGENTEX_DEMO_VENUE_ADDRESS");
  }
  await mkdir(outputDir, { recursive: true });
  const evidencePath = process.env.AGENTEX_LIVE_EVIDENCE_PATH ?? path.join("demo", "live-input", "evidence.json");
  const evidence = await readLiveEvidence(evidencePath);
  if (evidence) {
    const summary = buildLiveSummary({
      deployment,
      deploymentPath,
      registryAddress,
      demoVenueAddress,
      evidence,
    });
    const summaryPath = path.join(outputDir, "summary.json");
    await writeFile(summaryPath, stableJson(summary));
    process.stdout.write(
      `${JSON.stringify(
        {
          status: "live_summary_created",
          evidence_path: evidencePath,
          summary_path: summaryPath,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }
  const preflightPath = path.join(outputDir, "preflight.json");
  await writeFile(
    preflightPath,
    stableJson({
      schema: "agentex.live_preflight.v1",
      chain_id: deployment.chain_id,
      registry_address: registryAddress,
      demo_venue_address: demoVenueAddress,
      experience_access_obligation_address: deployment.experience_access_obligation_address,
      deployment_path: deploymentPath,
      next_required: [
        "run funded Aomi-session trades",
        "upload encrypted experiences to Filecoin Pin",
        "submit live registry attestations",
        "settle purchases through Filecoin Pay and Arkhai",
        `write live evidence file at ${evidencePath}`,
        "write demo/live-output/summary.json",
      ],
    }),
  );
  process.stdout.write(
    `${JSON.stringify(
      {
        status: "ready_for_live_execution",
        preflight_path: preflightPath,
        next_action:
          "run the Aomi-guided flow against funded wallets; this script is gated to avoid accidental spend in unconfigured environments",
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

function assertCompleteDeployment(deployment: Awaited<ReturnType<typeof readDemoDeployment>>): void {
  const missing = [
    "demo_venue_address",
    "demo_venue_block_number",
    "experience_access_obligation_address",
    "experience_access_obligation_block_number",
    "registry_address",
    "registry_block_number",
  ].filter((field) => {
    const value = deployment[field as keyof typeof deployment];
    return value === undefined || value === null || value === "";
  });
  if (missing.length > 0) {
    throw new Error(`deployment file is missing contract addresses or receipt blocks: ${missing.join(", ")}`);
  }
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value || value.includes("REPLACE") || value.includes(".invalid")) {
    return undefined;
  }
  return value;
}

type LiveEvidence = {
  schema: "agentex.live_evidence.v1";
  agents: string[];
  round: Array<{ buyer: string; seller: string }>;
  experiences: Array<Record<string, unknown>>;
  attestations: Array<Record<string, unknown>>;
  listings: Array<Record<string, unknown>>;
  purchases: Array<Record<string, unknown>>;
  registrations: Array<Record<string, unknown>>;
  ingestions: Array<Record<string, unknown>>;
};

async function readLiveEvidence(filePath: string): Promise<LiveEvidence | undefined> {
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
  return parseLiveEvidence(JSON.parse(text));
}

function parseLiveEvidence(value: unknown): LiveEvidence {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("live evidence must be a JSON object");
  }
  const evidence = value as LiveEvidence;
  if (evidence.schema !== "agentex.live_evidence.v1") {
    throw new Error("live evidence schema must be agentex.live_evidence.v1");
  }
  const expectedAgents = ["alpha", "beta", "gamma", "delta"];
  if (JSON.stringify(evidence.agents) !== JSON.stringify(expectedAgents)) {
    throw new Error("live evidence must use alpha, beta, gamma, delta agents");
  }
  const expectedRound = [
    { buyer: "alpha", seller: "beta" },
    { buyer: "beta", seller: "gamma" },
    { buyer: "gamma", seller: "delta" },
    { buyer: "delta", seller: "alpha" },
  ];
  if (JSON.stringify(evidence.round) !== JSON.stringify(expectedRound)) {
    throw new Error("live evidence round must be alpha->beta->gamma->delta->alpha");
  }
  for (const field of ["experiences", "attestations", "listings", "purchases", "registrations", "ingestions"] as const) {
    if (!Array.isArray(evidence[field]) || evidence[field].length !== 4) {
      throw new Error(`live evidence must contain four ${field}`);
    }
  }
  assertLiveExperiences(evidence.experiences);
  assertAcceptedAttestations(evidence.attestations);
  assertLivePurchases(evidence.purchases);
  return evidence;
}

function assertLiveExperiences(experiences: Array<Record<string, unknown>>): void {
  for (const experience of experiences) {
    const cid = stringField(experience, "encrypted_experience_cid");
    const storage = objectField(experience, "storage_proof_fields");
    if (cid.startsWith("local:")) {
      throw new Error("live evidence experiences must use Filecoin CIDs");
    }
    if (
      storage.provider !== "filecoin-pin" ||
      storage.status !== "verified" ||
      storage.root_cid !== cid ||
      typeof storage.piece_cid !== "string" ||
      storage.piece_cid.length === 0
    ) {
      throw new Error("live evidence experiences must include verified Filecoin Pin storage proof");
    }
    stringField(experience, "trade_tx_hash");
    stringField(experience, "filecoin_upload_receipt_path");
  }
}

function assertAcceptedAttestations(attestations: Array<Record<string, unknown>>): void {
  for (const attestation of attestations) {
    if (attestation.status !== "accepted") {
      throw new Error("live evidence attestations must be accepted");
    }
    hashField(attestation, "attestation_id");
    hashField(attestation, "registry_transaction_hash");
  }
}

function assertLivePurchases(purchases: Array<Record<string, unknown>>): void {
  for (const purchase of purchases) {
    const payment = stringField(purchase, "filecoin_pay_reference");
    if (/^filecoin-pay:[a-z]+-[a-z]+$/.test(payment)) {
      throw new Error("live evidence purchases must not use local Filecoin Pay placeholders");
    }
    stringField(purchase, "arkhai_escrow_id");
    stringField(purchase, "arkhai_fulfillment_id");
    const verification = objectField(purchase, "decryption_verification_result");
    if (verification.status !== "verified") {
      throw new Error("live evidence purchases must include verified decryption results");
    }
  }
}

function buildLiveSummary(input: {
  deployment: Awaited<ReturnType<typeof readDemoDeployment>>;
  deploymentPath: string;
  registryAddress: string;
  demoVenueAddress: string;
  evidence: LiveEvidence;
}): Record<string, unknown> {
  return {
    schema: "agentex.demo_summary.v1",
    mode: "live",
    agents: input.evidence.agents,
    round: input.evidence.round,
    deployment: {
      chain_id: input.deployment.chain_id,
      deployment_path: input.deploymentPath,
      demo_venue_address: input.demoVenueAddress,
      demo_venue_block_number: input.deployment.demo_venue_block_number,
      experience_access_obligation_address: input.deployment.experience_access_obligation_address,
      experience_access_obligation_block_number: input.deployment.experience_access_obligation_block_number,
      registry_address: input.registryAddress,
      registry_block_number: input.deployment.registry_block_number,
    },
    registrations: input.evidence.registrations,
    experiences: input.evidence.experiences,
    attestations: input.evidence.attestations,
    listings: input.evidence.listings,
    purchases: input.evidence.purchases,
    ingestions: input.evidence.ingestions,
  };
}

function objectField(value: Record<string, unknown>, field: string): Record<string, unknown> {
  const fieldValue = value[field];
  if (!fieldValue || typeof fieldValue !== "object" || Array.isArray(fieldValue)) {
    throw new Error(`live evidence missing object field: ${field}`);
  }
  return fieldValue as Record<string, unknown>;
}

function stringField(value: Record<string, unknown>, field: string): string {
  const fieldValue = value[field];
  if (typeof fieldValue !== "string" || fieldValue.length === 0) {
    throw new Error(`live evidence missing string field: ${field}`);
  }
  return fieldValue;
}

function hashField(value: Record<string, unknown>, field: string): string {
  const fieldValue = stringField(value, field);
  if (!/^0x[a-fA-F0-9]{64}$/.test(fieldValue)) {
    throw new Error(`live evidence field must be a transaction-style hash: ${field}`);
  }
  return fieldValue;
}
