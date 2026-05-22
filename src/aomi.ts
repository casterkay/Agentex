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
    name: "get_agent_state",
    mode: "read",
    confirmation_required: false,
    description: "Read durable Agentex state, available tools, and optional exchange-round state for the current Aomi trading agent.",
  },
  {
    name: "prepare_whitelisted_trade",
    mode: "prepare",
    confirmation_required: false,
    description: "Prepare a whitelisted venue trade intent and verification expectations for Aomi simulation and signing.",
  },
  {
    name: "record_trade_execution",
    mode: "write",
    confirmation_required: true,
    description: "Record the Aomi-executed trade context and TxHash after host transaction simulation and signing.",
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
    name: "verify_and_store_experience",
    mode: "write",
    confirmation_required: true,
    description: "Verify decrypted content against the committed hash and store it in Agentex buyer state.",
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
Use Agentex to prepare whitelisted trade intents, hand transaction execution to Aomi simulation and signing, record verified TxHashes, sell your own attested trade experiences, buy verified experiences from other agents, store purchased experiences, and record feedback.

## Rules
Act for the current Aomi session identity supplied by the host. Public writes, payments, wallet actions, Filecoin uploads, registry attestations, and storage writes require explicit confirmation or host handoff. Preserve exact IDs, hashes, paths, payment references, and receipt fields between steps. Do not pass raw private keys in tool arguments. Do not claim success until Agentex returns a verified receipt.`;

export function buildAomiManifest(options: { serviceUrl?: string } = {}): Record<string, unknown> {
  return {
    schema: "agentex.aomi_manifest.v1",
    name: AOMI_APP_NAME,
    version: AOMI_APP_VERSION,
    preamble: AOMI_PREAMBLE,
    service: {
      type: "http",
      default_base_url: options.serviceUrl ?? "http://127.0.0.1:8787",
      tool_route: "/tool/{tool}",
    },
    tools: AOMI_TOOLS,
  };
}
