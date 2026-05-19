import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import solc from "solc";

interface ContractArtifact {
  abi: Array<{ type: string; name?: string; inputs?: unknown[]; outputs?: unknown[] }>;
  bytecode: string;
  deployedBytecode: string;
}

export async function compileContracts(input: { outDir?: string } = {}): Promise<{
  demoVenue: ContractArtifact;
  experienceAccessObligation: ContractArtifact;
  registry: ContractArtifact;
}> {
  const sources = {
    "DemoTradeVenue.sol": {
      content: await readFile(path.join("contracts", "DemoTradeVenue.sol"), "utf8"),
    },
    "AgentexRegistry.sol": {
      content: await readFile(path.join("contracts", "AgentexRegistry.sol"), "utf8"),
    },
    "ExperienceAccessObligation.sol": {
      content: await readFile(path.join("contracts", "ExperienceAccessObligation.sol"), "utf8"),
    },
  };
  const compiled = JSON.parse(
    solc.compile(
      JSON.stringify({
        language: "Solidity",
        sources,
        settings: {
          optimizer: { enabled: true, runs: 200 },
          outputSelection: {
            "*": {
              "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
            },
          },
        },
      }),
    ),
  ) as {
    errors?: Array<{ severity: string; formattedMessage: string }>;
    contracts: Record<string, Record<string, { abi: ContractArtifact["abi"]; evm: { bytecode: { object: string }; deployedBytecode: { object: string } } }>>;
  };
  const errors = compiled.errors?.filter((error) => error.severity === "error") ?? [];
  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.formattedMessage).join("\n"));
  }
  const demoVenue = artifact(compiled.contracts["DemoTradeVenue.sol"]?.DemoTradeVenue);
  const experienceAccessObligation = artifact(compiled.contracts["ExperienceAccessObligation.sol"]?.ExperienceAccessObligation);
  const registry = artifact(compiled.contracts["AgentexRegistry.sol"]?.AgentexRegistry);
  const outDir = input.outDir ?? "artifacts";
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "DemoTradeVenue.json"), JSON.stringify(demoVenue, null, 2));
  await writeFile(path.join(outDir, "ExperienceAccessObligation.json"), JSON.stringify(experienceAccessObligation, null, 2));
  await writeFile(path.join(outDir, "AgentexRegistry.json"), JSON.stringify(registry, null, 2));
  return { demoVenue, experienceAccessObligation, registry };
}

function artifact(contract: { abi: ContractArtifact["abi"]; evm: { bytecode: { object: string }; deployedBytecode: { object: string } } } | undefined): ContractArtifact {
  if (!contract) {
    throw new Error("compiled contract not found");
  }
  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
    deployedBytecode: `0x${contract.evm.deployedBytecode.object}`,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  compileContracts()
    .then((result) => {
      process.stdout.write(`${JSON.stringify({ status: "compiled", contracts: Object.keys(result) }, null, 2)}\n`);
    })
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
