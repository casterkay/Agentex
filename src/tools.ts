import { readFile } from "node:fs/promises";

import { AOMI_TOOL_NAMES, buildAomiManifest } from "./aomi.js";
import { uploadExperienceToFilecoin } from "./filecoin.js";
import {
  createTradeExperienceAsset,
  inspectOpenclawActivity,
  prepareExperienceIngestion,
  previewTradeExperienceSale,
} from "./experience.js";
import {
  collectExperiencePayment,
  createExperienceListing,
  createExperiencePurchase,
  inspectExperienceListing,
  recordExperienceFeedback,
  requestExperienceArbitration,
  submitExperienceFulfillment,
  verifyExperienceDelivery,
} from "./market.js";
import { prepareRegistryAttestation, submitRegistryAttestation } from "./registry.js";
import { createExecutionProof } from "./venue.js";
import { type AgentRef, readJson } from "./shared.js";
import { type ExecutionProof, type ExperienceManifest, type TradeExperience } from "./schemas.js";
import { listArkhaiEscrows } from "./arkhai.js";

export type AgentexToolResult = Record<string, unknown>;

export function planExchangeRound(agents: string[]): Array<{ buyer: string; seller: string }> {
  if (agents.length < 2) {
    throw new Error("exchange round requires at least two agents");
  }
  return agents.map((buyer, index) => ({
    buyer,
    seller: agents[(index + 1) % agents.length] as string,
  }));
}

export async function invokeAgentexTool(name: string, args: Record<string, unknown>): Promise<AgentexToolResult> {
  switch (name) {
    case "get_market_state":
      return {
        status: "ready",
        aomi_tools: AOMI_TOOL_NAMES,
        manifest: buildAomiManifest(),
        round: args.agents === undefined ? undefined : planExchangeRound(arrayArg(args, "agents")),
        summary: await readOptionalSummary(),
      };
    case "inspect_trade_activity":
      return inspectOpenclawActivity({
        activityPath: stringArg(args, "activityPath"),
        memoryPath: optionalStringArg(args, "memoryPath"),
      });
    case "prepare_experience_sale":
      return {
        ...(await previewTradeExperienceSale({
        activityPath: stringArg(args, "activityPath"),
        memoryPath: stringArg(args, "memoryPath"),
        sellerAgent: agentRefArg(args.sellerAgent, "sellerAgent"),
        priceAmount: stringArg(args, "priceAmount"),
        paymentAsset: stringArg(args, "paymentAsset"),
        outDir: optionalStringArg(args, "outDir"),
        })),
      };
    case "publish_experience_sale": {
      if (args.confirm !== true) {
        return {
          status: "confirmation_required",
          action: name,
          activity_path: stringArg(args, "activityPath"),
          next_action: `call ${name} again with confirm:true`,
        };
      }
      const asset = await createTradeExperienceAsset({
        activityPath: stringArg(args, "activityPath"),
        memoryPath: stringArg(args, "memoryPath"),
        sellerAgent: agentRefArg(args.sellerAgent, "sellerAgent"),
        key: stringArg(args, "key"),
        outDir: optionalStringArg(args, "outDir"),
      });
      const upload =
        args.live === true
          ? await uploadExperienceToFilecoin({
              manifestPath: asset.paths.manifest,
              privateKey: optionalStringArg(args, "privateKey"),
              network: networkArg(args),
            })
          : undefined;
      const manifest =
        args.live === true ? await readJson<ExperienceManifest>(asset.paths.manifest) : asset.manifest;
      const proof = createExecutionProof({
        trade: asset.experience,
        decoderId: stringArg(args, "decoderId"),
        decoderKey: stringArg(args, "decoderKey"),
      });
      const prepared = prepareRegistryAttestation({
        manifest,
        executionProof: proof,
        sellerNonce: stringArg(args, "sellerNonce"),
        attestationDeadline: stringArg(args, "attestationDeadline"),
        registryAddress: stringArg(args, "registryAddress"),
      });
      const accepted = await submitRegistryAttestation({
        attestation: prepared.attestation,
        executionProof: proof,
      });
      const listing = await createExperienceListing({
        manifestPath: asset.paths.manifest,
        attestationId: accepted.attestation_id,
        priceAmount: stringArg(args, "priceAmount"),
        paymentAsset: stringArg(args, "paymentAsset"),
        mode: args.live === true ? "live" : "local",
      });
      return {
        status: "published",
        experience_id: asset.experience.experience_id,
        manifest_path: asset.paths.manifest,
        ...(upload ? { upload } : {}),
        proof,
        attestation: accepted,
        listing,
      };
    }
    case "evaluate_experience_listing": {
      const listing = await inspectExperienceListing({ listingPath: stringArg(args, "listingPath") });
      return {
        status: "ready",
        listing,
        proof_bindings: {
          attestation_id: listing.attestation_id,
          encrypted_experience_cid: listing.encrypted_experience_cid,
          decrypted_experience_hash: listing.decrypted_experience_hash,
        },
        next_step_hint: "call purchase_experience_access with confirm:true only after payment and delivery terms are acceptable",
      };
    }
    case "purchase_experience_access":
      if (args.confirm !== true) {
        return {
          status: "confirmation_required",
          action: name,
          listing_path: stringArg(args, "listingPath"),
          next_action: `call ${name} again with confirm:true`,
          SYSTEM_NEXT_ACTION: {
            type: "settlement_confirmation",
            preserve_args: args,
          },
        };
      }
      return createExperiencePurchase({
        listingPath: stringArg(args, "listingPath"),
        buyerAgent: agentRefArg(args.buyerAgent, "buyerAgent"),
        filecoinPayReference: stringArg(args, "filecoinPayReference"),
        escrowId: optionalStringArg(args, "escrowId"),
        keyEnvelope: stringArg(args, "keyEnvelope"),
        deliveryProof: stringArg(args, "deliveryProof"),
      });
    case "verify_and_ingest_experience": {
      const verified = await verifyExperienceDelivery({
        purchaseReceiptPath: stringArg(args, "purchaseReceiptPath"),
        key: stringArg(args, "key"),
      });
      if (args.confirm !== true) {
        return {
          status: "confirmation_required",
          action: name,
          purchase_receipt_path: stringArg(args, "purchaseReceiptPath"),
          decryption_verification_result: verified.receipt.decryption_verification_result,
          next_action: `call ${name} again with confirm:true to write the verified import`,
        };
      }
      const ingestion = await prepareExperienceIngestion({
        purchaseReceiptPath: verified.path,
        buyerRepo: stringArg(args, "buyerRepo"),
        key: stringArg(args, "key"),
        confirm: true,
      });
      return { status: "verified_and_ingested", receipt: verified.receipt, ingestion };
    }
    case "inspect_openclaw_activity":
      return inspectOpenclawActivity({
        activityPath: stringArg(args, "activityPath"),
        memoryPath: optionalStringArg(args, "memoryPath"),
      });
    case "extract_trade_experience":
    case "encrypt_trade_experience": {
      if (args.confirm !== true) {
        return {
          status: "confirmation_required",
          action: name,
          activity_path: stringArg(args, "activityPath"),
          next_action: `call ${name} again with confirm:true`,
        };
      }
      const asset = await createTradeExperienceAsset({
        activityPath: stringArg(args, "activityPath"),
        memoryPath: stringArg(args, "memoryPath"),
        sellerAgent: agentRefArg(args.sellerAgent, "sellerAgent"),
        key: stringArg(args, "key"),
        outDir: optionalStringArg(args, "outDir"),
      });
      return {
        status: "created",
        experience_id: asset.experience.experience_id,
        manifest_path: asset.paths.manifest,
        encrypted_experience_cid: asset.manifest.encrypted_experience_cid,
      };
    }
    case "upload_experience_to_filecoin":
      if (args.confirm !== true) {
        return {
          status: "confirmation_required",
          action: name,
          manifest_path: stringArg(args, "manifestPath"),
          risk: "uploads encrypted artifact metadata to public Filecoin/IPFS storage",
          next_action: `call ${name} again with confirm:true`,
        };
      }
      return uploadExperienceToFilecoin({
        manifestPath: stringArg(args, "manifestPath"),
        privateKey: optionalStringArg(args, "privateKey"),
        network: networkArg(args),
      });
    case "create_execution_proof":
      return {
        status: "created",
        proof: createExecutionProof({
          trade: (await readJson<TradeExperience>(stringArg(args, "experiencePath"))),
          decoderId: stringArg(args, "decoderId"),
          decoderKey: stringArg(args, "decoderKey"),
        }),
      };
    case "prepare_registry_attestation": {
      const prepared = prepareRegistryAttestation({
        manifest: await readJson<ExperienceManifest>(stringArg(args, "manifestPath")),
        executionProof: await readJson<ExecutionProof>(stringArg(args, "executionProofPath")),
        sellerNonce: stringArg(args, "sellerNonce"),
        attestationDeadline: stringArg(args, "attestationDeadline"),
        registryAddress: stringArg(args, "registryAddress"),
      });
      return { status: "prepared", ...prepared };
    }
    case "submit_registry_attestation":
      if (args.confirm !== true) {
        return {
          status: "confirmation_required",
          action: name,
          next_action: `call ${name} again with confirm:true`,
        };
      }
      return submitRegistryAttestation({
        attestation: await readJson(stringArg(args, "attestationPath")),
        executionProof: await readJson(stringArg(args, "executionProofPath")),
      });
    case "create_experience_listing":
      if (args.confirm !== true) {
        return {
          status: "confirmation_required",
          action: name,
          manifest_path: stringArg(args, "manifestPath"),
          next_action: `call ${name} again with confirm:true`,
        };
      }
      return createExperienceListing({
        manifestPath: stringArg(args, "manifestPath"),
        attestationId: stringArg(args, "attestationId"),
        priceAmount: stringArg(args, "priceAmount"),
        paymentAsset: stringArg(args, "paymentAsset"),
        mode: args.live === true ? "live" : "local",
      });
    case "inspect_experience_listing":
      return { status: "ready", listing: await inspectExperienceListing({ listingPath: stringArg(args, "listingPath") }) };
    case "create_experience_purchase":
    case "create_arkhai_escrow":
      if (args.confirm !== true) {
        return {
          status: "confirmation_required",
          action: name,
          listing_path: stringArg(args, "listingPath"),
          next_action: `call ${name} again with confirm:true`,
        };
      }
      return createExperiencePurchase({
        listingPath: stringArg(args, "listingPath"),
        buyerAgent: agentRefArg(args.buyerAgent, "buyerAgent"),
        filecoinPayReference: stringArg(args, "filecoinPayReference"),
        escrowId: optionalStringArg(args, "escrowId"),
        keyEnvelope: stringArg(args, "keyEnvelope"),
        deliveryProof: stringArg(args, "deliveryProof"),
      });
    case "submit_experience_fulfillment":
      if (args.confirm !== true) {
        return {
          status: "confirmation_required",
          action: name,
          purchase_receipt_path: stringArg(args, "purchaseReceiptPath"),
          next_action: `call ${name} again with confirm:true`,
        };
      }
      return submitExperienceFulfillment({
        purchaseReceiptPath: stringArg(args, "purchaseReceiptPath"),
        keyEnvelope: stringArg(args, "keyEnvelope"),
        deliveryProof: stringArg(args, "deliveryProof"),
      });
    case "verify_experience_delivery":
      return verifyExperienceDelivery({
        purchaseReceiptPath: stringArg(args, "purchaseReceiptPath"),
        key: stringArg(args, "key"),
      });
    case "request_experience_arbitration":
      if (args.confirm !== true) {
        return {
          status: "confirmation_required",
          action: name,
          purchase_receipt_path: stringArg(args, "purchaseReceiptPath"),
          next_action: `call ${name} again with confirm:true`,
        };
      }
      return requestExperienceArbitration({
        purchaseReceiptPath: stringArg(args, "purchaseReceiptPath"),
      });
    case "collect_experience_payment":
      if (args.confirm !== true) {
        return {
          status: "confirmation_required",
          action: name,
          purchase_receipt_path: stringArg(args, "purchaseReceiptPath"),
          next_action: `call ${name} again with confirm:true`,
        };
      }
      return collectExperiencePayment({
        purchaseReceiptPath: stringArg(args, "purchaseReceiptPath"),
      });
    case "inspect_arkhai_market":
      return { status: "ready", ...(await listArkhaiEscrows()) };
    case "prepare_experience_ingestion":
      return prepareExperienceIngestion({
        purchaseReceiptPath: stringArg(args, "purchaseReceiptPath"),
        buyerRepo: stringArg(args, "buyerRepo"),
        key: stringArg(args, "key"),
        confirm: args.confirm === true,
      });
    case "record_experience_feedback":
      return recordExperienceFeedback({
        purchaseReceiptPath: stringArg(args, "purchaseReceiptPath"),
        score: numberArg(args, "score"),
        note: optionalStringArg(args, "note"),
      });
    case "plan_exchange_round":
      return { status: "planned", round: planExchangeRound(arrayArg(args, "agents")) };
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

async function readOptionalSummary(): Promise<unknown | undefined> {
  for (const filePath of ["demo/live-output/summary.json", "demo/local-output/summary.json"]) {
    try {
      return JSON.parse(await readFile(filePath, "utf8")) as unknown;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }
  return undefined;
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

function numberArg(args: Record<string, unknown>, name: string): number {
  const value = args[name];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${name} must be a number`);
  }
  return value;
}

function arrayArg(args: Record<string, unknown>, name: string): string[] {
  const value = args[name];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${name} must be a string array`);
  }
  return value as string[];
}

function agentRefArg(value: unknown, name: string): AgentRef {
  if (!value || typeof value !== "object") {
    throw new Error(`${name} is required`);
  }
  const ref = value as Record<string, unknown>;
  if (typeof ref.agentRegistry !== "string" || typeof ref.agentId !== "string") {
    throw new Error(`${name}.agentRegistry and ${name}.agentId are required`);
  }
  return { agentRegistry: ref.agentRegistry, agentId: ref.agentId };
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
