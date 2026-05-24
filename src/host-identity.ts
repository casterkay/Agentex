import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

import { sha256, type AgentRef } from "./shared.js";

export interface AuthenticatedHostIdentity {
  sessionId: string;
  threadId?: string;
  agent?: AgentRef;
}

const SESSION_HEADER = "x-agentex-session-id";
const THREAD_HEADER = "x-agentex-thread-id";
const AGENT_REGISTRY_HEADER = "x-agentex-agent-registry";
const AGENT_ID_HEADER = "x-agentex-agent-id";
const SIGNATURE_HEADER = "x-agentex-identity-signature";

export function authenticatedHostIdentityHeaderNames(): string[] {
  return [SESSION_HEADER, THREAD_HEADER, AGENT_REGISTRY_HEADER, AGENT_ID_HEADER, SIGNATURE_HEADER];
}

export function requiresAuthenticatedHostIdentity(toolName: string): boolean {
  return [
    "record_trade_execution",
    "prepare_experience_sale",
    "publish_experience_sale",
    "purchase_experience_access",
  ].includes(toolName);
}

export function buildHostIdentitySignature(
  toolName: string,
  rawBody: string,
  identity: AuthenticatedHostIdentity,
  secret: string,
): string {
  return createHmac("sha256", secret).update(signaturePayload(toolName, rawBody, identity)).digest("hex");
}

export function readAuthenticatedHostIdentity(
  headers: IncomingHttpHeaders,
  toolName: string,
  rawBody: string,
  secret: string | undefined,
): AuthenticatedHostIdentity | undefined {
  const sessionId = headerString(headers, SESSION_HEADER);
  const threadId = headerString(headers, THREAD_HEADER);
  const agentRegistry = headerString(headers, AGENT_REGISTRY_HEADER);
  const agentId = headerString(headers, AGENT_ID_HEADER);
  const signature = headerString(headers, SIGNATURE_HEADER);
  const supplied = [sessionId, threadId, agentRegistry, agentId, signature].some((value) => value !== undefined);

  if (!supplied) {
    return undefined;
  }
  if (!sessionId || !signature) {
    throw new Error("authenticated host identity requires x-agentex-session-id and x-agentex-identity-signature");
  }
  if ((agentRegistry && !agentId) || (!agentRegistry && agentId)) {
    throw new Error("authenticated host identity requires both x-agentex-agent-registry and x-agentex-agent-id");
  }
  if (!secret) {
    throw new Error("AGENTEX_HOST_IDENTITY_SECRET environment variable is not set");
  }

  const identity: AuthenticatedHostIdentity = {
    sessionId,
    ...(threadId ? { threadId } : {}),
    ...(agentRegistry && agentId ? { agent: { agentRegistry, agentId } } : {}),
  };
  const expectedSignature = buildHostIdentitySignature(toolName, rawBody, identity, secret);
  if (!signaturesEqual(signature, expectedSignature)) {
    throw new Error("authenticated host identity signature is invalid");
  }
  return identity;
}

function headerString(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name];
  if (Array.isArray(value)) {
    if (value.length !== 1) {
      throw new Error(`${name} must not be repeated`);
    }
    return value[0];
  }
  return value;
}

function signaturePayload(toolName: string, rawBody: string, identity: AuthenticatedHostIdentity): string {
  return [
    toolName,
    identity.sessionId,
    identity.threadId ?? "",
    identity.agent?.agentRegistry ?? "",
    identity.agent?.agentId ?? "",
    sha256(rawBody),
  ].join("\n");
}

function signaturesEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}