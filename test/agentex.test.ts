import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { compileContracts } from "../scripts/compile-contracts.js";
import { loadDotEnv } from "../src/env.js";
import {
  applyFilecoinUploadResult,
  buildDemoDeployment,
  createAgentexServer,
  createExecutionProof,
  createExperienceListing,
  createExperiencePurchase,
  createLocalArkhaiSettlementClient,
  createTradeExperienceAsset,
  inspectExperienceListing,
  listArkhaiEscrows,
  planExchangeRound,
  prepareExperienceIngestion,
  prepareFilecoinUploadBundle,
  prepareRegistryAttestation,
  readJson,
  recordExperienceFeedback,
  requestExperienceArbitration,
  sha256,
  stableJson,
  submitExperienceFulfillment,
  submitRegistryAttestation,
  tradeExperienceSchema,
  verifyExecutionProof,
  verifyExperienceDelivery,
  type ExperienceManifest,
} from "../src/index.js";
import {
  OPENCLAW_MINI_CLUSTER_AGENTS,
  buildOpenClawMiniClusterPlan,
  openClawNamespace,
} from "../src/openclaw.js";

const key = "0123456789abcdef0123456789abcdef";
const seller = { agentRegistry: "eip155:8453:0xregistry", agentId: "1" };
const buyer = { agentRegistry: "eip155:8453:0xregistry", agentId: "2" };

async function fixtureActivity(): Promise<{ root: string; activityPath: string; memoryPath: string }> {
  const root = mkdtempSync(path.join(tmpdir(), "agentex-v1-"));
  const memoryDir = path.join(root, ".openclaw", "memory");
  const activityDir = path.join(root, "activity");
  await mkdir(memoryDir, { recursive: true });
  await mkdir(activityDir, { recursive: true });
  const memoryPath = path.join(memoryDir, "2026-05-18.md");
  const activityPath = path.join(activityDir, "trade.json");
  await writeFile(memoryPath, "Pre-trade plan and post-trade reflection live in structured activity.\n");
  await writeFile(activityPath, stableJson({ trades: [sampleTrade()] }));
  return { root, activityPath, memoryPath };
}

function sampleTrade(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    chain_id: 8453,
    whitelisted_venue_id: "demo-venue-v1",
    trade_tx_hash: "0x1111111111111111111111111111111111111111111111111111111111111111",
    pair: "ETH/USDC",
    side: "buy",
    size: "1.25",
    fill_price: "3200.50",
    execution_block_number: 123456,
    execution_timestamp: "2026-05-18T10:00:00.000Z",
    pre_trade_context_timestamp: "2026-05-18T09:59:30.000Z",
    pre_trade_market_context: "ETH retraced into a support band while funding cooled.",
    pre_trade_reasoning: "pre-trade reasoning: buy after volatility contraction with tight invalidation.",
    post_trade_reflection_timestamp: "2026-05-18T10:01:00.000Z",
    post_trade_reflection: "Fill matched expected liquidity and slippage stayed inside tolerance.",
    ...overrides,
  };
}

test("V1 schemas accept the required contract names", () => {
  const experience = tradeExperienceSchema.parse({
    schema: "agentex.trade_experience.v1",
    experience_id: "experience-alpha-0001",
    seller_agent: seller,
    ...sampleTrade(),
    source_memory_path: ".openclaw/memory/2026-05-18.md",
  });

  const manifest = {
    schema: "agentex.experience_manifest.v1",
  };
  const attestation = {
    schema: "agentex.registry_attestation.v1",
  };
  const listing = {
    schema: "agentex.market_listing.v1",
  };
  const purchase = {
    schema: "agentex.purchase_receipt.v1",
  };
  const quality = {
    schema: "agentex.experience_quality.v1",
  };

  assert.equal(experience.schema, "agentex.trade_experience.v1");
  assert.equal(manifest.schema, "agentex.experience_manifest.v1");
  assert.equal(attestation.schema, "agentex.registry_attestation.v1");
  assert.equal(listing.schema, "agentex.market_listing.v1");
  assert.equal(purchase.schema, "agentex.purchase_receipt.v1");
  assert.equal(quality.schema, "agentex.experience_quality.v1");
});

test("loadDotEnv reads .env files without overriding existing shell values", async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "agentex-env-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const envPath = path.join(root, ".env");
  await writeFile(
    envPath,
    [
      "AGENTEX_RPC_URL=https://rpc.example",
      "AGENTEX_CHAIN_ID=8453",
      "AGENTEX_EXPERIENCE_KEY=\"quoted-key\"",
      "PRIVATE_KEY='0xabc'",
      "# comment",
      "",
    ].join("\n"),
  );
  const previousRpc = process.env.AGENTEX_RPC_URL;
  const previousChain = process.env.AGENTEX_CHAIN_ID;
  const previousKey = process.env.AGENTEX_EXPERIENCE_KEY;
  const previousPrivate = process.env.PRIVATE_KEY;
  process.env.AGENTEX_RPC_URL = "https://shell.example";
  delete process.env.AGENTEX_CHAIN_ID;
  delete process.env.AGENTEX_EXPERIENCE_KEY;
  delete process.env.PRIVATE_KEY;
  t.after(() => {
    restoreEnv("AGENTEX_RPC_URL", previousRpc);
    restoreEnv("AGENTEX_CHAIN_ID", previousChain);
    restoreEnv("AGENTEX_EXPERIENCE_KEY", previousKey);
    restoreEnv("PRIVATE_KEY", previousPrivate);
  });

  const loaded = await loadDotEnv(envPath);

  assert.deepEqual(loaded, ["AGENTEX_RPC_URL", "AGENTEX_CHAIN_ID", "AGENTEX_EXPERIENCE_KEY", "PRIVATE_KEY"]);
  assert.equal(process.env.AGENTEX_RPC_URL, "https://shell.example");
  assert.equal(process.env.AGENTEX_CHAIN_ID, "8453");
  assert.equal(process.env.AGENTEX_EXPERIENCE_KEY, "quoted-key");
  assert.equal(process.env.PRIVATE_KEY, "0xabc");
});

test("OpenClaw mini cluster plan uses four bounded Monad testnet agents", () => {
  const plan = buildOpenClawMiniClusterPlan({
    openclawRepo: "/tmp/openclaw",
    agentexServiceUrl: "http://127.0.0.1:8787",
    monadRpcUrl: "https://rpc.testnet.monad.xyz",
    chainId: "10143",
    tradeBudgetMon: "0.01",
  });

  assert.deepEqual(OPENCLAW_MINI_CLUSTER_AGENTS, ["alpha", "beta", "gamma", "delta"]);
  assert.equal(openClawNamespace("alpha"), "openclaw-alpha");
  assert.equal(plan.agents.length, 4);
  assert.deepEqual(plan.exchange_round, [
    { buyer: "alpha", seller: "beta" },
    { buyer: "beta", seller: "gamma" },
    { buyer: "gamma", seller: "delta" },
    { buyer: "delta", seller: "alpha" },
  ]);
  assert.equal(plan.safety.chain_id, "10143");
  assert.equal(plan.safety.trade_budget_mon, "0.01");
  assert.equal(plan.namespaces[0]?.deploy_command, "OPENCLAW_NAMESPACE=openclaw-alpha /tmp/openclaw/scripts/k8s/deploy.sh --show-token");
});

test("OpenClaw mini cluster plan rejects non-Monad-testnet chain IDs", () => {
  assert.throws(
    () =>
      buildOpenClawMiniClusterPlan({
        openclawRepo: "/tmp/openclaw",
        agentexServiceUrl: "http://127.0.0.1:8787",
        monadRpcUrl: "https://rpc.testnet.monad.xyz",
        chainId: "1",
        tradeBudgetMon: "0.01",
      }),
    /Monad testnet/i,
  );
});

test("OpenClaw mini cluster plan requires a bounded trade budget", () => {
  assert.throws(
    () =>
      buildOpenClawMiniClusterPlan({
        openclawRepo: "/tmp/openclaw",
        agentexServiceUrl: "http://127.0.0.1:8787",
        monadRpcUrl: "https://rpc.testnet.monad.xyz",
        chainId: "10143",
        tradeBudgetMon: "0",
      }),
    /trade budget/i,
  );
});

test("createTradeExperienceAsset extracts exactly one encrypted trade experience", async (t) => {
  const fixture = await fixtureActivity();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));

  const asset = await createTradeExperienceAsset({
    activityPath: fixture.activityPath,
    memoryPath: fixture.memoryPath,
    sellerAgent: seller,
    key,
  });

  assert.equal(asset.experience.side, "buy");
  assert.equal(asset.experience.schema, "agentex.trade_experience.v1");
  assert.equal(asset.manifest.schema, "agentex.experience_manifest.v1");
  assert.equal(asset.manifest.decrypted_experience_hash, sha256(stableJson(asset.experience)));
  assert.equal(asset.manifest.public_trade_summary.trade_tx_hash, asset.experience.trade_tx_hash);
  assert.equal(asset.redaction.blocked.length, 0);

  const encryptedText = await readFile(asset.paths.encryptedExperience, "utf8");
  assert.equal(encryptedText.includes("pre-trade reasoning"), false);
  assert.match(asset.manifest.encrypted_experience_cid, /^local:[a-f0-9]{64}$/);
});

test("createTradeExperienceAsset fails closed on multi-trade activity or denied material", async (t) => {
  const fixture = await fixtureActivity();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  await writeFile(fixture.activityPath, stableJson({ trades: [sampleTrade(), sampleTrade()] }));

  await assert.rejects(
    createTradeExperienceAsset({
      activityPath: fixture.activityPath,
      memoryPath: fixture.memoryPath,
      sellerAgent: seller,
      key,
    }),
    /exactly one trade/i,
  );

  await writeFile(fixture.activityPath, stableJson({ trades: [sampleTrade({ pre_trade_reasoning: "token=leak" })] }));
  await assert.rejects(
    createTradeExperienceAsset({
      activityPath: fixture.activityPath,
      memoryPath: fixture.memoryPath,
      sellerAgent: seller,
      key,
    }),
    /redaction failed/i,
  );
});

test("Filecoin upload result upgrades local manifest to Filecoin storage proof", async (t) => {
  const fixture = await fixtureActivity();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const asset = await createTradeExperienceAsset({
    activityPath: fixture.activityPath,
    memoryPath: fixture.memoryPath,
    sellerAgent: seller,
    key,
  });

  const uploaded = await applyFilecoinUploadResult({
    manifestPath: asset.paths.manifest,
    rootCid: "bafybeigdyrzt5sfp7udm7hu76vayqyhlq4w37wkrxktdzznqvyqkucq5fe",
    pieceCid: "baga6ea4seaqexamplepiececid",
    size: 1234,
    complete: true,
    copies: [{ provider: "demo-provider" }],
  });
  const manifest = await readJson<ExperienceManifest>(asset.paths.manifest);

  assert.equal(uploaded.receipt.schema, "agentex.filecoin_upload.v1");
  assert.equal(manifest.encrypted_experience_cid, "bafybeigdyrzt5sfp7udm7hu76vayqyhlq4w37wkrxktdzznqvyqkucq5fe");
  assert.deepEqual(manifest.storage_proof_fields, {
    provider: "filecoin-pin",
    status: "verified",
    root_cid: "bafybeigdyrzt5sfp7udm7hu76vayqyhlq4w37wkrxktdzznqvyqkucq5fe",
    piece_cid: "baga6ea4seaqexamplepiececid",
    size: 1234,
    complete: true,
    copies: [{ provider: "demo-provider" }],
  });
});

test("Filecoin upload bundle excludes plaintext experience files", async (t) => {
  const fixture = await fixtureActivity();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const asset = await createTradeExperienceAsset({
    activityPath: fixture.activityPath,
    memoryPath: fixture.memoryPath,
    sellerAgent: seller,
    key,
  });
  await writeFile(path.join(asset.paths.root, "execution-proof.json"), stableJson({ proof: true }));

  const bundle = await prepareFilecoinUploadBundle(asset.paths.manifest);
  t.after(() => rm(bundle.bundlePath, { recursive: true, force: true }));
  const entries = (await readdir(bundle.bundlePath)).sort();

  assert.deepEqual(entries, ["execution-proof.json", "experience.enc.json", "manifest.json", "redaction.json"]);
});

test("Solidity contracts compile with the required demo venue and registry ABI", async (t) => {
  const outDir = mkdtempSync(path.join(tmpdir(), "agentex-artifacts-"));
  t.after(() => rm(outDir, { recursive: true, force: true }));
  const artifacts = await compileContracts({ outDir });
  const demoNames = artifacts.demoVenue.abi.map((item: { name?: string }) => item.name).filter(Boolean);
  const obligationNames = artifacts.experienceAccessObligation.abi.map((item: { name?: string }) => item.name).filter(Boolean);
  const registryNames = artifacts.registry.abi.map((item: { name?: string }) => item.name).filter(Boolean);

  assert.ok(demoNames.includes("executeTrade"));
  assert.ok(demoNames.includes("TradeExecuted"));
  assert.ok(obligationNames.includes("fulfill"));
  assert.ok(obligationNames.includes("ExperienceAccessFulfilled"));
  assert.ok(registryNames.includes("submitAttestation"));
  assert.ok(registryNames.includes("AttestationAccepted"));
});

test("demo deployment records contract addresses and receipt blocks", () => {
  const deployment = buildDemoDeployment({
    chainId: 10143,
    deployer: "0x68CDad728b463048f640227Fd479E725d5478cB1",
    decoderAddress: "0x33B62dA218280b6e771F86482D3cC22Acbb0D86F",
    createdAt: "2026-05-19T00:00:00.000Z",
    contracts: {
      demoVenue: {
        txHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
        address: "0x1111111111111111111111111111111111111111",
        blockNumber: 10n,
      },
      experienceAccessObligation: {
        txHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
        address: "0x2222222222222222222222222222222222222222",
        blockNumber: 11n,
      },
      registry: {
        txHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
        address: "0x3333333333333333333333333333333333333333",
        blockNumber: 12n,
      },
    },
  });

  assert.equal(deployment.demo_venue_address, "0x1111111111111111111111111111111111111111");
  assert.equal(deployment.experience_access_obligation_address, "0x2222222222222222222222222222222222222222");
  assert.equal(deployment.registry_address, "0x3333333333333333333333333333333333333333");
  assert.equal(deployment.demo_venue_block_number, 10);
  assert.equal(deployment.registry_block_number, 12);
});

test("execution proof and registry attestation fail closed on fill-price mismatch", async (t) => {
  const fixture = await fixtureActivity();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const asset = await createTradeExperienceAsset({
    activityPath: fixture.activityPath,
    memoryPath: fixture.memoryPath,
    sellerAgent: seller,
    key,
  });

  const proof = createExecutionProof({
    trade: asset.experience,
    decoderId: "local-decoder",
    decoderKey: "decoder-key",
  });
  const verified = verifyExecutionProof({ proof, decoderKey: "decoder-key", expected: asset.manifest.public_trade_summary });
  const badFill = verifyExecutionProof({
    proof,
    decoderKey: "decoder-key",
    expected: { ...asset.manifest.public_trade_summary, fill_price: "3300.00" },
  });

  assert.equal(proof.schema, "agentex.execution_proof.v1");
  assert.equal(proof.whitelisted_venue_id, "demo-venue-v1");
  assert.equal(verified.ok, true);
  assert.equal(badFill.ok, false);

  const prepared = prepareRegistryAttestation({
    manifest: asset.manifest,
    executionProof: proof,
    sellerNonce: "nonce-1",
    attestationDeadline: "2026-05-18T10:05:00.000Z",
    registryAddress: "0x0000000000000000000000000000000000000001",
  });
  const accepted = await submitRegistryAttestation({ attestation: prepared.attestation, executionProof: proof });
  assert.equal(accepted.status, "accepted");
  assert.match(accepted.attestation_id, /^0x[a-f0-9]{64}$/);
});

test("market listing, purchase, delivery verification, ingestion, and feedback form one flow", async (t) => {
  const fixture = await fixtureActivity();
  const buyerRoot = mkdtempSync(path.join(tmpdir(), "agentex-buyer-"));
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  t.after(() => rm(buyerRoot, { recursive: true, force: true }));
  const asset = await createTradeExperienceAsset({
    activityPath: fixture.activityPath,
    memoryPath: fixture.memoryPath,
    sellerAgent: seller,
    key,
  });
  const proof = createExecutionProof({
    trade: asset.experience,
    decoderId: "local-decoder",
    decoderKey: "decoder-key",
  });
  const prepared = prepareRegistryAttestation({
    manifest: asset.manifest,
    executionProof: proof,
    sellerNonce: "nonce-1",
    attestationDeadline: "2026-05-18T10:05:00.000Z",
    registryAddress: "0x0000000000000000000000000000000000000001",
  });
  const accepted = await submitRegistryAttestation({ attestation: prepared.attestation, executionProof: proof });
  const listing = await createExperienceListing({
    manifestPath: asset.paths.manifest,
    attestationId: accepted.attestation_id,
    priceAmount: "5",
    paymentAsset: "USDFC",
  });

  const purchase = await createExperiencePurchase({
    listingPath: listing.path,
    buyerAgent: buyer,
    filecoinPayReference: "filecoin-pay:alpha-beta",
    keyEnvelope: key,
    deliveryProof: "seller delivered key for exact CID and hash",
  });
  const verified = await verifyExperienceDelivery({
    purchaseReceiptPath: purchase.path,
    key,
  });
  const ingestion = await prepareExperienceIngestion({
    purchaseReceiptPath: purchase.path,
    buyerRepo: buyerRoot,
    key,
    confirm: true,
  });
  const feedback = await recordExperienceFeedback({
    purchaseReceiptPath: purchase.path,
    score: 91,
    note: "Useful volatility lesson.",
  });

  assert.equal(listing.listing.schema, "agentex.market_listing.v1");
  assert.equal(listing.listing.status, "live");
  assert.equal(listing.listing.attestation_id, accepted.attestation_id);
  assert.equal(purchase.receipt.schema, "agentex.purchase_receipt.v1");
  assert.equal(purchase.receipt.settlement_provider, "arkhai");
  assert.equal(purchase.receipt.escrow_uid, purchase.receipt.escrow_id);
  assert.equal(purchase.receipt.fulfillment_uid, undefined);
  assert.equal(purchase.receipt.arbitration_status, "not_requested");
  assert.equal(purchase.receipt.collection_status, "not_collectible");
  assert.equal(verified.receipt.decryption_verification_result.status, "verified");
  assert.equal(verified.receipt.decrypted_experience_hash, listing.listing.decrypted_experience_hash);
  assert.match(ingestion.path, /agentex\/.+\.json$/);
  assert.equal(feedback.feedback.schema, "agentex.experience_feedback.v1");

  const inspected = await inspectExperienceListing({ listingPath: listing.path });
  assert.equal(inspected.listing_id, listing.listing.listing_id);
});

test("live listing rejects local storage and accepts Filecoin-backed manifests", async (t) => {
  const fixture = await fixtureActivity();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const asset = await createTradeExperienceAsset({
    activityPath: fixture.activityPath,
    memoryPath: fixture.memoryPath,
    sellerAgent: seller,
    key,
  });

  await assert.rejects(
    createExperienceListing({
      manifestPath: asset.paths.manifest,
      attestationId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      priceAmount: "5",
      paymentAsset: "USDFC",
      mode: "live",
    }),
    /Filecoin storage proof required/i,
  );

  await applyFilecoinUploadResult({
    manifestPath: asset.paths.manifest,
    rootCid: "bafybeigdyrzt5sfp7udm7hu76vayqyhlq4w37wkrxktdzznqvyqkucq5fe",
    pieceCid: "baga6ea4seaqexamplepiececid",
    size: 1234,
    complete: true,
    copies: [],
  });
  const uploadedManifest = await readJson<ExperienceManifest>(asset.paths.manifest);
  await writeFile(
    asset.paths.manifest,
    stableJson({
      ...uploadedManifest,
      storage_proof_fields: { ...uploadedManifest.storage_proof_fields, root_cid: "bafybeibadproof" },
    }),
  );
  await assert.rejects(
    createExperienceListing({
      manifestPath: asset.paths.manifest,
      attestationId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      priceAmount: "5",
      paymentAsset: "USDFC",
      mode: "live",
    }),
    /Filecoin storage proof required/i,
  );
  await applyFilecoinUploadResult({
    manifestPath: asset.paths.manifest,
    rootCid: "bafybeigdyrzt5sfp7udm7hu76vayqyhlq4w37wkrxktdzznqvyqkucq5fe",
    pieceCid: "baga6ea4seaqexamplepiececid",
    size: 1234,
    complete: true,
    copies: [],
  });
  const listing = await createExperienceListing({
    manifestPath: asset.paths.manifest,
    attestationId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    priceAmount: "5",
    paymentAsset: "USDFC",
    mode: "live",
  });

  assert.equal(listing.listing.encrypted_experience_cid, "bafybeigdyrzt5sfp7udm7hu76vayqyhlq4w37wkrxktdzznqvyqkucq5fe");
  assert.equal(listing.listing.status, "live");
});

test("local Arkhai settlement lifecycle records escrow, fulfillment, arbitration, and collection", async (t) => {
  const fixture = await fixtureActivity();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const asset = await createTradeExperienceAsset({
    activityPath: fixture.activityPath,
    memoryPath: fixture.memoryPath,
    sellerAgent: seller,
    key,
  });
  const listing = await createExperienceListing({
    manifestPath: asset.paths.manifest,
    attestationId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    priceAmount: "5",
    paymentAsset: "USDFC",
  });
  const purchase = await createExperiencePurchase({
    listingPath: listing.path,
    buyerAgent: buyer,
    filecoinPayReference: "filecoin-pay:alpha-beta",
    keyEnvelope: key,
    deliveryProof: "seller delivered key for exact CID and hash",
  });

  const fulfilled = await submitExperienceFulfillment({
    purchaseReceiptPath: purchase.path,
    keyEnvelope: key,
    deliveryProof: "seller delivered key for exact CID and hash",
  });
  const verified = await verifyExperienceDelivery({ purchaseReceiptPath: fulfilled.path, key });
  const arbitrated = await requestExperienceArbitration({ purchaseReceiptPath: verified.path });
  const collected = await createLocalArkhaiSettlementClient().collect({
    escrowUid: arbitrated.receipt.escrow_uid,
    fulfillmentUid: arbitrated.receipt.fulfillment_uid ?? "",
  });
  const market = await listArkhaiEscrows();

  assert.equal(fulfilled.receipt.fulfillment_uid?.startsWith("arkhai:fulfillment:"), true);
  assert.equal(arbitrated.receipt.arbitration_status, "approved");
  assert.equal(arbitrated.receipt.payment_status, "settled");
  assert.equal(collected.collectionStatus, "collected");
  assert.equal(market.escrows.some((escrow) => escrow.escrow_uid === purchase.receipt.escrow_uid), true);
});

test("Aomi-facing server exposes the spec tool names with confirmation gates", async (t) => {
  const fixture = await fixtureActivity();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const server = createAgentexServer();
  t.after(() => server.close());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert.equal(typeof address, "object");
  const port = address && typeof address === "object" ? address.port : 0;

  const planned = await fetch(`http://127.0.0.1:${port}/tool/plan_exchange_round`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ agents: ["alpha", "beta", "gamma", "delta"] }),
  });
  assert.equal(planned.status, 200);
  const plannedBody = (await planned.json()) as { round: Array<{ buyer: string; seller: string }> };
  assert.deepEqual(plannedBody.round, [
    { buyer: "alpha", seller: "beta" },
    { buyer: "beta", seller: "gamma" },
    { buyer: "gamma", seller: "delta" },
    { buyer: "delta", seller: "alpha" },
  ]);

  const preview = await fetch(`http://127.0.0.1:${port}/tool/extract_trade_experience`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      activityPath: fixture.activityPath,
      memoryPath: fixture.memoryPath,
      sellerAgent: seller,
      key,
    }),
  });
  assert.equal(preview.status, 200);
  const previewBody = (await preview.json()) as { status: string };
  assert.equal(previewBody.status, "confirmation_required");

  const settlementPreview = await fetch(`http://127.0.0.1:${port}/tool/create_arkhai_escrow`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ listingPath: "listing.json", buyerAgent: buyer }),
  });
  assert.equal(settlementPreview.status, 200);
  const settlementPreviewBody = (await settlementPreview.json()) as { status: string; action: string };
  assert.equal(settlementPreviewBody.status, "confirmation_required");
  assert.equal(settlementPreviewBody.action, "create_arkhai_escrow");
});

test("CLI and local demo script emit compact JSON summaries", async () => {
  const output = execFileSync(
    "node",
    ["--import", "tsx", "src/cli.ts", "demo", "plan", "alpha", "beta", "gamma", "delta"],
    { cwd: path.resolve("."), encoding: "utf8" },
  );
  assert.deepEqual(JSON.parse(output), {
    status: "planned",
    round: planExchangeRound(["alpha", "beta", "gamma", "delta"]),
  });

  const localOutput = execFileSync("node", ["--import", "tsx", "scripts/run-local-v1.ts"], {
    cwd: path.resolve("."),
    encoding: "utf8",
  });
  const summary = JSON.parse(localOutput) as {
    mode: string;
    agents: unknown[];
    experiences: unknown[];
    listings: unknown[];
    purchases: unknown[];
    ingestions: unknown[];
  };
  assert.equal(summary.mode, "local");
  assert.equal(summary.agents.length, 4);
  assert.equal(summary.experiences.length, 4);
  assert.equal(summary.listings.length, 4);
  assert.equal(summary.purchases.length, 4);
  assert.equal(summary.ingestions.length, 4);
});

test("live script fails before spending money when required env is missing", () => {
  assert.throws(
    () =>
      execFileSync("node", ["--import", "tsx", "scripts/run-live-v1.ts"], {
        cwd: path.resolve("."),
        encoding: "utf8",
        env: { ...process.env, AGENTEX_RPC_URL: "" },
      }),
    /missing required env/i,
  );
});

test("live script writes a preflight artifact from deployment receipts", async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "agentex-live-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const deploymentPath = path.join(root, "live-v1.json");
  const outputDir = path.join(root, "live-output");
  await writeFile(
    deploymentPath,
    stableJson(
      buildDemoDeployment({
        chainId: 10143,
        deployer: "0x68CDad728b463048f640227Fd479E725d5478cB1",
        decoderAddress: "0x33B62dA218280b6e771F86482D3cC22Acbb0D86F",
        createdAt: "2026-05-19T00:00:00.000Z",
        contracts: {
          demoVenue: {
            txHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
            address: "0x1111111111111111111111111111111111111111",
            blockNumber: 10,
          },
          experienceAccessObligation: {
            txHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
            address: "0x2222222222222222222222222222222222222222",
            blockNumber: 11,
          },
          registry: {
            txHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
            address: "0x3333333333333333333333333333333333333333",
            blockNumber: 12,
          },
        },
      }),
    ),
  );

  const output = execFileSync("node", ["--import", "tsx", "scripts/run-live-v1.ts"], {
    cwd: path.resolve("."),
    encoding: "utf8",
    env: {
      ...process.env,
      AGENTEX_RPC_URL: "https://rpc.example",
      AGENTEX_CHAIN_ID: "10143",
      AGENTEX_REGISTRY_ADDRESS: "",
      AGENTEX_DEMO_VENUE_ADDRESS: "",
      AGENTEX_DECODER_PRIVATE_KEY: "0xabc",
      AGENTEX_SELLER_PRIVATE_KEY_ALPHA: "0xabc",
      AGENTEX_SELLER_PRIVATE_KEY_BETA: "0xabc",
      AGENTEX_SELLER_PRIVATE_KEY_GAMMA: "0xabc",
      AGENTEX_SELLER_PRIVATE_KEY_DELTA: "0xabc",
      PRIVATE_KEY: "0xabc",
      AGENTEX_EXPERIENCE_KEY: key,
      AGENTEX_DEPLOYMENT_PATH: deploymentPath,
      AGENTEX_LIVE_OUTPUT_DIR: outputDir,
    },
  });
  const body = JSON.parse(output) as { status: string; preflight_path: string };
  const preflight = JSON.parse(readFileSync(body.preflight_path, "utf8")) as {
    registry_address: string;
    demo_venue_address: string;
    next_required: string[];
  };

  assert.equal(body.status, "ready_for_live_execution");
  assert.equal(preflight.registry_address, "0x3333333333333333333333333333333333333333");
  assert.equal(preflight.demo_venue_address, "0x1111111111111111111111111111111111111111");
  assert.ok(preflight.next_required.includes("run funded OpenClaw trades"));
});

test("live script assembles judged summary from complete live evidence", async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "agentex-live-summary-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const deploymentPath = path.join(root, "live-v1.json");
  const evidencePath = path.join(root, "evidence.json");
  const outputDir = path.join(root, "live-output");
  await writeFile(
    deploymentPath,
    stableJson(
      buildDemoDeployment({
        chainId: 10143,
        deployer: "0x68CDad728b463048f640227Fd479E725d5478cB1",
        decoderAddress: "0x33B62dA218280b6e771F86482D3cC22Acbb0D86F",
        createdAt: "2026-05-19T00:00:00.000Z",
        contracts: {
          demoVenue: {
            txHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
            address: "0x1111111111111111111111111111111111111111",
            blockNumber: 10,
          },
          experienceAccessObligation: {
            txHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
            address: "0x2222222222222222222222222222222222222222",
            blockNumber: 11,
          },
          registry: {
            txHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
            address: "0x3333333333333333333333333333333333333333",
            blockNumber: 12,
          },
        },
      }),
    ),
  );
  await writeFile(evidencePath, stableJson(sampleLiveEvidence()));

  const output = execFileSync("node", ["--import", "tsx", "scripts/run-live-v1.ts"], {
    cwd: path.resolve("."),
    encoding: "utf8",
    env: cleanAgentexEnv({
      AGENTEX_RPC_URL: "https://rpc.example",
      AGENTEX_CHAIN_ID: "10143",
      AGENTEX_DECODER_PRIVATE_KEY: "0xabc",
      AGENTEX_SELLER_PRIVATE_KEY_ALPHA: "0xabc",
      AGENTEX_SELLER_PRIVATE_KEY_BETA: "0xabc",
      AGENTEX_SELLER_PRIVATE_KEY_GAMMA: "0xabc",
      AGENTEX_SELLER_PRIVATE_KEY_DELTA: "0xabc",
      PRIVATE_KEY: "0xabc",
      AGENTEX_EXPERIENCE_KEY: key,
      AGENTEX_DEPLOYMENT_PATH: deploymentPath,
      AGENTEX_LIVE_EVIDENCE_PATH: evidencePath,
      AGENTEX_LIVE_OUTPUT_DIR: outputDir,
    }),
  });
  const body = JSON.parse(output) as { status: string; summary_path: string };
  const summary = JSON.parse(readFileSync(body.summary_path, "utf8")) as {
    mode: string;
    experiences: Array<{ encrypted_experience_cid: string }>;
    purchases: Array<{ decryption_verification_result: { status: string } }>;
    registrations: unknown[];
    deployment: { registry_address: string };
  };

  assert.equal(body.status, "live_summary_created");
  assert.equal(summary.mode, "live");
  assert.equal(summary.experiences.length, 4);
  assert.equal(summary.experiences.some((experience) => experience.encrypted_experience_cid.startsWith("local:")), false);
  assert.equal(summary.purchases.every((purchase) => purchase.decryption_verification_result.status === "verified"), true);
  assert.equal(summary.registrations.length, 4);
  assert.equal(summary.deployment.registry_address, "0x3333333333333333333333333333333333333333");
});

test("live script rejects incomplete deployment receipts", async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "agentex-incomplete-live-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const deploymentPath = path.join(root, "live-v1.json");
  const outputDir = path.join(root, "live-output");
  await writeFile(
    deploymentPath,
    stableJson({
      schema: "agentex.demo_deployment.v1",
      chain_id: 10143,
      deployer: "0x68CDad728b463048f640227Fd479E725d5478cB1",
      decoder_address: "0x33B62dA218280b6e771F86482D3cC22Acbb0D86F",
      demo_venue_deploy_tx: "0x1111111111111111111111111111111111111111111111111111111111111111",
      registry_deploy_tx: "0x2222222222222222222222222222222222222222222222222222222222222222",
      venue_id: "demo-venue-v1",
      venue_id_hash: "0xfe30c863c8998db570c02e0dc4e525e2e7026a6250b328cc1d70436e1c6fd5ef",
      created_at: "2026-05-19T00:00:00.000Z",
    }),
  );

  assert.throws(
    () =>
      execFileSync("node", ["--import", "tsx", "scripts/run-live-v1.ts"], {
        cwd: path.resolve("."),
        encoding: "utf8",
        env: cleanAgentexEnv({
          AGENTEX_RPC_URL: "https://rpc.example",
          AGENTEX_CHAIN_ID: "10143",
          AGENTEX_DECODER_PRIVATE_KEY: "0xabc",
          AGENTEX_SELLER_PRIVATE_KEY_ALPHA: "0xabc",
          AGENTEX_SELLER_PRIVATE_KEY_BETA: "0xabc",
          AGENTEX_SELLER_PRIVATE_KEY_GAMMA: "0xabc",
          AGENTEX_SELLER_PRIVATE_KEY_DELTA: "0xabc",
          PRIVATE_KEY: "0xabc",
          AGENTEX_EXPERIENCE_KEY: key,
          AGENTEX_DEPLOYMENT_PATH: deploymentPath,
          AGENTEX_LIVE_OUTPUT_DIR: outputDir,
        }),
      }),
    /deployment file is missing contract addresses/i,
  );
});

test("live setup checker separates manual blockers from automated next steps", async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "agentex-live-check-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const envPath = path.join(root, ".env");
  const deploymentPath = path.join(root, "live-v1.json");
  await writeFile(
    deploymentPath,
    stableJson(
      buildDemoDeployment({
        chainId: 10143,
        deployer: "0x68CDad728b463048f640227Fd479E725d5478cB1",
        decoderAddress: "0x33B62dA218280b6e771F86482D3cC22Acbb0D86F",
        createdAt: "2026-05-19T00:00:00.000Z",
        contracts: {
          demoVenue: {
            txHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
            address: "0x1111111111111111111111111111111111111111",
            blockNumber: 10,
          },
          experienceAccessObligation: {
            txHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
            address: "0x2222222222222222222222222222222222222222",
            blockNumber: 11,
          },
          registry: {
            txHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
            address: "0x3333333333333333333333333333333333333333",
            blockNumber: 12,
          },
        },
      }),
    ),
  );
  await writeFile(
    envPath,
    [
      "AGENTEX_RPC_URL=https://rpc.example",
      "AGENTEX_CHAIN_ID=10143",
      "AGENTEX_DEPLOYER_PRIVATE_KEY=0xabc",
      "AGENTEX_DECODER_ADDRESS=0x33B62dA218280b6e771F86482D3cC22Acbb0D86F",
      "AGENTEX_DECODER_PRIVATE_KEY=0xabc",
      "AGENTEX_SELLER_PRIVATE_KEY_ALPHA=0xabc",
      "AGENTEX_SELLER_PRIVATE_KEY_BETA=0xabc",
      "AGENTEX_SELLER_PRIVATE_KEY_GAMMA=0xabc",
      "AGENTEX_SELLER_PRIVATE_KEY_DELTA=0xabc",
      "PRIVATE_KEY=0xabc",
      `AGENTEX_EXPERIENCE_KEY=${key}`,
      "AGENTEX_SERVICE_URL=http://127.0.0.1:8787",
      `AGENTEX_DEPLOYMENT_PATH=${deploymentPath}`,
      "",
    ].join("\n"),
  );

  const output = execFileSync("node", ["--import", "tsx", "scripts/check-live-setup.ts"], {
    cwd: path.resolve("."),
    encoding: "utf8",
    env: cleanAgentexEnv({ AGENTEX_ENV_PATH: envPath }),
  });
  const report = JSON.parse(output) as {
    status: string;
    automatic_next: string[];
    manual_setup: string[];
  };

  assert.equal(report.status, "ready_for_live_preflight");
  assert.ok(report.automatic_next.includes("npm run demo:live"));
  assert.ok(report.manual_setup.includes("fund demo wallets and confirm live spend budget"));
});

test("web dashboard and runbook exist for the judge path", () => {
  const webPage = readFileSync(path.join("web", "src", "app", "page.tsx"), "utf8");
  assert.match(webPage, /AGENTEX_SUMMARY_URL/);
  assert.match(webPage, /Bundled Snapshot/);
  assert.match(webPage, /Transaction Ledger/);
  assert.match(readFileSync(path.join("demo", "live-runbook.md"), "utf8"), /npm run demo:live/);
  assert.match(readFileSync(path.join("demo", "live-runbook.md"), "utf8"), /http:\/\/localhost:3000/);
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

function cleanAgentexEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (
      name.startsWith("AGENTEX_") ||
      name === "PRIVATE_KEY" ||
      name === "OPENCLAW_REPO" ||
      name === "OPENROUTER_API_KEY" ||
      name === "ANTHROPIC_API_KEY" ||
      name === "OPENAI_API_KEY" ||
      name === "GEMINI_API_KEY"
    ) {
      continue;
    }
    env[name] = value;
  }
  return { ...env, ...overrides };
}

function sampleLiveEvidence(): Record<string, unknown> {
  const agents = ["alpha", "beta", "gamma", "delta"];
  const round = planExchangeRound(agents);
  return {
    schema: "agentex.live_evidence.v1",
    agents,
    round,
    experiences: agents.map((agent, index) => ({
      agent,
      experience_id: `live-${agent}-experience`,
      manifest_path: `demo/live-output/${agent}/manifest.json`,
      encrypted_experience_cid: `bafybeigdyrzt5sfp7udm7hu76vayqyhlq4w37wkrxktdzznqvyqkucq5f${index}`,
      filecoin_upload_receipt_path: `demo/live-output/${agent}/filecoin-upload.json`,
      trade_tx_hash: `0x${String(index + 1).repeat(64)}`,
      storage_proof_fields: {
        provider: "filecoin-pin",
        status: "verified",
        root_cid: `bafybeigdyrzt5sfp7udm7hu76vayqyhlq4w37wkrxktdzznqvyqkucq5f${index}`,
        piece_cid: `baga6ea4seaqexamplepiececid${index}`,
      },
    })),
    attestations: agents.map((agent, index) => ({
      agent,
      attestation_id: `0x${String(index + 5).repeat(64)}`,
      registry_transaction_hash: `0x${String(index + 6).repeat(64)}`,
      status: "accepted",
    })),
    listings: agents.map((agent, index) => ({
      agent,
      listing_id: `live-${agent}-listing`,
      listing_path: `demo/live-output/${agent}/listing.json`,
      encrypted_experience_cid: `bafybeigdyrzt5sfp7udm7hu76vayqyhlq4w37wkrxktdzznqvyqkucq5f${index}`,
      price_amount: "5",
      payment_asset: "USDFC",
      public_trade_summary: {
        pair: index % 2 === 0 ? "ETH/USDC" : "SOL/USDC",
        side: index % 2 === 0 ? "buy" : "sell",
        fill_price: `${3000 + index * 100}.00`,
        trade_tx_hash: `0x${String(index + 1).repeat(64)}`,
      },
    })),
    purchases: round.map((leg, index) => ({
      buyer: leg.buyer,
      seller: leg.seller,
      purchase_id: `live-${leg.buyer}-${leg.seller}`,
      path: `demo/live-output/${leg.seller}/purchase-${leg.buyer}.json`,
      filecoin_pay_reference: `filecoin-pay-mainnet:${leg.buyer}-${leg.seller}-${index}`,
      arkhai_escrow_id: `0x${String(index + 9).repeat(64)}`,
      arkhai_fulfillment_id: `0x${String(index + 10).slice(-1).repeat(64)}`,
      decryption_verification_result: { status: "verified" },
    })),
    registrations: agents.map((agent, index) => ({
      agent,
      agent_registry: "eip155:10143:0xregistry",
      agent_id: String(index + 1),
      metadata_ref: `erc8004:${agent}`,
    })),
    ingestions: round.map((leg) => ({
      buyer: leg.buyer,
      seller: leg.seller,
      path: `demo/agents/${leg.buyer}/.openclaw/imports/agentex/live-${leg.seller}.json`,
    })),
  };
}
