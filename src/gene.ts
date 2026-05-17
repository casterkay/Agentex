import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  type AgentRef,
  type GeneFile,
  type GeneManifest,
  PROFILE_FILES,
  gitValue,
  hashDirectory,
  hashProfileFiles,
  readJson,
  sha256,
  stableJson,
} from "./shared.js";

const SECRET_PATTERNS = [
  /private[_-]?key/i,
  /api[_-]?key/i,
  /secret/i,
  /token\s*=/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

export interface GeneAsset {
  manifest: GeneManifest;
  redaction: RedactionReport;
  paths: {
    root: string;
    manifest: string;
    encryptedPayload: string;
    preview: string;
    redaction: string;
  };
}

export interface RedactionReport {
  schema: "agentex.redaction_report.v1";
  checked: string[];
  blocked: string[];
}

export interface ScoreReport {
  schema: "agentex.gene_score.v1";
  gene_id: string;
  evidence_hashes: string[];
  metrics: {
    profile_bytes: number;
    evidence_files: number;
    evidence_bytes: number;
    profile_files: number;
  };
  deterministic_score: number;
  formula_version: "profile-evidence-v1";
  valuation_note?: string;
}

type PayloadFile = GeneFile & { content: string };

interface EncryptedPayload {
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
}

export async function createGeneAsset(input: {
  repo: string;
  agent: string;
  seller: AgentRef;
  evidenceDir?: string;
  key: string;
  outDir?: string;
}): Promise<GeneAsset> {
  const repo = path.resolve(input.repo);
  const outputRoot = input.outDir ? path.resolve(input.outDir) : path.join(repo, ".agentex", "genes");
  const ignored = await readIgnore(repo);
  const files = await Promise.all(
    PROFILE_FILES.map(async (relativePath) => {
      if (matchesAny(relativePath, ignored)) {
        throw new Error(`redaction failed: ${relativePath} is ignored`);
      }
      const absolutePath = path.join(repo, relativePath);
      const content = await readFile(absolutePath);
      const text = content.toString("utf8");
      const matched = SECRET_PATTERNS.find((pattern) => pattern.test(text));
      if (matched) {
        throw new Error(`redaction failed: ${relativePath} contains denied material`);
      }
      return {
        path: relativePath,
        sha256: sha256(content),
        bytes: content.byteLength,
        content: content.toString("base64"),
      };
    }),
  );

  const redaction: RedactionReport = {
    schema: "agentex.redaction_report.v1",
    checked: files.map((file) => file.path),
    blocked: [],
  };
  const redactionText = stableJson(redaction);
  const payload = {
    schema: "agentex.encrypted_gene_payload.v1",
    files,
  };
  const encrypted = encrypt(Buffer.from(stableJson(payload), "utf8"), input.key);
  const encryptedText = stableJson(encrypted);
  const encryptedHash = sha256(encryptedText);
  const preview = {
    schema: "agentex.gene_preview.v1",
    agent: input.agent,
    files: files.map(({ content: _content, ...file }) => file),
  };
  const previewText = stableJson(preview);
  const evidence = input.evidenceDir
    ? await hashDirectory(path.resolve(input.evidenceDir), path.resolve(input.evidenceDir))
    : [];
  const geneId = sha256(
    stableJson({
      agent: input.agent,
      seller: input.seller,
      source_commit: gitValue(repo, ["rev-parse", "HEAD"]),
      files: files.map(({ content: _content, ...file }) => file),
    }),
  ).slice(0, 32);
  const root = path.join(outputRoot, geneId);
  await mkdir(root, { recursive: true });

  const manifest: GeneManifest = {
    schema: "agentex.gene_manifest.v1",
    gene_id: geneId,
    gene_format: "openclaw.profile.v1",
    agent: input.agent,
    seller: input.seller,
    source_commit: gitValue(repo, ["rev-parse", "HEAD"]),
    parent_commit: gitValue(repo, ["rev-parse", "HEAD^"]),
    files: files.map(({ content: _content, ...file }) => file),
    redaction_report_sha256: sha256(redactionText),
    encrypted_payload_ref: `local:${encryptedHash}`,
    encrypted_payload_sha256: encryptedHash,
    preview_ref: `local:${sha256(previewText)}`,
    preview_sha256: sha256(previewText),
    evidence,
    storage: {
      provider: "local",
      status: "verified",
    },
  };

  const paths = {
    root,
    manifest: path.join(root, "manifest.json"),
    encryptedPayload: path.join(root, "payload.enc.json"),
    preview: path.join(root, "preview.json"),
    redaction: path.join(root, "redaction.json"),
  };
  await writeFile(paths.encryptedPayload, encryptedText);
  await writeFile(paths.preview, previewText);
  await writeFile(paths.redaction, redactionText);
  await writeFile(paths.manifest, stableJson(manifest));
  return { manifest, redaction, paths };
}

export async function inspectOpenclawProfile(input: { repo: string }): Promise<{
  status: "ready";
  files: GeneFile[];
}> {
  return { status: "ready", files: await hashProfileFiles(path.resolve(input.repo)) };
}

export async function scoreGeneAsset(input: {
  manifestPath: string;
  evidenceDir?: string;
  valuationNote?: string;
}): Promise<{ report: ScoreReport; path: string }> {
  const manifest = await readJson<GeneManifest>(input.manifestPath);
  const evidence = input.evidenceDir
    ? await hashDirectory(path.resolve(input.evidenceDir), path.resolve(input.evidenceDir))
    : manifest.evidence;
  const profileBytes = manifest.files.reduce((sum, file) => sum + file.bytes, 0);
  const evidenceBytes = evidence.reduce((sum, item) => sum + item.bytes, 0);
  const deterministicScore = Math.min(
    100,
    Math.round(manifest.files.length * 20 + evidence.length * 12 + Math.min(evidenceBytes, 4000) / 100),
  );
  const report: ScoreReport = {
    schema: "agentex.gene_score.v1",
    gene_id: manifest.gene_id,
    evidence_hashes: evidence.map((item) => item.sha256).sort(),
    metrics: {
      profile_bytes: profileBytes,
      evidence_files: evidence.length,
      evidence_bytes: evidenceBytes,
      profile_files: manifest.files.length,
    },
    deterministic_score: deterministicScore,
    formula_version: "profile-evidence-v1",
    ...(input.valuationNote ? { valuation_note: input.valuationNote } : {}),
  };
  const reportPath = path.join(path.dirname(input.manifestPath), "score.json");
  await writeFile(reportPath, stableJson(report));
  return { report, path: reportPath };
}

export async function verifyGeneAsset(input: {
  manifestPath: string;
  key: string;
}): Promise<{ ok: boolean; errors: string[]; files?: GeneFile[] }> {
  const errors: string[] = [];
  const manifest = await readJson<GeneManifest>(input.manifestPath);
  const root = path.dirname(input.manifestPath);
  const encryptedPath = path.join(root, "payload.enc.json");
  const encryptedText = await readFile(encryptedPath, "utf8");
  if (sha256(encryptedText) !== manifest.encrypted_payload_sha256) {
    errors.push("encrypted payload hash mismatch");
    return { ok: false, errors };
  }

  let files: PayloadFile[];
  try {
    const payload = JSON.parse(decrypt(JSON.parse(encryptedText), input.key).toString("utf8")) as {
      files: PayloadFile[];
    };
    files = payload.files;
  } catch {
    return { ok: false, errors: ["encrypted payload could not be decrypted"] };
  }

  for (const expected of manifest.files) {
    const actual = files.find((file) => file.path === expected.path);
    if (!actual) {
      errors.push(`missing file ${expected.path}`);
      continue;
    }
    const content = Buffer.from(actual.content, "base64");
    if (sha256(content) !== expected.sha256) {
      errors.push(`file hash mismatch: ${expected.path}`);
    }
  }

  const extra = files.filter((file) => !PROFILE_FILES.includes(file.path as (typeof PROFILE_FILES)[number]));
  if (extra.length > 0) {
    errors.push(`payload includes unsupported files: ${extra.map((file) => file.path).join(", ")}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    files: errors.length === 0 ? manifest.files : undefined,
  };
}

export async function exportGeneAsset(input: {
  manifestPath: string;
  key: string;
  out: string;
}): Promise<{ ok: boolean; out: string; files: string[] }> {
  const verified = await verifyGeneAsset(input);
  if (!verified.ok) {
    throw new Error(`verification failed: ${verified.errors.join("; ")}`);
  }
  const encrypted = await readJson<EncryptedPayload>(path.join(path.dirname(input.manifestPath), "payload.enc.json"));
  const payload = JSON.parse(decrypt(encrypted, input.key).toString("utf8")) as { files: PayloadFile[] };
  await mkdir(input.out, { recursive: true });
  for (const file of payload.files) {
    await writeFile(path.join(input.out, file.path), Buffer.from(file.content, "base64"));
  }
  await writeFile(
    path.join(input.out, "DIFF_PLAN.md"),
    [
      "# Agentex Gene Review",
      "",
      "Review exported profile files before breeding them into an agent profile.",
      "",
      "- Compare AGENTS.md and MEMORY.md against the buyer profile.",
      "- Commit only deliberate profile changes.",
      "",
    ].join("\n"),
  );
  return { ok: true, out: input.out, files: payload.files.map((file) => file.path) };
}

function encrypt(data: Buffer, key: string): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", normalizeKey(key), iv);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  return {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

function decrypt(payload: EncryptedPayload, key: string): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", normalizeKey(key), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, "base64")), decipher.final()]);
}

function normalizeKey(key: string): Buffer {
  return createHash("sha256").update(key).digest();
}

async function readIgnore(repo: string): Promise<string[]> {
  try {
    const text = await readFile(path.join(repo, ".agentexignore"), "utf8");
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch {
    return [];
  }
}

function matchesAny(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern === filePath) {
      return true;
    }
    const regex = new RegExp(`^${pattern.split("*").map(escapeRegex).join(".*")}$`);
    return regex.test(filePath);
  });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
