import { access } from "node:fs/promises";
import path from "node:path";

import { checkOpenClawPrereqs, loadDotEnv, readDemoDeployment, stableJson } from "../src/index.js";

const deployEnv = ["AGENTEX_RPC_URL", "AGENTEX_CHAIN_ID", "AGENTEX_DEPLOYER_PRIVATE_KEY", "AGENTEX_DECODER_ADDRESS"];
const liveEnv = [
  "AGENTEX_DECODER_PRIVATE_KEY",
  "AGENTEX_SELLER_PRIVATE_KEY_ALPHA",
  "AGENTEX_SELLER_PRIVATE_KEY_BETA",
  "AGENTEX_SELLER_PRIVATE_KEY_GAMMA",
  "AGENTEX_SELLER_PRIVATE_KEY_DELTA",
  "PRIVATE_KEY",
  "AGENTEX_EXPERIENCE_KEY",
];

async function main(): Promise<void> {
  await loadDotEnv(process.env.AGENTEX_ENV_PATH ?? ".env");
  const deploymentPath = process.env.AGENTEX_DEPLOYMENT_PATH ?? path.join("deployments", "live-v1.json");
  const deployMissing = missingEnv(deployEnv);
  const liveMissing = missingEnv(liveEnv);
  const deployment = await readDeploymentStatus(deploymentPath);
  const addressMismatch = deployment.ok ? deploymentAddressMismatches(deployment.value) : [];
  const addressMissing = deployment.ok ? [] : ["AGENTEX_REGISTRY_ADDRESS", "AGENTEX_DEMO_VENUE_ADDRESS"].filter((name) => isUnset(process.env[name]));
  const openclaw = await checkOpenClawPrereqs({ openclawRepo: process.env.OPENCLAW_REPO, requireProviderKey: true });
  const automaticNext: string[] = [];

  if (deployMissing.length === 0 && !deployment.ok) {
    automaticNext.push("npm run deploy:demo");
  }
  if (deployMissing.length === 0 && liveMissing.length === 0 && deployment.ok && addressMismatch.length === 0) {
    automaticNext.push("npm run demo:live");
  }
  if (openclaw.ok) {
    automaticNext.push("npm run openclaw:deploy");
  }

  const blockers = [...deployMissing, ...liveMissing, ...addressMissing, ...addressMismatch];
  const status = blockers.length === 0 && deployment.ok ? "ready_for_live_preflight" : "blocked";
  process.stdout.write(
    stableJson({
      schema: "agentex.live_setup_check.v1",
      status,
      env_file: process.env.AGENTEX_ENV_PATH ?? ".env",
      deployment_path: deploymentPath,
      checks: {
        node: {
          status: Number(process.versions.node.split(".")[0] ?? "0") >= 24 ? "ok" : "manual_required",
          detail: `current ${process.version}; Filecoin Pin upload requires Node.js 24+`,
        },
        deploy_env: { status: deployMissing.length === 0 ? "ok" : "missing", missing: deployMissing },
        live_env: { status: liveMissing.length === 0 && addressMissing.length === 0 ? "ok" : "missing", missing: [...liveMissing, ...addressMissing] },
        deployment,
        address_mismatch: addressMismatch,
        openclaw,
        aomi_sdk: await aomiStatus(),
      },
      manual_setup: [
        "fund demo wallets and confirm live spend budget",
        "complete ERC-8004 agent registrations for alpha, beta, gamma, and delta",
        "create real Filecoin Pay payment references for each purchase",
        "provide live Arkhai/Alkahest settlement addresses if not using local settlement receipts",
        ...(openclaw.ok ? [] : openclaw.next_actions),
        ...(process.env.AOMI_SDK_REPO ? [] : ["set AOMI_SDK_REPO to build the SDK-specific Aomi plugin"]),
      ],
      automatic_next: automaticNext,
    }),
  );
}

function missingEnv(names: string[]): string[] {
  return names.filter((name) => isUnset(process.env[name]));
}

function isUnset(value: string | undefined): boolean {
  return value === undefined || value === "" || value.includes("REPLACE") || value.includes(".invalid");
}

async function readDeploymentStatus(filePath: string): Promise<{ ok: true; value: Awaited<ReturnType<typeof readDemoDeployment>> } | { ok: false; error: string }> {
  try {
    const value = await readDemoDeployment(filePath);
    if (!value.demo_venue_address || !value.registry_address || !value.experience_access_obligation_address) {
      return { ok: false, error: "deployment file is missing contract addresses; rerun npm run deploy:demo" };
    }
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function deploymentAddressMismatches(deployment: Awaited<ReturnType<typeof readDemoDeployment>>): string[] {
  const mismatches: string[] = [];
  if (process.env.AGENTEX_CHAIN_ID && Number(process.env.AGENTEX_CHAIN_ID) !== deployment.chain_id) {
    mismatches.push("AGENTEX_CHAIN_ID does not match deployments/live-v1.json");
  }
  if (process.env.AGENTEX_REGISTRY_ADDRESS && process.env.AGENTEX_REGISTRY_ADDRESS !== deployment.registry_address) {
    mismatches.push("AGENTEX_REGISTRY_ADDRESS does not match deployments/live-v1.json");
  }
  if (process.env.AGENTEX_DEMO_VENUE_ADDRESS && process.env.AGENTEX_DEMO_VENUE_ADDRESS !== deployment.demo_venue_address) {
    mismatches.push("AGENTEX_DEMO_VENUE_ADDRESS does not match deployments/live-v1.json");
  }
  return mismatches;
}

async function aomiStatus(): Promise<{ status: "ok" | "manual_required"; detail: string }> {
  if (!process.env.AOMI_SDK_REPO) {
    return { status: "manual_required", detail: "AOMI_SDK_REPO is not set" };
  }
  try {
    await access(path.join(process.env.AOMI_SDK_REPO, "sdk", "examples", "app-template-http", "src"));
    return { status: "ok", detail: "Aomi SDK template found" };
  } catch {
    return { status: "manual_required", detail: "AOMI_SDK_REPO does not contain sdk/examples/app-template-http/src" };
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
