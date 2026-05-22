import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadDotEnv, planExchangeRound, stableJson } from "../src/index.js";

const agents = ["alpha", "beta", "gamma", "delta"];

async function main(): Promise<void> {
  await loadDotEnv(process.env.AGENTEX_ENV_PATH ?? ".env");
  const backendUrl = requireEnv("AOMI_BACKEND_URL");
  const app = requireEnv("AOMI_APP");
  const apiKey = requireEnv("AOMI_API_KEY");
  const outputDir = process.env.AGENTEX_LIVE_OUTPUT_DIR ?? path.join("demo", "live-output");
  const responses = [];

  for (const agent of agents) {
    const sessionId = requireEnv(`AOMI_SESSION_ID_${agent.toUpperCase()}`);
    const response = await fetch(chatUrl(backendUrl, app), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "x-session-id": sessionId,
      },
      body: stableJson({
        message: `Run the Agentex live workflow for ${agent}. Return the live evidence fragment when verified.`,
        metadata: { agent },
      }),
    });
    if (!response.ok) {
      throw new Error(`Aomi session ${agent} returned HTTP ${response.status}`);
    }
    const body = (await response.json()) as { evidence?: Record<string, unknown> };
    if (!body.evidence) {
      throw new Error(`Aomi session ${agent} did not return an evidence fragment`);
    }
    responses.push(body.evidence);
  }

  const evidence = {
    schema: "agentex.live_evidence.v1",
    agents,
    round: planExchangeRound(agents),
    experiences: responses.map((item) => requiredObject(item, "experience")),
    attestations: responses.map((item) => requiredObject(item, "attestation")),
    listings: responses.map((item) => requiredObject(item, "listing")),
    purchases: responses.map((item) => requiredObject(item, "purchase")),
    registrations: responses.map((item) => requiredObject(item, "registration")),
    ingestions: responses.map((item) => requiredObject(item, "ingestion")),
  };

  await mkdir(outputDir, { recursive: true });
  const evidencePath = path.join(outputDir, "evidence.json");
  await writeFile(evidencePath, stableJson(evidence));
  process.stdout.write(stableJson({ status: "aomi_round_completed", evidence_path: evidencePath }));
}

function chatUrl(backendUrl: string, app: string): string {
  const url = new URL("/api/chat", backendUrl);
  url.searchParams.set("app", app);
  return url.toString();
}

function requiredObject(value: Record<string, unknown>, field: string): Record<string, unknown> {
  const fieldValue = value[field];
  if (!fieldValue || typeof fieldValue !== "object" || Array.isArray(fieldValue)) {
    throw new Error(`Aomi evidence fragment missing ${field}`);
  }
  return fieldValue as Record<string, unknown>;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.includes("REPLACE") || value.includes(".invalid")) {
    throw new Error(`missing required env: ${name}`);
  }
  return value;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
