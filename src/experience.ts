import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  type ExperienceManifest,
  type PurchaseReceipt,
  type TradeExperience,
  experienceManifestSchema,
  redactionReportSchema,
  tradeExperienceSchema,
} from "./schemas.js";
import { type AgentRef, localRef, readJson, sha256, stableJson } from "./shared.js";

const DENIED_PATTERNS = [
  /private[_-]?key/i,
  /api[_-]?key/i,
  /secret/i,
  /token\s*=/i,
  /BEGIN [A-Z ]*PRIVATE KEY/i,
  /seed phrase/i,
  /mnemonic/i,
];

interface EncryptedPayload {
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
}

export interface TradeExperienceAsset {
  experience: TradeExperience;
  manifest: ExperienceManifest;
  redaction: {
    schema: "agentex.redaction_report.v1";
    checked: string[];
    blocked: string[];
  };
  paths: {
    root: string;
    plaintextExperience: string;
    encryptedExperience: string;
    manifest: string;
    redaction: string;
  };
}

export interface TradeExperienceSalePreview {
  status: "prepared";
  action: "publish_experience_sale";
  experience_id: string;
  seller_agent: AgentRef;
  public_trade_summary: TradeExperienceAsset["manifest"]["public_trade_summary"];
  output_dir: string;
  listing_terms: {
    price_amount: string;
    payment_asset: string;
  };
  redaction: TradeExperienceAsset["redaction"];
  risks: string[];
  required_confirmation: "call publish_experience_sale with confirm:true";
}

export async function inspectOpenclawActivity(input: { activityPath: string; memoryPath?: string }): Promise<{
  status: "ready";
  trades: number;
  activity_path: string;
  memory_path?: string;
}> {
  const activity = await readJson<{ trades?: unknown[] }>(input.activityPath);
  return {
    status: "ready",
    trades: Array.isArray(activity.trades) ? activity.trades.length : 0,
    activity_path: input.activityPath,
    ...(input.memoryPath ? { memory_path: input.memoryPath } : {}),
  };
}

export async function previewTradeExperienceSale(input: {
  activityPath: string;
  memoryPath: string;
  sellerAgent: AgentRef;
  priceAmount: string;
  paymentAsset: string;
  outDir?: string;
}): Promise<TradeExperienceSalePreview> {
  const experience = await buildTradeExperience({
    activityPath: input.activityPath,
    memoryPath: input.memoryPath,
    sellerAgent: input.sellerAgent,
  });
  const redaction = inspectRedaction(experience);
  const outputDir = path.resolve(input.outDir ?? path.join(path.dirname(input.activityPath), "..", ".agentex", experience.experience_id));
  return {
    status: "prepared",
    action: "publish_experience_sale",
    experience_id: experience.experience_id,
    seller_agent: input.sellerAgent,
    public_trade_summary: publicTradeSummary(experience),
    output_dir: outputDir,
    listing_terms: {
      price_amount: input.priceAmount,
      payment_asset: input.paymentAsset,
    },
    redaction,
    risks: [
      "publishing writes encrypted experience artifacts",
      "live publishing may upload encrypted artifacts to public Filecoin/IPFS storage",
      "registry attestation and settlement actions may require funded wallets",
    ],
    required_confirmation: "call publish_experience_sale with confirm:true",
  };
}

export async function createTradeExperienceAsset(input: {
  activityPath: string;
  memoryPath: string;
  sellerAgent: AgentRef;
  key: string;
  outDir?: string;
}): Promise<TradeExperienceAsset> {
  const experience = await buildTradeExperience(input);
  const redaction = inspectRedaction(experience);
  if (redaction.blocked.length > 0) {
    throw new Error(`redaction failed: ${redaction.blocked.join(", ")}`);
  }

  const plaintext = stableJson(experience);
  const encryptedText = stableJson(encrypt(Buffer.from(plaintext, "utf8"), input.key));
  const redactionText = stableJson(redaction);
  const root = path.resolve(input.outDir ?? path.join(path.dirname(input.activityPath), "..", ".agentex", experience.experience_id));
  await mkdir(root, { recursive: true });

  const manifest = experienceManifestSchema.parse({
    schema: "agentex.experience_manifest.v1",
    experience_id: experience.experience_id,
    seller_agent: input.sellerAgent,
    chain_id: experience.chain_id,
    whitelisted_venue_id: experience.whitelisted_venue_id,
    trade_tx_hash: experience.trade_tx_hash,
    public_trade_summary: publicTradeSummary(experience),
    encrypted_experience_cid: localRef(encryptedText),
    encrypted_experience_hash: sha256(encryptedText),
    decrypted_experience_hash: sha256(plaintext),
    storage_proof_fields: { provider: "local", status: "verified" },
    redaction_report_hash: sha256(redactionText),
    attestation_registry: "local",
  });

  const paths = {
    root,
    plaintextExperience: path.join(root, "experience.json"),
    encryptedExperience: path.join(root, "experience.enc.json"),
    manifest: path.join(root, "manifest.json"),
    redaction: path.join(root, "redaction.json"),
  };
  await writeFile(paths.plaintextExperience, plaintext);
  await writeFile(paths.encryptedExperience, encryptedText);
  await writeFile(paths.manifest, stableJson(manifest));
  await writeFile(paths.redaction, redactionText);
  return { experience, manifest, redaction, paths };
}

export async function verifyExperiencePayload(input: { manifestPath: string; key: string }): Promise<{
  ok: boolean;
  experience?: TradeExperience;
  decrypted_hash?: string;
  errors: string[];
}> {
  const manifest = await readJson<ExperienceManifest>(input.manifestPath);
  const encrypted = await readJson<EncryptedPayload>(path.join(path.dirname(input.manifestPath), "experience.enc.json"));
  let plaintext: string;
  try {
    plaintext = decrypt(encrypted, input.key).toString("utf8");
  } catch {
    return { ok: false, errors: ["encrypted experience could not be decrypted"] };
  }
  const hash = sha256(plaintext);
  if (hash !== manifest.decrypted_experience_hash) {
    return { ok: false, decrypted_hash: hash, errors: ["decrypted experience hash mismatch"] };
  }
  return { ok: true, experience: tradeExperienceSchema.parse(JSON.parse(plaintext)), decrypted_hash: hash, errors: [] };
}

export async function prepareExperienceIngestion(input: {
  purchaseReceiptPath: string;
  buyerRepo: string;
  key: string;
  confirm?: boolean;
}): Promise<{ status: "confirmation_required"; path: string } | { status: "ingestion_prepared"; path: string }> {
  const receipt = await readJson<PurchaseReceipt>(input.purchaseReceiptPath);
  const outDir = path.join(input.buyerRepo, ".openclaw", "imports", "agentex");
  const outPath = path.join(outDir, `${receipt.purchase_id}.json`);
  if (input.confirm !== true) {
    return { status: "confirmation_required", path: outPath };
  }
  const verified = await verifyExperiencePayload({ manifestPath: receipt.manifest_path, key: input.key });
  if (!verified.ok || !verified.experience) {
    throw new Error(`delivery verification failed: ${verified.errors.join("; ")}`);
  }
  await mkdir(outDir, { recursive: true });
  await writeFile(
    outPath,
    stableJson({
      schema: "agentex.experience_ingestion.v1",
      purchase_id: receipt.purchase_id,
      seller_agent: receipt.seller_agent,
      listing_id: receipt.listing_id,
      verified_decrypted_hash: verified.decrypted_hash,
      experience: verified.experience,
    }),
  );
  return { status: "ingestion_prepared", path: outPath };
}

function publicTradeSummary(experience: TradeExperience): TradeExperienceAsset["manifest"]["public_trade_summary"] {
  return {
    chain_id: experience.chain_id,
    whitelisted_venue_id: experience.whitelisted_venue_id,
    trade_tx_hash: experience.trade_tx_hash,
    pair: experience.pair,
    side: experience.side,
    size: experience.size,
    fill_price: experience.fill_price,
    execution_block_number: experience.execution_block_number,
    execution_timestamp: experience.execution_timestamp,
  };
}

async function buildTradeExperience(input: {
  activityPath: string;
  memoryPath: string;
  sellerAgent: AgentRef;
}): Promise<TradeExperience> {
  const activity = await readJson<{ trades?: unknown[] }>(input.activityPath);
  if (!Array.isArray(activity.trades) || activity.trades.length !== 1) {
    throw new Error("activity must contain exactly one trade");
  }
  const rawTrade = activity.trades[0] as Record<string, unknown>;
  const memoryPath = path.relative(path.dirname(path.dirname(input.memoryPath)), input.memoryPath);
  return tradeExperienceSchema.parse({
    schema: "agentex.trade_experience.v1",
    experience_id: sha256(stableJson({ seller: input.sellerAgent, trade: rawTrade })).slice(0, 32),
    seller_agent: input.sellerAgent,
    source_memory_path: memoryPath.startsWith("..") ? input.memoryPath : memoryPath,
    ...rawTrade,
  });
}

function inspectRedaction(experience: TradeExperience): TradeExperienceAsset["redaction"] {
  const checked = [
    "pre_trade_market_context",
    "pre_trade_reasoning",
    "post_trade_reflection",
    "source_memory_path",
  ];
  const blocked = checked.filter((field) => {
    const value = String((experience as unknown as Record<string, unknown>)[field] ?? "");
    return DENIED_PATTERNS.some((pattern) => pattern.test(value));
  });
  return redactionReportSchema.parse({ schema: "agentex.redaction_report.v1", checked, blocked });
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
