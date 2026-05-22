import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildAomiManifest, loadDotEnv, stableJson } from "../src/index.js";

const agents = ["alpha", "beta", "gamma", "delta"] as const;

async function main(): Promise<void> {
  await loadDotEnv(process.env.AGENTEX_ENV_PATH ?? ".env");

  const serviceUrl = requiredEnv("AGENTEX_SERVICE_URL");
  const agentRegistry = requiredEnv("AGENTEX_AGENT_REGISTRY");
  const aomiBackendUrl = requiredEnv("AOMI_BACKEND_URL");
  const aomiApp = requiredEnv("AOMI_APP");
  const outputDir = process.env.AGENTEX_AOMI_REGISTRATION_DIR ?? path.join("demo", "live-output", "aomi");
  const manifestPath = path.join(outputDir, "aomi-manifest.json");
  const aggregatePath = path.join(outputDir, ".well-known", "agent-registration.json");

  await mkdir(path.dirname(aggregatePath), { recursive: true });
  await writeFile(manifestPath, stableJson(buildAomiManifest({ serviceUrl })));

  const registrations = agents.map((agent) =>
    buildRegistration({
      agent,
      agentRegistry,
      agentId: requiredEnv(`AGENTEX_AGENT_ID_${agent.toUpperCase()}`),
      serviceUrl,
      aomiBackendUrl,
      aomiApp,
    }),
  );

  for (const registration of registrations) {
    await writeFile(registration.path, stableJson(registration.file));
  }

  await writeFile(
    aggregatePath,
    stableJson({
      type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
      name: "agentex-live-agents",
      registrations: registrations.flatMap((registration) => registration.file.registrations),
      services: [
        { name: "Aomi", endpoint: aomiChatEndpoint(aomiBackendUrl, aomiApp), version: aomiApp },
        { name: "Agentex", endpoint: serviceUrl, version: "0.1.0" },
        { name: "AgentexAomiManifest", endpoint: new URL("/api/aomi/manifest", serviceUrl).toString(), version: "agentex.aomi_manifest.v1" },
      ],
    }),
  );

  process.stdout.write(
    stableJson({
      schema: "agentex.aomi_registration_output.v1",
      status: "registration_files_written",
      manifest_path: manifestPath,
      aggregate_path: aggregatePath,
      registrations: registrations.map((registration) => ({
        agent: registration.agent,
        path: registration.path,
        agent_uri: registration.agentUri,
      })),
    }),
  );
}

function buildRegistration(input: {
  agent: (typeof agents)[number];
  agentRegistry: string;
  agentId: string;
  serviceUrl: string;
  aomiBackendUrl: string;
  aomiApp: string;
}): {
  agent: string;
  path: string;
  agentUri: string;
  file: {
    type: string;
    name: string;
    description: string;
    image: string;
    services: Array<Record<string, string>>;
    x402Support: boolean;
    active: boolean;
    registrations: Array<{ agentRegistry: string; agentId: string }>;
    supportedTrust: string[];
  };
} {
  const fileName = `${input.agent}.agent-registration.json`;
  const agentUri = new URL(`/aomi/${fileName}`, input.serviceUrl).toString();
  return {
    agent: input.agent,
    path: path.join(process.env.AGENTEX_AOMI_REGISTRATION_DIR ?? path.join("demo", "live-output", "aomi"), fileName),
    agentUri,
    file: {
      type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
      name: `agentex-${input.agent}`,
      description: `Agentex ${input.agent} trading agent using Aomi to trade verified Agentex experiences.`,
      image: new URL(`/aomi/${input.agent}.png`, input.serviceUrl).toString(),
      services: [
        { name: "Aomi", endpoint: aomiChatEndpoint(input.aomiBackendUrl, input.aomiApp), version: input.aomiApp },
        { name: "Agentex", endpoint: input.serviceUrl, version: "0.1.0" },
        { name: "AgentexAomiManifest", endpoint: new URL("/api/aomi/manifest", input.serviceUrl).toString(), version: "agentex.aomi_manifest.v1" },
      ],
      x402Support: false,
      active: true,
      registrations: [{ agentRegistry: input.agentRegistry, agentId: input.agentId }],
      supportedTrust: ["reputation", "cryptographic-attestation"],
    },
  };
}

function aomiChatEndpoint(backendUrl: string, app: string): string {
  const url = new URL("/api/chat", backendUrl);
  url.searchParams.set("app", app);
  return url.toString();
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.includes("REPLACE") || value.includes(".invalid")) {
    throw new Error(`${name} is required`);
  }
  return value;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
