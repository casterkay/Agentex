import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  buildOpenClawMiniClusterPlan,
  checkOpenClawPrereqs,
  loadDotEnv,
  stableJson,
} from "../src/index.js";

async function main(): Promise<void> {
  await loadDotEnv();
  const openclawRepo = process.env.OPENCLAW_REPO;
  const prereqs = await checkOpenClawPrereqs({ openclawRepo });
  const plan = buildOpenClawMiniClusterPlan({
    openclawRepo: openclawRepo ?? "<OPENCLAW_REPO>",
    agentexServiceUrl: process.env.AGENTEX_SERVICE_URL ?? "http://127.0.0.1:8787",
    monadRpcUrl: process.env.AGENTEX_RPC_URL ?? "https://rpc.testnet.monad.xyz",
    chainId: process.env.AGENTEX_CHAIN_ID ?? "10143",
    tradeBudgetMon: process.env.AGENTEX_AGENT_TRADE_BUDGET_MON ?? "0.01",
  });

  if (!prereqs.ok || !openclawRepo) {
    process.stderr.write(stableJson({ status: "blocked", prereqs, plan }));
    process.exitCode = 1;
    return;
  }

  execFileSync(path.join(openclawRepo, "scripts", "k8s", "create-kind.sh"), {
    stdio: "inherit",
    env: process.env,
  });
  for (const namespace of plan.namespaces) {
    execFileSync(path.join(openclawRepo, "scripts", "k8s", "deploy.sh"), ["--show-token"], {
      stdio: "inherit",
      env: {
        ...process.env,
        OPENCLAW_NAMESPACE: namespace.namespace,
        AGENTEX_SERVICE_URL: plan.safety.agentex_service_url,
        AGENTEX_RPC_URL: plan.safety.rpc_url,
        AGENTEX_CHAIN_ID: plan.safety.chain_id,
        AGENTEX_AGENT_NAME: namespace.agent,
        AGENTEX_AGENT_TRADE_BUDGET_MON: plan.safety.trade_budget_mon,
      },
    });
  }
  const pods = plan.namespaces.map((namespace) =>
    execFileSync("kubectl", ["get", "pods", "-n", namespace.namespace], { encoding: "utf8" }),
  );
  process.stdout.write(stableJson({ status: "deployed", plan, pods }));
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
