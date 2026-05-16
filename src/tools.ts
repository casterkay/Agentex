import {
  createGeneAsset,
  exportGeneAsset,
  inspectOpenclawProfile,
  scoreGeneAsset,
  verifyGeneAsset,
} from "./gene.js";
import { uploadGeneToFilecoin } from "./filecoin.js";
import {
  type BreedingReceipt,
  createGeneListing,
  createGenePurchase,
  inspectGeneListing,
  recordGeneBreeding,
} from "./market.js";
import { type AgentRef, PROFILE_FILES } from "./shared.js";

export type AgeneticsToolResult = Record<string, unknown>;

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
      const seller = agentRefArg(args.seller, "seller");
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
    case "create_gene_listing": {
      const manifestPath = stringArg(args, "manifestPath");
      const scorePath = stringArg(args, "scorePath");
      if (args.confirm !== true) {
        return {
          status: "confirmation_required",
          action: "create_gene_listing",
          manifest_path: manifestPath,
          score_path: scorePath,
          next_action: "call create_gene_listing again with confirm:true",
        };
      }
      const listing = await createGeneListing({
        manifestPath,
        scorePath,
        priceAmount: stringArg(args, "priceAmount"),
        paymentAsset: stringArg(args, "paymentAsset"),
        deliveryPublicKeyRequirement: stringArg(args, "deliveryPublicKeyRequirement"),
      });
      return { status: "listed", listing_path: listing.path, listing: listing.listing };
    }
    case "inspect_gene_listing": {
      const listing = await inspectGeneListing({ listingPath: stringArg(args, "listingPath") });
      return { status: "ready", listing };
    }
    case "create_gene_purchase": {
      const listingPath = stringArg(args, "listingPath");
      const buyer = agentRefArg(args.buyer, "buyer");
      if (args.confirm !== true) {
        return {
          status: "confirmation_required",
          action: "create_gene_purchase",
          listing_path: listingPath,
          buyer,
          next_action: "call create_gene_purchase again with confirm:true",
        };
      }
      const purchase = await createGenePurchase({
        listingPath,
        buyer,
        escrowId: stringArg(args, "escrowId"),
        buyerDeliveryPublicKey: stringArg(args, "buyerDeliveryPublicKey"),
        keyEnvelope: stringArg(args, "keyEnvelope"),
        deliveryProof: stringArg(args, "deliveryProof"),
      });
      return { status: "purchased", purchase_path: purchase.path, receipt: purchase.receipt };
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
    case "record_gene_breeding": {
      const purchaseReceiptPath = stringArg(args, "purchaseReceiptPath");
      const buyer = agentRefArg(args.buyer, "buyer");
      if (args.confirm !== true) {
        return {
          status: "confirmation_required",
          action: "record_gene_breeding",
          purchase_receipt_path: purchaseReceiptPath,
          buyer,
          next_action: "call record_gene_breeding again with confirm:true",
        };
      }
      const breeding = await recordGeneBreeding({
        purchaseReceiptPath,
        buyerRepo: stringArg(args, "buyerRepo"),
        buyer,
        type: breedingTypeArg(args),
        preBreedProfileHash: stringArg(args, "preBreedProfileHash"),
        breedingReportRef: optionalStringArg(args, "breedingReportRef"),
      });
      return { status: "breeding_recorded", breeding_path: breeding.path, receipt: breeding.receipt };
    }
    case "plan_exchange_round": {
      const agents = arrayArg(args, "agents");
      return { status: "planned", round: planExchangeRound(agents) };
    }
    default:
      throw new Error(`unknown tool: ${name}`);
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

function breedingTypeArg(args: Record<string, unknown>): BreedingReceipt["type"] {
  const value = args.type;
  if (value !== "full_breed" && value !== "selective_breed") {
    throw new Error("type must be full_breed or selective_breed");
  }
  return value;
}
