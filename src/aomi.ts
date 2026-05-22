export const AOMI_APP_NAME = "agentex";
export const AOMI_APP_VERSION = "0.1.0";

export type AomiToolMode = "read" | "prepare" | "write";

export interface AomiToolContract {
  name: string;
  mode: AomiToolMode;
  confirmation_required: boolean;
  description: string;
}

export const AOMI_TOOLS: AomiToolContract[] = [
  {
    name: "get_market_state",
    mode: "read",
    confirmation_required: false,
    description: "Read market state, available Agentex tools, and optional exchange-round state for the current trading agent.",
  },
  {
    name: "inspect_trade_activity",
    mode: "read",
    confirmation_required: false,
    description: "Inspect an OpenClaw activity and memory pair before creating a sellable experience.",
  },
  {
    name: "prepare_experience_sale",
    mode: "prepare",
    confirmation_required: false,
    description: "Preview the exact trade experience, public summary, listing terms, and risks before publishing.",
  },
  {
    name: "publish_experience_sale",
    mode: "write",
    confirmation_required: true,
    description: "Publish the current agent's encrypted experience, proof, attestation, and listing after confirmation.",
  },
  {
    name: "evaluate_experience_listing",
    mode: "read",
    confirmation_required: false,
    description: "Inspect a listing's public trade summary, proof bindings, price, and delivery terms before purchase.",
  },
  {
    name: "purchase_experience_access",
    mode: "write",
    confirmation_required: true,
    description: "Purchase decryption access for the current buyer agent through the Agentex settlement receipt path.",
  },
  {
    name: "verify_and_ingest_experience",
    mode: "write",
    confirmation_required: true,
    description: "Verify decrypted content against the committed hash and import it into the buyer's learning store.",
  },
  {
    name: "record_experience_feedback",
    mode: "write",
    confirmation_required: false,
    description: "Record buyer feedback after verified experience delivery.",
  },
];

export const AOMI_TOOL_NAMES = AOMI_TOOLS.map((tool) => tool.name);

export const AOMI_PREAMBLE = `## Role
You are a trading agent using Agentex, an onchain market for verified trade experiences.

## Capabilities
Use Agentex to sell your own attested trade experiences or buy verified experiences from other agents. The tools inspect your OpenClaw activity, prepare a sale, publish a confirmed listing, evaluate listings, purchase decryption access, verify delivery, ingest purchased experiences, and record feedback.

## Rules
Act for the current agent identity supplied by the host. Public writes, payments, wallet actions, Filecoin uploads, registry attestations, and ingestion into memory require explicit confirmation or host handoff. Preserve exact IDs, hashes, paths, payment references, and receipt fields between steps. Do not claim success until Agentex returns a verified receipt.`;

export function buildAomiManifest(): Record<string, unknown> {
  return {
    schema: "agentex.aomi_manifest.v1",
    name: AOMI_APP_NAME,
    version: AOMI_APP_VERSION,
    preamble: AOMI_PREAMBLE,
    service: {
      type: "http",
      default_base_url: "http://127.0.0.1:8787",
      tool_route: "/tool/{tool}",
    },
    tools: AOMI_TOOLS,
  };
}
