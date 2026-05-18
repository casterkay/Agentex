import { requireEnv } from "../src/index.js";

const required = [
  "AGENTEX_RPC_URL",
  "AGENTEX_CHAIN_ID",
  "AGENTEX_REGISTRY_ADDRESS",
  "AGENTEX_DEMO_VENUE_ADDRESS",
  "AGENTEX_DECODER_PRIVATE_KEY",
  "AGENTEX_SELLER_PRIVATE_KEY_ALPHA",
  "AGENTEX_SELLER_PRIVATE_KEY_BETA",
  "AGENTEX_SELLER_PRIVATE_KEY_GAMMA",
  "AGENTEX_SELLER_PRIVATE_KEY_DELTA",
  "PRIVATE_KEY",
  "AGENTEX_EXPERIENCE_KEY",
];

async function main(): Promise<void> {
  requireEnv(required);
  process.stdout.write(
    `${JSON.stringify(
      {
        status: "ready_for_live_execution",
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
