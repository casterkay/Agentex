import { readFile } from "node:fs/promises";
import path from "node:path";

export interface DemoDeployment {
  schema: "agentex.demo_deployment.v1";
  chain_id: number;
  deployer: string;
  decoder_address: string;
  demo_venue_deploy_tx: string;
  demo_venue_address: string;
  demo_venue_block_number: number;
  experience_access_obligation_deploy_tx: string;
  experience_access_obligation_address: string;
  experience_access_obligation_block_number: number;
  registry_deploy_tx: string;
  registry_address: string;
  registry_block_number: number;
  venue_id: string;
  venue_id_hash: string;
  created_at: string;
}

export interface DemoDeploymentContractReceipt {
  txHash: string;
  address: string;
  blockNumber: bigint | number;
}

export function buildDemoDeployment(input: {
  chainId: number;
  deployer: string;
  decoderAddress: string;
  createdAt: string;
  contracts: {
    demoVenue: DemoDeploymentContractReceipt;
    experienceAccessObligation: DemoDeploymentContractReceipt;
    registry: DemoDeploymentContractReceipt;
  };
}): DemoDeployment {
  return {
    schema: "agentex.demo_deployment.v1",
    chain_id: input.chainId,
    deployer: input.deployer,
    decoder_address: input.decoderAddress,
    demo_venue_deploy_tx: input.contracts.demoVenue.txHash,
    demo_venue_address: input.contracts.demoVenue.address,
    demo_venue_block_number: Number(input.contracts.demoVenue.blockNumber),
    experience_access_obligation_deploy_tx: input.contracts.experienceAccessObligation.txHash,
    experience_access_obligation_address: input.contracts.experienceAccessObligation.address,
    experience_access_obligation_block_number: Number(input.contracts.experienceAccessObligation.blockNumber),
    registry_deploy_tx: input.contracts.registry.txHash,
    registry_address: input.contracts.registry.address,
    registry_block_number: Number(input.contracts.registry.blockNumber),
    venue_id: "demo-venue-v1",
    venue_id_hash: "0xfe30c863c8998db570c02e0dc4e525e2e7026a6250b328cc1d70436e1c6fd5ef",
    created_at: input.createdAt,
  };
}

export async function readDemoDeployment(filePath = path.join("deployments", "live-v1.json")): Promise<DemoDeployment> {
  return JSON.parse(await readFile(filePath, "utf8")) as DemoDeployment;
}

export function requireEnv(names: string[]): void {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`missing required env: ${missing.join(", ")}`);
  }
}
