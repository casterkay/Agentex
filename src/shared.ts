import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const PROFILE_FILES = ["AGENTS.md", "MEMORY.md"] as const;

export interface AgentRef {
  agentRegistry: string;
  agentId: string;
}

export interface GeneFile {
  path: string;
  sha256: string;
  bytes: number;
}

export interface GeneManifest {
  schema: "agenetics.gene_manifest.v1";
  gene_id: string;
  gene_format: "openclaw.profile.v1";
  agent: string;
  seller: AgentRef;
  source_commit: string | null;
  parent_commit: string | null;
  files: GeneFile[];
  redaction_report_sha256: string;
  encrypted_payload_ref: string;
  encrypted_payload_sha256: string;
  preview_ref: string;
  preview_sha256: string;
  evidence: Array<{ path: string; sha256: string; bytes: number }>;
  storage: {
    provider: "local";
    status: "verified";
  };
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

export async function hashDirectory(
  dir: string,
  base: string,
): Promise<Array<{ path: string; sha256: string; bytes: number }>> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return hashDirectory(absolute, base);
      }
      if (!entry.isFile()) {
        return [];
      }
      const content = await readFile(absolute);
      return [{ path: path.relative(base, absolute), sha256: sha256(content), bytes: content.byteLength }];
    }),
  );
  return results.flat().sort((left, right) => left.path.localeCompare(right.path));
}

export async function hashProfileFiles(repo: string): Promise<GeneFile[]> {
  return Promise.all(
    PROFILE_FILES.map(async (relativePath) => {
      const content = await readFile(path.join(repo, relativePath));
      return {
        path: relativePath,
        sha256: sha256(content),
        bytes: content.byteLength,
      };
    }),
  );
}

export function gitValue(repo: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
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
