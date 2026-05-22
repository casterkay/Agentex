import path from "node:path";

import { loadDotEnv, readDemoDeployment, stableJson } from "../src/index.js";

const deployEnv = ["AGENTEX_RPC_URL", "AGENTEX_CHAIN_ID", "AGENTEX_DEPLOYER_PRIVATE_KEY", "AGENTEX_DECODER_ADDRESS"];
const liveEnv = [
  "AGENTEX_DECODER_PRIVATE_KEY",
  "AGENTEX_SELLER_PRIVATE_KEY_ALPHA",
  "AGENTEX_SELLER_PRIVATE_KEY_BETA",
  "AGENTEX_SELLER_PRIVATE_KEY_GAMMA",
  "AGENTEX_SELLER_PRIVATE_KEY_DELTA",
  "PRIVATE_KEY",
  "AGENTEX_EXPERIENCE_KEY",
  "AGENTEX_SERVICE_URL",
  "AOMI_BACKEND_URL",
  "AOMI_APP",
  "AOMI_API_KEY",
  "AGENTEX_AGENT_REGISTRY",
  "AGENTEX_AGENT_ID_ALPHA",
  "AGENTEX_AGENT_ID_BETA",
  "AGENTEX_AGENT_ID_GAMMA",
  "AGENTEX_AGENT_ID_DELTA",
];

async function main(): Promise<void> {
  await loadDotEnv(process.env.AGENTEX_ENV_PATH ?? ".env");
  const deploymentPath = process.env.AGENTEX_DEPLOYMENT_PATH ?? path.join("deployments", "live-v1.json");
  const deployMissing = missingEnv(deployEnv);
  const liveMissing = missingEnv(liveEnv);
  const deployment = await readDeploymentStatus(deploymentPath);
  const addressMismatch = deployment.ok ? deploymentAddressMismatches(deployment.value) : [];
  const addressMissing = deployment.ok ? [] : ["AGENTEX_REGISTRY_ADDRESS", "AGENTEX_DEMO_VENUE_ADDRESS"].filter((name) => isUnset(process.env[name]));
  const automaticNext: string[] = [];

  if (deployMissing.length === 0 && !deployment.ok) {
    automaticNext.push("npm run deploy:demo");
  }
  if (deployMissing.length === 0 && liveMissing.length === 0 && deployment.ok && addressMismatch.length === 0) {
    automaticNext.push("npm run demo:live");
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
        aomi: aomiStatus(),
      },
      manual_setup: [
        "fund demo wallets and confirm live spend budget",
        "complete ERC-8004 agent registrations for alpha, beta, gamma, and delta",
        "activate the hosted Aomi app and scoped API key for app agentex",
        "create real Filecoin Pay payment references for each purchase",
        "provide live Arkhai/Alkahest settlement addresses if not using local settlement receipts",
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
  if (!isUnset(process.env.AGENTEX_CHAIN_ID) && Number(process.env.AGENTEX_CHAIN_ID) !== deployment.chain_id) {
    mismatches.push("AGENTEX_CHAIN_ID does not match deployments/live-v1.json");
  }
  if (!isUnset(process.env.AGENTEX_REGISTRY_ADDRESS) && process.env.AGENTEX_REGISTRY_ADDRESS !== deployment.registry_address) {
    mismatches.push("AGENTEX_REGISTRY_ADDRESS does not match deployments/live-v1.json");
  }
  if (!isUnset(process.env.AGENTEX_DEMO_VENUE_ADDRESS) && process.env.AGENTEX_DEMO_VENUE_ADDRESS !== deployment.demo_venue_address) {
    mismatches.push("AGENTEX_DEMO_VENUE_ADDRESS does not match deployments/live-v1.json");
  }
  return mismatches;
}

function aomiStatus(): { status: "ok" | "missing"; detail: string; backend_url?: string; app?: string; service_url?: string } {
  const missing = [
    "AGENTEX_SERVICE_URL",
    "AOMI_BACKEND_URL",
    "AOMI_APP",
    "AOMI_API_KEY",
    "AGENTEX_AGENT_REGISTRY",
    "AGENTEX_AGENT_ID_ALPHA",
    "AGENTEX_AGENT_ID_BETA",
    "AGENTEX_AGENT_ID_GAMMA",
    "AGENTEX_AGENT_ID_DELTA",
  ].filter((name) => isUnset(process.env[name]));
  if (missing.length > 0) {
    return { status: "missing", detail: `missing ${missing.join(", ")}` };
  }
  return {
    status: "ok",
    detail: "Aomi backend, app, API key, service URL, and ERC-8004 agent IDs are set",
    backend_url: process.env.AOMI_BACKEND_URL,
    app: process.env.AOMI_APP,
    service_url: process.env.AGENTEX_SERVICE_URL,
  };
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
