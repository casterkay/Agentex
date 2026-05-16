import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  createGeneAsset,
  createMemexchangeServer,
  exportGeneAsset,
  invokeMemexchangeTool,
  planExchangeRound,
  scoreGeneAsset,
  verifyGeneAsset,
} from "../src/index.js";

const key = "0123456789abcdef0123456789abcdef";

async function fixtureRepo(): Promise<string> {
  const dir = mkdtempSync(path.join(tmpdir(), "memexchange-"));
  execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "agent@example.test"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "Agent"], { cwd: dir });
  await writeFile(path.join(dir, "AGENTS.md"), "Risk limit: 1% per trade.\nReview before action.\n");
  await writeFile(path.join(dir, "MEMORY.md"), "Avoid crowded momentum after drawdown.\n");
  await writeFile(path.join(dir, ".env"), "PRIVATE_KEY=secret\n");
  await mkdir(path.join(dir, "logs"));
  await writeFile(path.join(dir, "logs", "decision.json"), '{"return":0.07,"maxDrawdown":0.02}\n');
  execFileSync("git", ["add", "AGENTS.md", "MEMORY.md"], { cwd: dir });
  execFileSync("git", ["commit", "-m", "seed profile"], { cwd: dir, stdio: "ignore" });
  return dir;
}

test("createGeneAsset packages only profile files and encrypts the payload", async (t) => {
  const repo = await fixtureRepo();
  t.after(() => rm(repo, { recursive: true, force: true }));

  const asset = await createGeneAsset({
    repo,
    agent: "alpha",
    seller: { agentRegistry: "0xregistry", agentId: "1" },
    evidenceDir: path.join(repo, "logs"),
    key,
  });

  assert.deepEqual(
    asset.manifest.files.map((file) => file.path),
    ["AGENTS.md", "MEMORY.md"],
  );
  assert.equal(asset.manifest.schema, "memexchange.gene_manifest.v1");
  assert.equal(asset.manifest.gene_format, "openclaw.profile.v1");
  assert.match(asset.manifest.encrypted_payload_ref, /^local:[a-f0-9]{64}$/);
  assert.equal(asset.redaction.blocked.length, 0);

  const payload = await readFile(asset.paths.encryptedPayload, "utf8");
  assert.equal(payload.includes("Risk limit"), false);
  assert.equal(payload.includes("Avoid crowded"), false);
});

test("createGeneAsset fails closed when a profile file contains secret material", async (t) => {
  const repo = await fixtureRepo();
  t.after(() => rm(repo, { recursive: true, force: true }));
  writeFileSync(path.join(repo, "MEMORY.md"), "PRIVATE_KEY=leak\n");

  await assert.rejects(
    createGeneAsset({
      repo,
      agent: "alpha",
      seller: { agentRegistry: "0xregistry", agentId: "1" },
      key,
    }),
    /redaction failed/i,
  );
});

test("scoreGeneAsset is deterministic and independent from valuation notes", async (t) => {
  const repo = await fixtureRepo();
  t.after(() => rm(repo, { recursive: true, force: true }));
  const asset = await createGeneAsset({
    repo,
    agent: "alpha",
    seller: { agentRegistry: "0xregistry", agentId: "1" },
    evidenceDir: path.join(repo, "logs"),
    key,
  });

  const first = await scoreGeneAsset({
    manifestPath: asset.paths.manifest,
    evidenceDir: path.join(repo, "logs"),
    valuationNote: "Looks excellent.",
  });
  const second = await scoreGeneAsset({
    manifestPath: asset.paths.manifest,
    evidenceDir: path.join(repo, "logs"),
    valuationNote: "Looks weak.",
  });

  assert.equal(first.report.deterministic_score, second.report.deterministic_score);
  assert.notEqual(first.report.valuation_note, second.report.valuation_note);
});

test("verifyGeneAsset validates hashes and catches encrypted payload tampering", async (t) => {
  const repo = await fixtureRepo();
  t.after(() => rm(repo, { recursive: true, force: true }));
  const asset = await createGeneAsset({
    repo,
    agent: "alpha",
    seller: { agentRegistry: "0xregistry", agentId: "1" },
    key,
  });

  const verified = await verifyGeneAsset({
    manifestPath: asset.paths.manifest,
    key,
  });
  assert.equal(verified.ok, true);

  const encrypted = readFileSync(asset.paths.encryptedPayload, "utf8");
  writeFileSync(asset.paths.encryptedPayload, encrypted.replace(/[a-f0-9]/, "0"));

  const tampered = await verifyGeneAsset({
    manifestPath: asset.paths.manifest,
    key,
  });
  assert.equal(tampered.ok, false);
  assert.equal(tampered.errors.some((error) => error.includes("encrypted payload")), true);
});

test("exportGeneAsset writes a review directory without changing the source repo", async (t) => {
  const repo = await fixtureRepo();
  t.after(() => rm(repo, { recursive: true, force: true }));
  const out = path.join(repo, "review");
  const before = readFileSync(path.join(repo, "MEMORY.md"), "utf8");
  const asset = await createGeneAsset({
    repo,
    agent: "alpha",
    seller: { agentRegistry: "0xregistry", agentId: "1" },
    key,
  });

  const exported = await exportGeneAsset({
    manifestPath: asset.paths.manifest,
    key,
    out,
  });

  assert.equal(exported.ok, true);
  assert.equal(readFileSync(path.join(repo, "MEMORY.md"), "utf8"), before);
  assert.equal(readFileSync(path.join(out, "MEMORY.md"), "utf8"), before);
  assert.match(readFileSync(path.join(out, "DIFF_PLAN.md"), "utf8"), /Review exported profile files/);
});

test("planExchangeRound creates a closed alpha beta gamma delta purchase loop", () => {
  assert.deepEqual(planExchangeRound(["alpha", "beta", "gamma", "delta"]), [
    { buyer: "alpha", seller: "beta" },
    { buyer: "beta", seller: "gamma" },
    { buyer: "gamma", seller: "delta" },
    { buyer: "delta", seller: "alpha" },
  ]);
});

test("Aomi-facing tools require confirmation before side effects", async (t) => {
  const repo = await fixtureRepo();
  t.after(() => rm(repo, { recursive: true, force: true }));

  const preview = await invokeMemexchangeTool("create_gene_asset", {
    repo,
    agent: "alpha",
    seller: { agentRegistry: "0xregistry", agentId: "1" },
    key,
  });

  assert.equal(preview.status, "confirmation_required");
  assert.equal(preview.next_action, "call create_gene_asset again with confirm:true");

  const created = await invokeMemexchangeTool("create_gene_asset", {
    repo,
    agent: "alpha",
    seller: { agentRegistry: "0xregistry", agentId: "1" },
    key,
    confirm: true,
  });

  assert.equal(created.status, "created");
  assert.match(String(created.manifest_path), /manifest\.json$/);
});

test("Filecoin upload tool does not invent success without wallet configuration", async (t) => {
  const repo = await fixtureRepo();
  t.after(() => rm(repo, { recursive: true, force: true }));
  const asset = await createGeneAsset({
    repo,
    agent: "alpha",
    seller: { agentRegistry: "0xregistry", agentId: "1" },
    key,
  });

  const result = await invokeMemexchangeTool("upload_gene_to_filecoin", {
    manifestPath: asset.paths.manifest,
    confirm: true,
  });

  assert.equal(result.status, "configuration_required");
  assert.equal(result.required_env, "PRIVATE_KEY");
});

test("HTTP tool server exposes compact JSON tool calls", async (t) => {
  const server = createMemexchangeServer();
  t.after(() => server.close());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert.equal(typeof address, "object");
  assert.notEqual(address, null);
  const port = address && typeof address === "object" ? address.port : 0;

  const response = await fetch(`http://127.0.0.1:${port}/tool/plan_exchange_round`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ agents: ["alpha", "beta", "gamma", "delta"] }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "planned",
    round: [
      { buyer: "alpha", seller: "beta" },
      { buyer: "beta", seller: "gamma" },
      { buyer: "gamma", seller: "delta" },
      { buyer: "delta", seller: "alpha" },
    ],
  });
});

test("CLI returns compact JSON for exchange planning", () => {
  const output = execFileSync(
    "node",
    ["--import", "tsx", "src/cli.ts", "exchange", "plan", "alpha", "beta", "gamma", "delta"],
    { cwd: path.resolve("."), encoding: "utf8" },
  );
  assert.deepEqual(JSON.parse(output), {
    status: "planned",
    round: [
      { buyer: "alpha", seller: "beta" },
      { buyer: "beta", seller: "gamma" },
      { buyer: "gamma", seller: "delta" },
      { buyer: "delta", seller: "alpha" },
    ],
  });
});
