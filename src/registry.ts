import {
  type ExecutionProof,
  type ExperienceManifest,
  type RegistryAttestation,
  registryAttestationSchema,
} from "./schemas.js";
import { sha256, stableJson } from "./shared.js";

const acceptedAttestations = new Map<string, RegistryAttestation>();

export function prepareRegistryAttestation(input: {
  manifest: ExperienceManifest;
  executionProof: ExecutionProof;
  sellerNonce: string;
  attestationDeadline: string;
  registryAddress: string;
}): {
  attestation: RegistryAttestation;
  signable_payload: string;
  registry_calldata_preview: Record<string, unknown>;
} {
  const summary = input.manifest.public_trade_summary;
  const signablePayload = stableJson({
    seller_agent: input.manifest.seller_agent,
    experience_id: input.manifest.experience_id,
    trade_tx_hash: summary.trade_tx_hash,
    encrypted_experience_cid: input.manifest.encrypted_experience_cid,
    decrypted_experience_hash: input.manifest.decrypted_experience_hash,
    execution_proof_hash: input.executionProof.execution_proof_hash,
    seller_nonce: input.sellerNonce,
    registry: input.registryAddress,
  });
  const attestation = registryAttestationSchema.parse({
    schema: "agentex.registry_attestation.v1",
    seller_agent: input.manifest.seller_agent,
    chain_id: summary.chain_id,
    whitelisted_venue_id: summary.whitelisted_venue_id,
    trade_tx_hash: summary.trade_tx_hash,
    pair: summary.pair,
    side: summary.side,
    size: summary.size,
    fill_price: summary.fill_price,
    execution_block_number: summary.execution_block_number,
    execution_timestamp: summary.execution_timestamp,
    encrypted_experience_cid: input.manifest.encrypted_experience_cid,
    decrypted_experience_hash: input.manifest.decrypted_experience_hash,
    execution_proof_hash: input.executionProof.execution_proof_hash,
    attestation_timestamp: new Date("2026-05-18T10:02:00.000Z").toISOString(),
    attestation_deadline: input.attestationDeadline,
    seller_nonce: input.sellerNonce,
    seller_signature: `local-seller-sig:${sha256(signablePayload)}`,
    status: "pending",
  });
  return {
    attestation,
    signable_payload: signablePayload,
    registry_calldata_preview: {
      registry: input.registryAddress,
      method: "submitAttestation",
      trade_tx_hash: attestation.trade_tx_hash,
      execution_proof_hash: attestation.execution_proof_hash,
    },
  };
}

export async function submitRegistryAttestation(input: {
  attestation: RegistryAttestation;
  executionProof: ExecutionProof;
}): Promise<{
  status: "accepted" | "rejected" | "expired";
  attestation_id: string;
  registry_transaction_hash: string;
  attestation: RegistryAttestation;
}> {
  const key = `${input.attestation.seller_agent.agentRegistry}:${input.attestation.seller_agent.agentId}:${input.attestation.trade_tx_hash}`;
  const existing = acceptedAttestations.get(key);
  if (existing && existing.decrypted_experience_hash === input.attestation.decrypted_experience_hash) {
    const attestationId = `0x${sha256(stableJson(existing))}`;
    return {
      status: "accepted",
      attestation_id: attestationId,
      registry_transaction_hash: existing.registry_transaction_hash ?? `0x${sha256(`${attestationId}:tx`)}`,
      attestation: existing,
    };
  }
  if (existing) {
    throw new Error("conflicting attestation for seller trade");
  }
  if (new Date(input.attestation.attestation_timestamp) > new Date(input.attestation.attestation_deadline)) {
    return finalize(input.attestation, "expired");
  }
  for (const field of ["chain_id", "whitelisted_venue_id", "trade_tx_hash", "pair", "side", "size"] as const) {
    if (input.attestation[field] !== input.executionProof[field]) {
      return finalize(input.attestation, "rejected");
    }
  }
  if (input.attestation.execution_proof_hash !== input.executionProof.execution_proof_hash) {
    return finalize(input.attestation, "rejected");
  }
  const accepted = await finalize(input.attestation, "accepted");
  acceptedAttestations.set(key, accepted.attestation);
  return accepted;
}

async function finalize(
  attestation: RegistryAttestation,
  status: "accepted" | "rejected" | "expired",
): Promise<{
  status: "accepted" | "rejected" | "expired";
  attestation_id: string;
  registry_transaction_hash: string;
  attestation: RegistryAttestation;
}> {
  const attestationId = `0x${sha256(stableJson(attestation))}`;
  const registryTransactionHash = `0x${sha256(`${attestationId}:tx`)}`;
  return {
    status,
    attestation_id: attestationId,
    registry_transaction_hash: registryTransactionHash,
    attestation: {
      ...attestation,
      status,
      registry_transaction_hash: registryTransactionHash,
    },
  };
}
