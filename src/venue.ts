import { type ExecutionProof, type TradeExperience, executionProofSchema } from "./schemas.js";
import { type PublicTradeSummary, sha256, stableJson } from "./shared.js";

export function createExecutionProof(input: {
  trade: TradeExperience;
  decoderId: string;
  decoderKey: string;
}): ExecutionProof {
  const unsigned = {
    schema: "agentex.execution_proof.v1",
    chain_id: input.trade.chain_id,
    whitelisted_venue_id: input.trade.whitelisted_venue_id,
    trade_tx_hash: input.trade.trade_tx_hash,
    pair: input.trade.pair,
    side: input.trade.side,
    size: input.trade.size,
    fill_price: input.trade.fill_price,
    actual_fill_price: input.trade.fill_price,
    execution_block_number: input.trade.execution_block_number,
    execution_timestamp: input.trade.execution_timestamp,
    decoder_id: input.decoderId,
  };
  const executionProofHash = `0x${sha256(stableJson(unsigned))}`;
  return executionProofSchema.parse({
    ...unsigned,
    execution_proof_hash: executionProofHash,
    decoder_signature: signProof(executionProofHash, input.decoderKey),
  });
}

export function verifyExecutionProof(input: {
  proof: ExecutionProof;
  decoderKey: string;
  expected: PublicTradeSummary;
  toleranceBps?: number;
}): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (input.proof.decoder_signature !== signProof(input.proof.execution_proof_hash, input.decoderKey)) {
    errors.push("decoder signature mismatch");
  }
  for (const field of [
    "chain_id",
    "whitelisted_venue_id",
    "trade_tx_hash",
    "pair",
    "side",
    "size",
    "execution_block_number",
    "execution_timestamp",
  ] as const) {
    if (input.proof[field] !== input.expected[field]) {
      errors.push(`${field} mismatch`);
    }
  }
  const toleranceBps = input.toleranceBps ?? 50;
  const expectedPrice = Number(input.expected.fill_price);
  const actualPrice = Number(input.proof.actual_fill_price);
  const deltaBps = Math.abs(expectedPrice - actualPrice) / actualPrice * 10_000;
  if (!Number.isFinite(deltaBps) || deltaBps > toleranceBps) {
    errors.push("fill price outside tolerance");
  }
  if (input.proof.fill_price !== input.expected.fill_price) {
    errors.push("attested fill price mismatch");
  }
  return { ok: errors.length === 0, errors };
}

function signProof(hash: string, key: string): string {
  return `local-sig:${sha256(`${hash}:${key}`)}`;
}
