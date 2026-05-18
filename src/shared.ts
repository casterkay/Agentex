import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export interface AgentRef {
  agentRegistry: string;
  agentId: string;
}

export interface PublicTradeSummary {
  chain_id: number;
  whitelisted_venue_id: string;
  trade_tx_hash: string;
  pair: string;
  side: "buy" | "sell";
  size: string;
  fill_price: string;
  execution_block_number: number;
  execution_timestamp: string;
}

export interface VerificationStatus {
  status: "pending" | "local_verified" | "verified" | "failed";
  detail?: string;
}

export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function stableJson(value: unknown): string {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

export async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export function localRef(data: string | Buffer): string {
  return `local:${sha256(data)}`;
}

export function assertNever(value: never): never {
  throw new Error(`unexpected value: ${String(value)}`);
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortJson(item)]),
    );
  }
  return value;
}
