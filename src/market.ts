import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  type ExperienceManifest,
  type MarketListing,
  type PurchaseReceipt,
  marketListingSchema,
  purchaseReceiptSchema,
} from "./schemas.js";
import { readJson, sha256, stableJson } from "./shared.js";
import { verifyExperiencePayload } from "./experience.js";
import { createArkhaiSettlementClient, type ArkhaiSettlementClient } from "./arkhai.js";

export async function createExperienceListing(input: {
  manifestPath: string;
  attestationId: string;
  priceAmount: string;
  paymentAsset: string;
  mode?: "local" | "live";
}): Promise<{ listing: MarketListing; path: string }> {
  const manifest = await readJson<ExperienceManifest>(input.manifestPath);
  if (input.mode === "live") {
    assertFilecoinStorageProof(manifest);
  }
  const listing = marketListingSchema.parse({
    schema: "agentex.market_listing.v1",
    listing_id: sha256(stableJson({ manifest: manifest.experience_id, attestation: input.attestationId })).slice(0, 32),
    seller_agent: manifest.seller_agent,
    attestation_id: input.attestationId,
    experience_id: manifest.experience_id,
    encrypted_experience_cid: manifest.encrypted_experience_cid,
    decrypted_experience_hash: manifest.decrypted_experience_hash,
    public_trade_summary: manifest.public_trade_summary,
    price_amount: input.priceAmount,
    payment_asset: input.paymentAsset,
    settlement_framework: "arkhai_nla",
    settlement_demand: [
      "Release payment if the seller delivers decryption access that unlocks",
      manifest.encrypted_experience_cid,
      "and produces plaintext whose SHA-256 hash matches",
      manifest.decrypted_experience_hash,
    ].join(" "),
    delivery_requirement: "buyer receives decryption access for the exact encrypted CID and decrypted hash",
    status: "live",
  });
  const listingPath = path.join(path.dirname(input.manifestPath), "listing.json");
  await writeFile(listingPath, stableJson(listing));
  return { listing, path: listingPath };
}

function assertFilecoinStorageProof(manifest: ExperienceManifest): void {
  const storage = manifest.storage_proof_fields;
  if (
    manifest.encrypted_experience_cid.startsWith("local:") ||
    storage.provider !== "filecoin-pin" ||
    storage.status !== "verified" ||
    typeof storage.root_cid !== "string" ||
    storage.root_cid.length === 0 ||
    storage.root_cid !== manifest.encrypted_experience_cid ||
    typeof storage.piece_cid !== "string" ||
    storage.piece_cid.length === 0
  ) {
    throw new Error("Filecoin storage proof required before live listing");
  }
}

export async function inspectExperienceListing(input: { listingPath: string }): Promise<MarketListing> {
  return marketListingSchema.parse(await readJson<MarketListing>(input.listingPath));
}

export async function createExperiencePurchase(input: {
  listingPath: string;
  buyerAgent: PurchaseReceipt["buyer_agent"];
  filecoinPayReference: string;
  escrowId?: string;
  keyEnvelope: string;
  deliveryProof: string;
  arkhaiClient?: ArkhaiSettlementClient;
}): Promise<{ receipt: PurchaseReceipt; path: string }> {
  const listing = await inspectExperienceListing({ listingPath: input.listingPath });
  const arkhaiClient = input.arkhaiClient ?? createArkhaiSettlementClient();
  const escrow = input.escrowId
    ? {
        escrowUid: input.escrowId,
        escrowTransactionHash: undefined,
        arbitrationStatus: "not_requested" as const,
        collectionStatus: "not_collectible" as const,
      }
    : await arkhaiClient.createEscrow({
        listing,
        buyerAgent: input.buyerAgent,
        filecoinPayReference: input.filecoinPayReference,
      });
  const receipt = purchaseReceiptSchema.parse({
    schema: "agentex.purchase_receipt.v1",
    purchase_id: sha256(stableJson({ listing: listing.listing_id, buyer: input.buyerAgent })).slice(0, 32),
    listing_id: listing.listing_id,
    buyer_agent: input.buyerAgent,
    seller_agent: listing.seller_agent,
    attestation_id: listing.attestation_id,
    encrypted_experience_cid: listing.encrypted_experience_cid,
    decrypted_experience_hash: listing.decrypted_experience_hash,
    payment_asset: listing.payment_asset,
    payment_amount: listing.price_amount,
    payment_status: "escrowed",
    settlement_provider: "arkhai",
    escrow_id: escrow.escrowUid,
    escrow_uid: escrow.escrowUid,
    ...(escrow.escrowTransactionHash ? { escrow_transaction_hash: escrow.escrowTransactionHash } : {}),
    arbitration_status: escrow.arbitrationStatus,
    collection_status: escrow.collectionStatus,
    filecoin_pay_reference: input.filecoinPayReference,
    key_envelope_hash: sha256(input.keyEnvelope),
    delivery_proof_hash: sha256(input.deliveryProof),
    decryption_verification_result: { status: "pending" },
    storage_verification_result: { status: "local_verified", detail: listing.encrypted_experience_cid },
    identity_verification_result: { status: "local_verified", detail: listing.seller_agent.agentId },
    manifest_path: path.join(path.dirname(input.listingPath), "manifest.json"),
  });
  const receiptPath = path.join(path.dirname(input.listingPath), `purchase-${input.buyerAgent.agentId}.json`);
  await writeFile(receiptPath, stableJson(receipt));
  return { receipt, path: receiptPath };
}

export async function submitExperienceFulfillment(input: {
  purchaseReceiptPath: string;
  keyEnvelope: string;
  deliveryProof: string;
  arkhaiClient?: ArkhaiSettlementClient;
}): Promise<{ receipt: PurchaseReceipt; path: string }> {
  const receipt = purchaseReceiptSchema.parse(await readJson<PurchaseReceipt>(input.purchaseReceiptPath));
  const keyEnvelopeHash = sha256(input.keyEnvelope);
  const deliveryProofHash = sha256(input.deliveryProof);
  if (receipt.key_envelope_hash !== keyEnvelopeHash) {
    throw new Error("key envelope does not match purchase receipt");
  }
  if (receipt.delivery_proof_hash !== deliveryProofHash) {
    throw new Error("delivery proof does not match purchase receipt");
  }
  const fulfillment = await (input.arkhaiClient ?? createArkhaiSettlementClient()).submitFulfillment({
    receipt,
    keyEnvelopeHash,
    deliveryProofHash,
  });
  const next = purchaseReceiptSchema.parse({
    ...receipt,
    fulfillment_uid: fulfillment.fulfillmentUid,
    fulfillment_transaction_hash: fulfillment.fulfillmentTransactionHash,
    arbitration_status: fulfillment.arbitrationStatus,
    collection_status: fulfillment.collectionStatus,
  });
  await writeFile(input.purchaseReceiptPath, stableJson(next));
  return { receipt: next, path: input.purchaseReceiptPath };
}

export async function requestExperienceArbitration(input: {
  purchaseReceiptPath: string;
  arkhaiClient?: ArkhaiSettlementClient;
}): Promise<{ receipt: PurchaseReceipt; path: string }> {
  const receipt = purchaseReceiptSchema.parse(await readJson<PurchaseReceipt>(input.purchaseReceiptPath));
  if (!receipt.fulfillment_uid) {
    throw new Error("purchase has no fulfillment UID");
  }
  const approved = receipt.decryption_verification_result.status === "verified";
  const arbitration = await (input.arkhaiClient ?? createArkhaiSettlementClient()).requestArbitration({
    receipt,
    approved,
  });
  const paymentStatus =
    arbitration.arbitrationStatus === "approved" ? "settled" : arbitration.arbitrationStatus === "rejected" ? "failed" : receipt.payment_status;
  const next = purchaseReceiptSchema.parse({
    ...receipt,
    payment_status: paymentStatus,
    arbitration_status: arbitration.arbitrationStatus,
    arbitration_transaction_hash: arbitration.arbitrationTransactionHash,
    collection_status: arbitration.collectionStatus,
  });
  await writeFile(input.purchaseReceiptPath, stableJson(next));
  return { receipt: next, path: input.purchaseReceiptPath };
}

export async function collectExperiencePayment(input: {
  purchaseReceiptPath: string;
  arkhaiClient?: ArkhaiSettlementClient;
}): Promise<{ receipt: PurchaseReceipt; path: string }> {
  const receipt = purchaseReceiptSchema.parse(await readJson<PurchaseReceipt>(input.purchaseReceiptPath));
  if (!receipt.fulfillment_uid) {
    throw new Error("purchase has no fulfillment UID");
  }
  const collection = await (input.arkhaiClient ?? createArkhaiSettlementClient()).collect({
    escrowUid: receipt.escrow_uid,
    fulfillmentUid: receipt.fulfillment_uid,
  });
  const next = purchaseReceiptSchema.parse({
    ...receipt,
    collection_status: collection.collectionStatus,
    collection_transaction_hash: collection.collectionTransactionHash,
  });
  await writeFile(input.purchaseReceiptPath, stableJson(next));
  return { receipt: next, path: input.purchaseReceiptPath };
}

export async function verifyExperienceDelivery(input: {
  purchaseReceiptPath: string;
  key: string;
}): Promise<{ receipt: PurchaseReceipt; path: string }> {
  const receipt = purchaseReceiptSchema.parse(await readJson<PurchaseReceipt>(input.purchaseReceiptPath));
  const verified = await verifyExperiencePayload({ manifestPath: receipt.manifest_path, key: input.key });
  const next = purchaseReceiptSchema.parse({
    ...receipt,
    decryption_verification_result: {
      status: verified.ok ? "verified" : "failed",
      detail: verified.ok ? verified.decrypted_hash : verified.errors.join("; "),
    },
  });
  await writeFile(input.purchaseReceiptPath, stableJson(next));
  return { receipt: next, path: input.purchaseReceiptPath };
}

export async function recordExperienceFeedback(input: {
  purchaseReceiptPath: string;
  score: number;
  note?: string;
}): Promise<{ feedback: Record<string, unknown>; path: string }> {
  const receipt = purchaseReceiptSchema.parse(await readJson<PurchaseReceipt>(input.purchaseReceiptPath));
  const feedback = {
    schema: "agentex.experience_feedback.v1",
    purchase_id: receipt.purchase_id,
    listing_id: receipt.listing_id,
    buyer_agent: receipt.buyer_agent,
    seller_agent: receipt.seller_agent,
    score: input.score,
    ...(input.note ? { note: input.note } : {}),
    created_at: "2026-05-18T10:10:00.000Z",
  };
  const feedbackPath = path.join(path.dirname(input.purchaseReceiptPath), `feedback-${receipt.buyer_agent.agentId}.json`);
  await mkdir(path.dirname(feedbackPath), { recursive: true });
  await writeFile(feedbackPath, stableJson(feedback));
  return { feedback, path: feedbackPath };
}
