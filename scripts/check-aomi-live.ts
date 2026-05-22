import { AOMI_TOOL_NAMES, loadDotEnv, stableJson } from "../src/index.js";

type CheckStatus = "ok" | "missing" | "manual_required";

async function main(): Promise<void> {
  await loadDotEnv(process.env.AGENTEX_ENV_PATH ?? ".env");

  const serviceUrl = process.env.AGENTEX_SERVICE_URL;
  const serviceCheck = checkServiceUrl(serviceUrl);
  const manifestCheck = serviceCheck.status === "ok" && serviceUrl ? await checkManifest(serviceUrl) : { status: "manual_required", detail: "Agentex service URL is not ready" };
  const aomiAuth = checkAomiAuth();
  const blocked = [serviceCheck, manifestCheck, aomiAuth].some((check) => check.status !== "ok");

  process.stdout.write(
    stableJson({
      schema: "agentex.aomi_live_setup_check.v1",
      status: blocked ? "blocked" : "ready_for_aomi_registration",
      checks: {
        service_url: serviceCheck,
        manifest: manifestCheck,
        aomi_auth: aomiAuth,
      },
      manual_setup: [
        ...(serviceCheck.status === "ok" ? [] : ["deploy Agentex service over public HTTPS and set AGENTEX_SERVICE_URL"]),
        ...(aomiAuth.status === "ok" ? [] : ["set AOMI_BACKEND_URL, AOMI_APP, and the Aomi-issued AOMI_API_KEY"]),
        "register or update the Aomi app in the real Aomi deployment with the Agentex manifest and Rust app bundle",
      ],
      automatic_next: blocked ? [] : ["npm run aomi:registration"],
    }),
  );
}

function checkServiceUrl(value: string | undefined): { status: CheckStatus; detail: string; url?: string } {
  if (!value) {
    return { status: "missing", detail: "AGENTEX_SERVICE_URL is not set" };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { status: "manual_required", detail: "AGENTEX_SERVICE_URL must be an absolute URL" };
  }

  const localAllowed = process.env.AGENTEX_AOMI_ALLOW_LOCAL === "true";
  const localHost = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  if (url.protocol !== "https:" && !(localAllowed && localHost)) {
    return { status: "manual_required", detail: "AGENTEX_SERVICE_URL must be public HTTPS for hosted Aomi" };
  }

  return { status: "ok", detail: localHost ? "local Agentex service accepted for preflight" : "public Agentex service URL accepted", url: value };
}

async function checkManifest(serviceUrl: string): Promise<{ status: CheckStatus; detail: string; tools?: string[] }> {
  try {
    const manifestUrl = new URL("/api/aomi/manifest", serviceUrl).toString();
    const response = await fetchWithTimeout(manifestUrl);
    if (!response.ok) {
      return { status: "manual_required", detail: `GET ${manifestUrl} returned HTTP ${response.status}` };
    }
    const body = (await response.json()) as { schema?: unknown; name?: unknown; tools?: Array<{ name?: unknown }> };
    const tools = Array.isArray(body.tools) ? body.tools.map((tool) => String(tool.name)) : [];
    const missing = AOMI_TOOL_NAMES.filter((name) => !tools.includes(name));
    if (body.schema !== "agentex.aomi_manifest.v1" || body.name !== "agentex" || missing.length > 0) {
      return { status: "manual_required", detail: `manifest is missing Agentex Aomi contract fields: ${missing.join(", ") || "schema/name"}`, tools };
    }
    return { status: "ok", detail: "Agentex Aomi manifest is reachable", tools };
  } catch (error) {
    return { status: "manual_required", detail: error instanceof Error ? error.message : String(error) };
  }
}

function checkAomiAuth(): { status: CheckStatus; detail: string; backend_url?: string; app?: string } {
  const missing = ["AOMI_BACKEND_URL", "AOMI_APP", "AOMI_API_KEY"].filter((name) => !process.env[name]);
  if (missing.length > 0) {
    return { status: "missing", detail: `missing ${missing.join(", ")}` };
  }
  return {
    status: "ok",
    detail: "Aomi backend, app, and scoped API key are set",
    backend_url: process.env.AOMI_BACKEND_URL,
    app: process.env.AOMI_APP,
  };
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
