import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { stableJson } from "./shared.js";

export interface FilecoinUploadReceipt {
  schema: "agentex.filecoin_upload.v1";
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
    contextId: "agentex-gene",
    metadata: { source: "agentex", manifest: path.basename(input.manifestPath) },
  });
  const receipt: FilecoinUploadReceipt = {
    schema: "agentex.filecoin_upload.v1",
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

function normalizePrivateKey(key: string): `0x${string}` {
  const prefixed = key.startsWith("0x") ? key : `0x${key}`;
  return prefixed as `0x${string}`;
}
