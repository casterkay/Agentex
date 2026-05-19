import { readFile } from "node:fs/promises";
import path from "node:path";

export interface DemoDeployment {
  schema: "agentex.demo_deployment.v1";
  chain_id: number;
  deployer: string;
  decoder_address: string;
  demo_venue_deploy_tx: string;
  experience_access_obligation_deploy_tx: string;
  registry_deploy_tx: string;
  venue_id: string;
  venue_id_hash: string;
  created_at: string;
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
