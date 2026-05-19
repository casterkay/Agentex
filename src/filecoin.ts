import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { type ExperienceManifest } from "./schemas.js";
import { readJson, stableJson } from "./shared.js";

export interface FilecoinUploadReceipt {
  schema: "agentex.filecoin_upload.v1";
  manifest_path: string;
  encrypted_experience_cid: string;
  root_cid: string;
  uploads: Array<{
    name: string;
    path: string;
    piece_cid: string;
    size: number | null;
    complete: boolean | null;
    copies: unknown[];
  }>;
}

export interface FilecoinUploadResultInput {
  manifestPath: string;
  rootCid: string;
  pieceCid: string;
  size: number | null;
  complete: boolean | null;
  copies: unknown[];
}

export interface FilecoinUploadBundle {
  bundlePath: string;
  encryptedPath: string;
}

export async function uploadExperienceToFilecoin(input: {
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
    return { status: "runtime_required", required_node: ">=24", current_node: process.versions.node };
  }
  const bundle = await prepareFilecoinUploadBundle(input.manifestPath);
  const encrypted = await readFile(bundle.encryptedPath);
  const [{ createCarFromPath, executeUpload, initializeSynapse }, { mainnet, calibration }, { default: pino }] =
    await Promise.all([import("filecoin-pin"), import("filecoin-pin/core/synapse"), import("pino")]);
  try {
    const chain = input.network === "calibration" ? calibration : mainnet;
    const synapse = await initializeSynapse({ privateKey: normalizePrivateKey(privateKey), chain });
    const { carPath, rootCid } = await createCarFromPath(bundle.bundlePath, { isDirectory: true });
    const carData = await readFile(carPath);
    const result = await executeUpload(synapse, carData, rootCid, {
      logger: pino({ level: "silent" }),
      contextId: "agentex-experience",
      metadata: { source: "agentex", manifest: path.basename(input.manifestPath) },
    });
    return applyFilecoinUploadResult({
      manifestPath: input.manifestPath,
      rootCid: String(rootCid),
      pieceCid: result.pieceCid,
      size: result.size ?? encrypted.byteLength,
      complete: result.complete,
      copies: result.copies,
    });
  } finally {
    await rm(bundle.bundlePath, { recursive: true, force: true });
  }
}

export async function prepareFilecoinUploadBundle(manifestPath: string): Promise<FilecoinUploadBundle> {
  const artifactDir = path.dirname(manifestPath);
  const bundlePath = await mkdtemp(path.join(tmpdir(), "agentex-filecoin-"));
  const encryptedPath = path.join(bundlePath, "experience.enc.json");
  await copyFile(path.join(artifactDir, "experience.enc.json"), encryptedPath);
  await copyFile(manifestPath, path.join(bundlePath, "manifest.json"));
  await copyFile(path.join(artifactDir, "redaction.json"), path.join(bundlePath, "redaction.json"));
  await copyOptionalFile(path.join(artifactDir, "execution-proof.json"), path.join(bundlePath, "execution-proof.json"));
  return { bundlePath, encryptedPath };
}

export async function applyFilecoinUploadResult(input: FilecoinUploadResultInput): Promise<{
  status: "uploaded";
  receipt: FilecoinUploadReceipt;
  path: string;
}> {
  const manifest = await readJson<ExperienceManifest>(input.manifestPath);
  const encryptedPath = path.join(path.dirname(input.manifestPath), "experience.enc.json");
  const encrypted = await readFile(encryptedPath);
  const receipt: FilecoinUploadReceipt = {
    schema: "agentex.filecoin_upload.v1",
    manifest_path: input.manifestPath,
    encrypted_experience_cid: input.rootCid,
    root_cid: input.rootCid,
    uploads: [
      {
        name: "encrypted_experience_artifact",
        path: encryptedPath,
        piece_cid: input.pieceCid,
        size: input.size ?? encrypted.byteLength,
        complete: input.complete,
        copies: input.copies,
      },
    ],
  };
  const updatedManifest: ExperienceManifest = {
    ...manifest,
    encrypted_experience_cid: input.rootCid,
    storage_proof_fields: {
      provider: "filecoin-pin",
      status: input.complete === true ? "verified" : "uploaded",
      root_cid: input.rootCid,
      piece_cid: input.pieceCid,
      size: input.size ?? encrypted.byteLength,
      complete: input.complete,
      copies: input.copies,
    },
  };
  const receiptPath = path.join(path.dirname(input.manifestPath), "filecoin-upload.json");
  await writeFile(input.manifestPath, stableJson(updatedManifest));
  await writeFile(receiptPath, stableJson(receipt));
  return { status: "uploaded", receipt, path: receiptPath };
}

function normalizePrivateKey(key: string): `0x${string}` {
  return (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`;
}

async function copyOptionalFile(source: string, destination: string): Promise<void> {
  try {
    await copyFile(source, destination);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
