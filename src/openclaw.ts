import { execFileSync } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

export const OPENCLAW_MINI_CLUSTER_AGENTS = ["alpha", "beta", "gamma"] as const;
export type OpenClawMiniClusterAgent = (typeof OPENCLAW_MINI_CLUSTER_AGENTS)[number];

export interface OpenClawMiniClusterPlan {
  agents: OpenClawMiniClusterAgent[];
  exchange_round: Array<{ buyer: OpenClawMiniClusterAgent; seller: OpenClawMiniClusterAgent }>;
  namespaces: Array<{
    agent: OpenClawMiniClusterAgent;
    namespace: string;
    deploy_command: string;
    port_forward_command: string;
  }>;
  safety: {
    network: "monad-testnet";
    chain_id: "10143";
    rpc_url: string;
    trade_budget_mon: string;
    agentex_service_url: string;
  };
}

export interface OpenClawPrereqReport {
  ok: boolean;
  missing: string[];
  next_actions: string[];
}

export function openClawNamespace(agent: OpenClawMiniClusterAgent): string {
  return `openclaw-${agent}`;
}

export function buildOpenClawMiniClusterPlan(input: {
  openclawRepo: string;
  agentexServiceUrl: string;
  monadRpcUrl: string;
  chainId: string;
  tradeBudgetMon: string;
}): OpenClawMiniClusterPlan {
  if (input.chainId !== "10143") {
    throw new Error("OpenClaw Monad demo is restricted to Monad testnet chain ID 10143");
  }
  const tradeBudget = Number(input.tradeBudgetMon);
  if (!Number.isFinite(tradeBudget) || tradeBudget <= 0 || tradeBudget > 1) {
    throw new Error("OpenClaw Monad demo requires a bounded trade budget between 0 and 1 MON");
  }
  const deploy = path.join(input.openclawRepo, "scripts", "k8s", "deploy.sh");
  return {
    agents: [...OPENCLAW_MINI_CLUSTER_AGENTS],
    exchange_round: [
      { buyer: "alpha", seller: "beta" },
      { buyer: "beta", seller: "gamma" },
      { buyer: "gamma", seller: "alpha" },
    ],
    namespaces: OPENCLAW_MINI_CLUSTER_AGENTS.map((agent) => ({
      agent,
      namespace: openClawNamespace(agent),
      deploy_command: `OPENCLAW_NAMESPACE=${openClawNamespace(agent)} ${deploy} --show-token`,
      port_forward_command: `kubectl port-forward svc/openclaw ${agentPort(agent)}:18789 -n ${openClawNamespace(agent)}`,
    })),
    safety: {
      network: "monad-testnet",
      chain_id: "10143",
      rpc_url: input.monadRpcUrl,
      trade_budget_mon: input.tradeBudgetMon,
      agentex_service_url: input.agentexServiceUrl,
    },
  };
}

export async function checkOpenClawPrereqs(input: {
  openclawRepo?: string;
  requireProviderKey?: boolean;
}): Promise<OpenClawPrereqReport> {
  const missing: string[] = [];
  const nextActions: string[] = [];
  if (!commandExists("kind")) {
    missing.push("kind");
    nextActions.push("Install Kind, for example: brew install kind");
  }
  if (!commandExists("kubectl")) {
    missing.push("kubectl");
    nextActions.push("Install kubectl and make sure it can reach the Kind cluster");
  }
  if (!commandExists("docker") && !commandExists("podman")) {
    missing.push("docker_or_podman");
    nextActions.push("Install and start Docker, OrbStack, or Podman");
  } else if (!dockerIsRunning()) {
    missing.push("docker_daemon");
    nextActions.push("Start Docker or OrbStack so docker info succeeds");
  }
  if (!input.openclawRepo) {
    missing.push("OPENCLAW_REPO");
    nextActions.push("Set OPENCLAW_REPO to a local OpenClaw checkout containing scripts/k8s/deploy.sh");
  } else {
    const deploy = path.join(input.openclawRepo, "scripts", "k8s", "deploy.sh");
    const createKind = path.join(input.openclawRepo, "scripts", "k8s", "create-kind.sh");
    for (const file of [deploy, createKind]) {
      try {
        await access(file);
      } catch {
        missing.push(file);
        nextActions.push(`Check OPENCLAW_REPO; missing ${file}`);
      }
    }
  }
  if (input.requireProviderKey !== false && !hasProviderKey()) {
    missing.push("model_provider_key");
    nextActions.push("Set one of OPENROUTER_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY");
  }
  return { ok: missing.length === 0, missing, next_actions: nextActions };
}

function commandExists(command: string): boolean {
  try {
    execFileSync("command", ["-v", command], { shell: true, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function dockerIsRunning(): boolean {
  try {
    execFileSync("docker", ["info"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function hasProviderKey(): boolean {
  return ["OPENROUTER_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY"].some(
    (name) => typeof process.env[name] === "string" && process.env[name] !== "",
  );
}

function agentPort(agent: OpenClawMiniClusterAgent): number {
  return { alpha: 18789, beta: 18790, gamma: 18791 }[agent];
}
