import { execFileSync } from "node:child_process";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import path from "node:path";

const PROFILE_FILES = ["AGENTS.md", "MEMORY.md"] as const;
const SECRET_PATTERNS = [
  /private[_-]?key/i,
  /api[_-]?key/i,
  /secret/i,
  /token\s*=/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

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
  schema: "agenetics.redaction_report.v1";
  checked: string[];
  blocked: string[];
}

export interface ScoreReport {
  schema: "agenetics.gene_score.v1";
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

export type AgeneticsToolResult = Record<string, unknown>;

export interface FilecoinUploadReceipt {
  schema: "agenetics.filecoin_upload.v1";
  manifest_path: string;
  uploads: Array<{
    name: string;
    path: string;
    piece_cid: string;
    size: number | null;
    complete: boolean | null;
    copies: unknown[];
  }>;
}

type PayloadFile = GeneFile & { content: string };

export async function createGeneAsset(input: {
  repo: string;
  agent: string;
  seller: AgentRef;
  evidenceDir?: string;
  key: string;
  outDir?: string;
}): Promise<GeneAsset> {
  const repo = path.resolve(input.repo);
  const outputRoot = input.outDir
    ? path.resolve(input.outDir)
    : path.join(repo, ".agenetics", "genes");
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
    schema: "agenetics.redaction_report.v1",
    checked: files.map((file) => file.path),
    blocked: [],
  };
  const redactionText = stableJson(redaction);
  const payload = {
    schema: "agenetics.encrypted_gene_payload.v1",
    files,
  };
  const encrypted = encrypt(Buffer.from(stableJson(payload), "utf8"), input.key);
  const encryptedText = stableJson(encrypted);
  const encryptedHash = sha256(encryptedText);
  const preview = {
    schema: "agenetics.gene_preview.v1",
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
    schema: "agenetics.gene_manifest.v1",
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
  const repo = path.resolve(input.repo);
  const files = await Promise.all(
    PROFILE_FILES.map(async (relativePath) => {
      const content = await readFile(path.join(repo, relativePath));
      return {
        path: relativePath,
        sha256: sha256(content),
        bytes: content.byteLength,
      };
    }),
  );
  return { status: "ready", files };
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
    schema: "agenetics.gene_score.v1",
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

export async function uploadGeneToFilecoin(input: {
  manifestPath: string;
  privateKey?: string;
  network?: "mainnet" | "calibration";
}): Promise<
  | { status: "configuration_required"; required_env: "PRIVATE_KEY" }
  | { status: "runtime_required"; required_node: ">=24"; current_node: string }
  | { status: "uploaded"; receipt: FilecoinUploadReceipt; path: string }
> {
  const privateKey = input.privateKey ?? process.env.PRIVATE_KEY;
  if (!privateKey) {
    return { status: "configuration_required", required_env: "PRIVATE_KEY" };
  }
  if (Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10) < 24) {
    return {
      status: "runtime_required",
      required_node: ">=24",
      current_node: process.versions.node,
    };
  }
  const [{ createCarFromPath, executeUpload, initializeSynapse }, { mainnet, calibration }, { default: pino }] =
    await Promise.all([import("filecoin-pin"), import("filecoin-pin/core/synapse"), import("pino")]);
  const chain = input.network === "calibration" ? calibration : mainnet;
  const synapse = await initializeSynapse({ privateKey: normalizePrivateKey(privateKey), chain });
  const root = path.dirname(input.manifestPath);
  const { carPath, rootCid } = await createCarFromPath(root, { isDirectory: true });
  const carData = await readFile(carPath);
  const result = await executeUpload(synapse, carData, rootCid, {
    logger: pino({ level: "silent" }),
    contextId: "agenetics-gene",
    metadata: { source: "agenetics", manifest: path.basename(input.manifestPath) },
  });
  const receipt: FilecoinUploadReceipt = {
    schema: "agenetics.filecoin_upload.v1",
    manifest_path: input.manifestPath,
    uploads: [
      {
        name: "gene_artifact",
        path: root,
        piece_cid: result.pieceCid,
        size: result.size,
        complete: result.complete,
        copies: result.copies,
      },
    ],
  };
  const receiptPath = path.join(root, "filecoin-upload.json");
  await writeFile(receiptPath, stableJson(receipt));
  return { status: "uploaded", receipt, path: receiptPath };
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
      "# Agenetics Gene Review",
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

export function planExchangeRound(agents: string[]): Array<{ buyer: string; seller: string }> {
  if (agents.length < 2) {
    throw new Error("exchange round requires at least two agents");
  }
  return agents.map((buyer, index) => ({
    buyer,
    seller: agents[(index + 1) % agents.length] as string,
  }));
}

export async function invokeAgeneticsTool(
  name: string,
  args: Record<string, unknown>,
): Promise<AgeneticsToolResult> {
  switch (name) {
    case "inspect_openclaw_profile": {
      const profile = await inspectOpenclawProfile({ repo: stringArg(args, "repo") });
      return profile;
    }
    case "create_gene_asset": {
      const repo = stringArg(args, "repo");
      const agent = stringArg(args, "agent");
      const seller = agentRefArg(args.seller);
      if (args.confirm !== true) {
        return {
          status: "confirmation_required",
          action: "create_gene_asset",
          profile_files: [...PROFILE_FILES],
          repo,
          agent,
          next_action: "call create_gene_asset again with confirm:true",
        };
      }
      const asset = await createGeneAsset({
        repo,
        agent,
        seller,
        key: stringArg(args, "key"),
        evidenceDir: optionalStringArg(args, "evidenceDir"),
        outDir: optionalStringArg(args, "outDir"),
      });
      return {
        status: "created",
        gene_id: asset.manifest.gene_id,
        manifest_path: asset.paths.manifest,
        encrypted_payload_ref: asset.manifest.encrypted_payload_ref,
        files: asset.manifest.files,
      };
    }
    case "score_gene_asset": {
      const score = await scoreGeneAsset({
        manifestPath: stringArg(args, "manifestPath"),
        evidenceDir: optionalStringArg(args, "evidenceDir"),
        valuationNote: optionalStringArg(args, "valuationNote"),
      });
      return { status: "scored", score_path: score.path, report: score.report };
    }
    case "verify_gene_delivery": {
      const verification = await verifyGeneAsset({
        manifestPath: stringArg(args, "manifestPath"),
        key: stringArg(args, "key"),
      });
      return { status: verification.ok ? "verified" : "failed", ...verification };
    }
    case "upload_gene_to_filecoin": {
      if (args.confirm !== true) {
        return {
          status: "confirmation_required",
          action: "upload_gene_to_filecoin",
          manifest_path: stringArg(args, "manifestPath"),
          next_action: "call upload_gene_to_filecoin again with confirm:true",
        };
      }
      return uploadGeneToFilecoin({
        manifestPath: stringArg(args, "manifestPath"),
        privateKey: optionalStringArg(args, "privateKey"),
        network: networkArg(args),
      });
    }
    case "prepare_gene_breed": {
      if (args.confirm !== true) {
        return {
          status: "confirmation_required",
          action: "prepare_gene_breed",
          out: stringArg(args, "out"),
          next_action: "call prepare_gene_breed again with confirm:true",
        };
      }
      const exported = await exportGeneAsset({
        manifestPath: stringArg(args, "manifestPath"),
        key: stringArg(args, "key"),
        out: stringArg(args, "out"),
      });
      return { status: "exported_for_review", ...exported };
    }
    case "plan_exchange_round": {
      const agents = arrayArg(args, "agents");
      return { status: "planned", round: planExchangeRound(agents) };
    }
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

export function createAgeneticsServer(): Server {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (request.method !== "POST" || !url.pathname.startsWith("/tool/")) {
        sendJson(response, 404, { status: "error", error: "route not found" });
        return;
      }
      const toolName = url.pathname.slice("/tool/".length);
      const args = await readRequestJson(request);
      const result = await invokeAgeneticsTool(toolName, args);
      sendJson(response, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(response, 400, { status: "error", error: message });
    }
  });
}

interface EncryptedPayload {
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
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

function normalizePrivateKey(key: string): `0x${string}` {
  const prefixed = key.startsWith("0x") ? key : `0x${key}`;
  return prefixed as `0x${string}`;
}

function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function stableJson(value: unknown): string {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
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

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function hashDirectory(dir: string, base: string): Promise<Array<{ path: string; sha256: string; bytes: number }>> {
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

async function readIgnore(repo: string): Promise<string[]> {
  try {
    const text = await readFile(path.join(repo, ".ageneticsignore"), "utf8");
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

function gitValue(repo: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function stringArg(args: Record<string, unknown>, name: string): string {
  const value = args[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalStringArg(args: Record<string, unknown>, name: string): string | undefined {
  const value = args[name];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

function agentRefArg(value: unknown): AgentRef {
  if (!value || typeof value !== "object") {
    throw new Error("seller is required");
  }
  const seller = value as Record<string, unknown>;
  if (typeof seller.agentRegistry !== "string" || typeof seller.agentId !== "string") {
    throw new Error("seller.agentRegistry and seller.agentId are required");
  }
  return { agentRegistry: seller.agentRegistry, agentId: seller.agentId };
}

function arrayArg(args: Record<string, unknown>, name: string): string[] {
  const value = args[name];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${name} must be a string array`);
  }
  return value as string[];
}

function networkArg(args: Record<string, unknown>): "mainnet" | "calibration" | undefined {
  const value = args.network;
  if (value === undefined) {
    return undefined;
  }
  if (value !== "mainnet" && value !== "calibration") {
    throw new Error("network must be mainnet or calibration");
  }
  return value;
}

async function readRequestJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.byteLength;
    if (bytes > 1_000_000) {
      throw new Error("request body too large");
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) {
    return {};
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(stableJson(body));
}
