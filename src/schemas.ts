import { z } from "zod";

export const agentRefSchema = z.object({
  agentRegistry: z.string().min(1),
  agentId: z.string().min(1),
});

export const sideSchema = z.enum(["buy", "sell"]);

export const publicTradeSummarySchema = z.object({
  chain_id: z.number().int().positive(),
  whitelisted_venue_id: z.string().min(1),
  trade_tx_hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  pair: z.string().min(3),
  side: sideSchema,
  size: z.string().min(1),
  fill_price: z.string().min(1),
  execution_block_number: z.number().int().positive(),
  execution_timestamp: z.string().datetime(),
});

export const tradeExperienceSchema = publicTradeSummarySchema.extend({
  schema: z.literal("agentex.trade_experience.v1"),
  experience_id: z.string().min(16),
  seller_agent: agentRefSchema,
  pre_trade_context_timestamp: z.string().datetime(),
  pre_trade_market_context: z.string().min(1),
  pre_trade_reasoning: z.string().min(1),
  post_trade_reflection_timestamp: z.string().datetime(),
  post_trade_reflection: z.string().min(1),
  source_memory_path: z.string().optional(),
});

export const redactionReportSchema = z.object({
  schema: z.literal("agentex.redaction_report.v1"),
  checked: z.array(z.string()),
  blocked: z.array(z.string()),
});

export const executionProofSchema = publicTradeSummarySchema.extend({
  schema: z.literal("agentex.execution_proof.v1"),
  actual_fill_price: z.string().min(1),
  decoder_id: z.string().min(1),
  execution_proof_hash: z.string().regex(/^0x[a-f0-9]{64}$/),
  decoder_signature: z.string().min(1),
});

export const experienceManifestSchema = z.object({
  schema: z.literal("agentex.experience_manifest.v1"),
  experience_id: z.string().min(16),
  seller_agent: agentRefSchema,
  chain_id: z.number().int().positive(),
  whitelisted_venue_id: z.string().min(1),
  trade_tx_hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  public_trade_summary: publicTradeSummarySchema,
  encrypted_experience_cid: z.string().min(1),
  encrypted_experience_hash: z.string().regex(/^[a-f0-9]{64}$/),
  decrypted_experience_hash: z.string().regex(/^[a-f0-9]{64}$/),
  execution_proof_hash: z.string().optional(),
  storage_proof_fields: z.record(z.string(), z.unknown()),
  redaction_report_hash: z.string().regex(/^[a-f0-9]{64}$/),
  attestation_registry: z.string().min(1),
  attestation_id: z.string().optional(),
});

export const registryAttestationSchema = z.object({
  schema: z.literal("agentex.registry_attestation.v1"),
  seller_agent: agentRefSchema,
  chain_id: z.number().int().positive(),
  whitelisted_venue_id: z.string().min(1),
  trade_tx_hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  pair: z.string().min(3),
  side: sideSchema,
  size: z.string().min(1),
  fill_price: z.string().min(1),
  execution_block_number: z.number().int().positive(),
  execution_timestamp: z.string().datetime(),
  encrypted_experience_cid: z.string().min(1),
  decrypted_experience_hash: z.string().regex(/^[a-f0-9]{64}$/),
  execution_proof_hash: z.string().regex(/^0x[a-f0-9]{64}$/),
  attestation_timestamp: z.string().datetime(),
  attestation_deadline: z.string().datetime(),
  seller_nonce: z.string().min(1),
  seller_signature: z.string().min(1),
  registry_transaction_hash: z.string().optional(),
  status: z.enum(["pending", "accepted", "rejected", "expired"]),
});

export const marketListingSchema = z.object({
  schema: z.literal("agentex.market_listing.v1"),
  listing_id: z.string().min(16),
  seller_agent: agentRefSchema,
  attestation_id: z.string().min(1),
  experience_id: z.string().min(16),
  encrypted_experience_cid: z.string().min(1),
  decrypted_experience_hash: z.string().regex(/^[a-f0-9]{64}$/),
  public_trade_summary: publicTradeSummarySchema,
  price_amount: z.string().min(1),
  payment_asset: z.string().min(1),
  settlement_framework: z.literal("arkhai_nla"),
  settlement_demand: z.string().min(1),
  delivery_requirement: z.string().min(1),
  status: z.enum(["draft", "live", "sold", "cancelled", "expired"]),
});

export const purchaseReceiptSchema = z.object({
  schema: z.literal("agentex.purchase_receipt.v1"),
  purchase_id: z.string().min(16),
  listing_id: z.string().min(16),
  buyer_agent: agentRefSchema,
  seller_agent: agentRefSchema,
  attestation_id: z.string().min(1),
  encrypted_experience_cid: z.string().min(1),
  decrypted_experience_hash: z.string().regex(/^[a-f0-9]{64}$/),
  payment_asset: z.string().min(1),
  payment_amount: z.string().min(1),
  payment_status: z.enum(["escrowed", "settled", "refunded", "failed"]),
  escrow_id: z.string().min(1),
  filecoin_pay_reference: z.string().min(1),
  key_envelope_hash: z.string().regex(/^[a-f0-9]{64}$/),
  delivery_proof_hash: z.string().regex(/^[a-f0-9]{64}$/),
  decryption_verification_result: z.object({ status: z.string(), detail: z.string().optional() }),
  storage_verification_result: z.object({ status: z.string(), detail: z.string().optional() }),
  identity_verification_result: z.object({ status: z.string(), detail: z.string().optional() }),
  manifest_path: z.string().min(1),
});

export const qualityReportSchema = z.object({
  schema: z.literal("agentex.experience_quality.v1"),
  experience_id: z.string().min(16),
  attestation_id: z.string().min(1),
  deterministic_metrics: z.record(z.string(), z.unknown()),
  deterministic_score: z.number(),
  scoring_formula_version: z.string().min(1),
  declared_post_trade_horizons: z.array(z.string()),
  valuation_note: z.string().optional(),
});

export type TradeExperience = z.infer<typeof tradeExperienceSchema>;
export type ExperienceManifest = z.infer<typeof experienceManifestSchema>;
export type ExecutionProof = z.infer<typeof executionProofSchema>;
export type RegistryAttestation = z.infer<typeof registryAttestationSchema>;
export type MarketListing = z.infer<typeof marketListingSchema>;
export type PurchaseReceipt = z.infer<typeof purchaseReceiptSchema>;
