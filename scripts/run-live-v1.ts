import { mkdir, writeFile } from "node:fs/promises";
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
  if (deployment.chain_id !== Number(process.env.AGENTEX_CHAIN_ID)) {
    throw new Error(`deployment chain ${deployment.chain_id} does not match AGENTEX_CHAIN_ID`);
  }
  const registryAddress = process.env.AGENTEX_REGISTRY_ADDRESS || deployment.registry_address;
  const demoVenueAddress = process.env.AGENTEX_DEMO_VENUE_ADDRESS || deployment.demo_venue_address;
  if (deployment.registry_address !== registryAddress) {
    throw new Error("deployment registry address does not match AGENTEX_REGISTRY_ADDRESS");
  }
  if (deployment.demo_venue_address !== demoVenueAddress) {
    throw new Error("deployment venue address does not match AGENTEX_DEMO_VENUE_ADDRESS");
  }
  await mkdir(outputDir, { recursive: true });
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
        "run funded OpenClaw trades",
        "upload encrypted experiences to Filecoin Pin",
        "submit live registry attestations",
        "settle purchases through Filecoin Pay and Arkhai",
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
