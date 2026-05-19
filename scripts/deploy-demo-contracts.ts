import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createWalletClient, http, keccak256, stringToBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { compileContracts } from "./compile-contracts.js";
import { loadDotEnv } from "../src/env.js";

const required = ["AGENTEX_RPC_URL", "AGENTEX_DEPLOYER_PRIVATE_KEY", "AGENTEX_DECODER_ADDRESS", "AGENTEX_CHAIN_ID"];

async function main(): Promise<void> {
  await loadDotEnv();
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`missing required env: ${missing.join(", ")}`);
  }
  await compileContracts();
  const [demoVenueArtifact, experienceAccessObligationArtifact, registryArtifact] = await Promise.all([
    readArtifact("DemoTradeVenue.json"),
    readArtifact("ExperienceAccessObligation.json"),
    readArtifact("AgentexRegistry.json"),
  ]);
  const chainId = Number(process.env.AGENTEX_CHAIN_ID);
  const account = privateKeyToAccount(normalizePrivateKey(process.env.AGENTEX_DEPLOYER_PRIVATE_KEY as string));
  const client = createWalletClient({
    account,
    chain: { id: chainId, name: `agentex-${chainId}`, nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [process.env.AGENTEX_RPC_URL as string] } } },
    transport: http(process.env.AGENTEX_RPC_URL),
  });
  const venueHash = await client.deployContract({ abi: demoVenueArtifact.abi, bytecode: demoVenueArtifact.bytecode });
  const experienceAccessObligationHash = await client.deployContract({
    abi: experienceAccessObligationArtifact.abi,
    bytecode: experienceAccessObligationArtifact.bytecode,
  });
  const registryHash = await client.deployContract({ abi: registryArtifact.abi, bytecode: registryArtifact.bytecode });
  const deployment = {
    schema: "agentex.demo_deployment.v1",
    chain_id: chainId,
    deployer: account.address,
    decoder_address: process.env.AGENTEX_DECODER_ADDRESS,
    demo_venue_deploy_tx: venueHash,
    experience_access_obligation_deploy_tx: experienceAccessObligationHash,
    registry_deploy_tx: registryHash,
    venue_id: "demo-venue-v1",
    venue_id_hash: keccak256(stringToBytes("demo-venue-v1")),
    created_at: new Date().toISOString(),
  };
  await mkdir("deployments", { recursive: true });
  await writeFile(path.join("deployments", "live-v1.json"), `${JSON.stringify(deployment, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ status: "submitted", deployment }, null, 2)}\n`);
}

async function readArtifact(name: string): Promise<{ abi: []; bytecode: `0x${string}` }> {
  return JSON.parse(await readFile(path.join("artifacts", name), "utf8")) as { abi: []; bytecode: `0x${string}` };
}

function normalizePrivateKey(key: string): `0x${string}` {
  return (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
