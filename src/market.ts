import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  type AgentRef,
  type GeneFile,
  type GeneManifest,
  gitValue,
  hashProfileFiles,
  readJson,
  sha256,
  stableJson,
} from "./shared.js";

export interface MarketListing {
  schema: "agentex.market_listing.v1";
  listing_id: string;
  seller: AgentRef;
  manifest_ref: string;
  manifest_path: string;
  encrypted_payload_ref: string;
  score_report_ref: string;
  score_report_path: string;
  price_amount: string;
  payment_asset: string;
  escrow_framework: "arkhai_nla";
  escrow_demand: string;
  delivery_public_key_requirement: string;
  status: "draft" | "live" | "sold" | "cancelled" | "expired";
}

export interface PurchaseReceipt {
  schema: "agentex.purchase_receipt.v1";
  listing_id: string;
  buyer: AgentRef;
  seller: AgentRef;
  manifest_ref: string;
  manifest_path: string;
  encrypted_payload_ref: string;
  escrow_id: string;
  payment: {
    asset: string;
    amount: string;
    status: "escrowed" | "settled" | "refunded" | "failed";
  };
  buyer_delivery_public_key: string;
  key_envelope_hash: string;
  delivery_proof_hash: string;
  decryption_verification: VerificationStatus;
  storage_verification: VerificationStatus;
  identity_verification: VerificationStatus;
}

export interface BreedingReceipt {
  schema: "agentex.breeding_receipt.v1";
  type: "full_breed" | "selective_breed";
  buyer_agent: AgentRef;
  purchased_gene_id: string;
  purchased_manifest_ref: string;
  buyer_pre_breed_profile_hash: string;
  breeding_report_ref: string;
  resulting_profile_commit: string;
  resulting_file_hashes: GeneFile[];
}

interface VerificationStatus {
  status: "pending" | "local_verified" | "verified" | "failed";
  detail?: string;
}

export async function createGeneListing(input: {
  manifestPath: string;
  scorePath: string;
  priceAmount: string;
  paymentAsset: string;
  deliveryPublicKeyRequirement: string;
}): Promise<{ listing: MarketListing; path: string }> {
  const manifest = await readJson<GeneManifest>(input.manifestPath);
  const scoreText = await readFile(input.scorePath, "utf8");
  const manifestRef = `local:${manifest.gene_id}`;
  const escrowDemand = [
    "Release payment if the seller delivers a buyer-encrypted decryption key",
    `for gene ${manifest.gene_id}`,
    `with manifest ${manifestRef}`,
    `and payload ${manifest.encrypted_payload_ref}.`,
  ].join(" ");
  const listingId = sha256(
    stableJson({
      manifest_ref: manifestRef,
      seller: manifest.seller,
      price_amount: input.priceAmount,
      payment_asset: input.paymentAsset,
      score_report_sha256: sha256(scoreText),
    }),
  ).slice(0, 32);
  const listing: MarketListing = {
    schema: "agentex.market_listing.v1",
    listing_id: listingId,
    seller: manifest.seller,
    manifest_ref: manifestRef,
    manifest_path: input.manifestPath,
    encrypted_payload_ref: manifest.encrypted_payload_ref,
    score_report_ref: `local:${sha256(scoreText)}`,
    score_report_path: input.scorePath,
    price_amount: input.priceAmount,
    payment_asset: input.paymentAsset,
    escrow_framework: "arkhai_nla",
    escrow_demand: escrowDemand,
    delivery_public_key_requirement: input.deliveryPublicKeyRequirement,
    status: "live",
  };
  const listingPath = path.join(path.dirname(input.manifestPath), "listing.json");
  await writeFile(listingPath, stableJson(listing));
  return { listing, path: listingPath };
}

export async function inspectGeneListing(input: { listingPath: string }): Promise<MarketListing> {
  return readJson<MarketListing>(input.listingPath);
}

export async function createGenePurchase(input: {
  listingPath: string;
  buyer: AgentRef;
  escrowId: string;
  buyerDeliveryPublicKey: string;
  keyEnvelope: string;
  deliveryProof: string;
}): Promise<{ receipt: PurchaseReceipt; path: string }> {
  const listing = await inspectGeneListing({ listingPath: input.listingPath });
  if (listing.status !== "live") {
    throw new Error(`listing is not live: ${listing.status}`);
  }
  const receipt: PurchaseReceipt = {
    schema: "agentex.purchase_receipt.v1",
    listing_id: listing.listing_id,
    buyer: input.buyer,
    seller: listing.seller,
    manifest_ref: listing.manifest_ref,
    manifest_path: listing.manifest_path,
    encrypted_payload_ref: listing.encrypted_payload_ref,
    escrow_id: input.escrowId,
    payment: {
      asset: listing.payment_asset,
      amount: listing.price_amount,
      status: "escrowed",
    },
    buyer_delivery_public_key: input.buyerDeliveryPublicKey,
    key_envelope_hash: sha256(input.keyEnvelope),
    delivery_proof_hash: sha256(input.deliveryProof),
    decryption_verification: { status: "pending" },
    storage_verification: { status: "local_verified", detail: listing.manifest_ref },
    identity_verification: { status: "pending", detail: listing.seller.agentId },
  };
  const receiptPath = path.join(path.dirname(input.listingPath), `purchase-${input.buyer.agentId}.json`);
  await writeFile(receiptPath, stableJson(receipt));
  return { receipt, path: receiptPath };
}

export async function recordGeneBreeding(input: {
  purchaseReceiptPath: string;
  buyerRepo: string;
  buyer: AgentRef;
  type: BreedingReceipt["type"];
  preBreedProfileHash: string;
  breedingReportRef?: string;
}): Promise<{ receipt: BreedingReceipt; path: string }> {
  const purchase = await readJson<PurchaseReceipt>(input.purchaseReceiptPath);
  const manifest = await readJson<GeneManifest>(purchase.manifest_path);
  const resultingFiles = await hashProfileFiles(input.buyerRepo);
  const resultingCommit = gitValue(input.buyerRepo, ["rev-parse", "HEAD"]);
  if (!resultingCommit) {
    throw new Error("buyer repo must have a resulting profile commit");
  }
  const receipt: BreedingReceipt = {
    schema: "agentex.breeding_receipt.v1",
    type: input.type,
    buyer_agent: input.buyer,
    purchased_gene_id: manifest.gene_id,
    purchased_manifest_ref: purchase.manifest_ref,
    buyer_pre_breed_profile_hash: input.preBreedProfileHash,
    breeding_report_ref:
      input.breedingReportRef ?? `local:${sha256(stableJson({ purchase: purchase.listing_id, files: resultingFiles }))}`,
    resulting_profile_commit: resultingCommit,
    resulting_file_hashes: resultingFiles,
  };
  const receiptPath = path.join(path.dirname(input.purchaseReceiptPath), `breeding-${input.buyer.agentId}.json`);
  await writeFile(receiptPath, stableJson(receipt));
  return { receipt, path: receiptPath };
}
