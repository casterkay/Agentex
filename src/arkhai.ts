import { createWalletClient, decodeEventLog, encodeAbiParameters, http, parseAbiParameters, type Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { makeClient } from "alkahest-ts";

import { type AgentRef, sha256, stableJson } from "./shared.js";
import { type MarketListing, type PurchaseReceipt } from "./schemas.js";

export type ArkhaiArbitrationStatus = "not_requested" | "requested" | "approved" | "rejected";
export type ArkhaiCollectionStatus = "not_collectible" | "collectible" | "collected" | "refunded";

export type ArkhaiEscrowRecord = {
  escrow_uid: string;
  listing_id: string;
  buyer_agent: AgentRef;
  seller_agent: AgentRef;
  demand: string;
  payment_asset: string;
  payment_amount: string;
  status: "open" | "fulfilled" | "approved" | "rejected" | "collected";
  fulfillment_uid?: string;
  arbitration_status: ArkhaiArbitrationStatus;
  collection_status: ArkhaiCollectionStatus;
};

export type CreateArkhaiEscrowInput = {
  listing: MarketListing;
  buyerAgent: AgentRef;
  filecoinPayReference?: string;
};

export type CreateArkhaiEscrowResult = {
  escrowUid: string;
  escrowTransactionHash: string;
  demand: string;
  arbitrationStatus: ArkhaiArbitrationStatus;
  collectionStatus: ArkhaiCollectionStatus;
};

export type SubmitArkhaiFulfillmentInput = {
  receipt: PurchaseReceipt;
  keyEnvelopeHash: string;
  deliveryProofHash: string;
};

export type SubmitArkhaiFulfillmentResult = {
  fulfillmentUid: string;
  fulfillmentTransactionHash: string;
  arbitrationStatus: ArkhaiArbitrationStatus;
  collectionStatus: ArkhaiCollectionStatus;
};

export type RequestArkhaiArbitrationInput = {
  receipt: PurchaseReceipt;
  approved: boolean;
};

export type RequestArkhaiArbitrationResult = {
  arbitrationStatus: ArkhaiArbitrationStatus;
  arbitrationTransactionHash: string;
  collectionStatus: ArkhaiCollectionStatus;
};

export type CollectArkhaiEscrowInput = {
  escrowUid: string;
  fulfillmentUid: string;
};

export type CollectArkhaiEscrowResult = {
  collectionStatus: ArkhaiCollectionStatus;
  collectionTransactionHash: string;
};

export type ArkhaiSettlementClient = {
  createEscrow(input: CreateArkhaiEscrowInput): Promise<CreateArkhaiEscrowResult>;
  submitFulfillment(input: SubmitArkhaiFulfillmentInput): Promise<SubmitArkhaiFulfillmentResult>;
  requestArbitration(input: RequestArkhaiArbitrationInput): Promise<RequestArkhaiArbitrationResult>;
  collect(input: CollectArkhaiEscrowInput): Promise<CollectArkhaiEscrowResult>;
  listEscrows(): Promise<{ escrows: ArkhaiEscrowRecord[] }>;
};

const localEscrows = new Map<string, ArkhaiEscrowRecord>();

export function createLocalArkhaiSettlementClient(): ArkhaiSettlementClient {
  return {
    async createEscrow(input) {
      const escrowUid = localEscrowUid(input.listing.listing_id, input.buyerAgent);
      const record: ArkhaiEscrowRecord = {
        escrow_uid: escrowUid,
        listing_id: input.listing.listing_id,
        buyer_agent: input.buyerAgent,
        seller_agent: input.listing.seller_agent,
        demand: input.listing.settlement_demand,
        payment_asset: input.listing.payment_asset,
        payment_amount: input.listing.price_amount,
        status: "open",
        arbitration_status: "not_requested",
        collection_status: "not_collectible",
      };
      localEscrows.set(escrowUid, record);
      return {
        escrowUid,
        escrowTransactionHash: localTx("escrow", escrowUid),
        demand: record.demand,
        arbitrationStatus: record.arbitration_status,
        collectionStatus: record.collection_status,
      };
    },

    async submitFulfillment(input) {
      const record = requireLocalEscrow(input.receipt.escrow_uid);
      const fulfillmentUid = localFulfillmentUid(input.receipt.escrow_uid, input.keyEnvelopeHash, input.deliveryProofHash);
      record.fulfillment_uid = fulfillmentUid;
      record.status = "fulfilled";
      record.arbitration_status = "requested";
      record.collection_status = "not_collectible";
      localEscrows.set(record.escrow_uid, record);
      return {
        fulfillmentUid,
        fulfillmentTransactionHash: localTx("fulfillment", fulfillmentUid),
        arbitrationStatus: record.arbitration_status,
        collectionStatus: record.collection_status,
      };
    },

    async requestArbitration(input) {
      const record = requireLocalEscrow(input.receipt.escrow_uid);
      record.arbitration_status = input.approved ? "approved" : "rejected";
      record.collection_status = input.approved ? "collectible" : "not_collectible";
      record.status = input.approved ? "approved" : "rejected";
      localEscrows.set(record.escrow_uid, record);
      return {
        arbitrationStatus: record.arbitration_status,
        arbitrationTransactionHash: localTx("arbitration", `${record.escrow_uid}:${record.arbitration_status}`),
        collectionStatus: record.collection_status,
      };
    },

    async collect(input) {
      const record = requireLocalEscrow(input.escrowUid);
      if (record.fulfillment_uid !== input.fulfillmentUid) {
        throw new Error("fulfillment UID does not match escrow");
      }
      if (record.arbitration_status !== "approved") {
        throw new Error("escrow is not approved for collection");
      }
      record.collection_status = "collected";
      record.status = "collected";
      localEscrows.set(record.escrow_uid, record);
      return {
        collectionStatus: record.collection_status,
        collectionTransactionHash: localTx("collection", `${input.escrowUid}:${input.fulfillmentUid}`),
      };
    },

    async listEscrows() {
      return { escrows: Array.from(localEscrows.values()) };
    },
  };
}

export function createArkhaiSettlementClient(mode = process.env.AGENTEX_ARKHAI_MODE ?? "local"): ArkhaiSettlementClient {
  if (mode === "local") {
    return createLocalArkhaiSettlementClient();
  }
  if (mode === "live") {
    return createLiveArkhaiSettlementClient();
  }
  throw new Error(`unsupported Arkhai mode: ${mode}`);
}

export function createLiveArkhaiSettlementClient(): ArkhaiSettlementClient {
  const required = [
    "AGENTEX_ARKHAI_PRIVATE_KEY",
    "AGENTEX_ARKHAI_CHAIN_ID",
    "AGENTEX_ARKHAI_TOKEN_ADDRESS",
    "AGENTEX_ARKHAI_ARBITER_ADDRESS",
    "AGENTEX_ARKHAI_ERC20_ESCROW_ADDRESS",
    "AGENTEX_ARKHAI_ORACLE_ADDRESS",
    "AGENTEX_ARKHAI_EXPERIENCE_ACCESS_OBLIGATION_ADDRESS",
  ];
  return {
    async createEscrow(input) {
      requireLiveArkhaiEnv(required);
      const { client, tokenAddress, trustedOracleArbiter, oracleAddress } = liveContext();
      const data = encodeExperienceAccessDemandFromListing(input.listing);
      const demand = client.arbiters.general.trustedOracle.encodeDemand({
        oracle: oracleAddress,
        data,
      });
      const result = await client.erc20.escrow.nonTierable.approveAndCreate(
        {
          address: tokenAddress,
          value: BigInt(input.listing.price_amount),
        },
        {
          arbiter: trustedOracleArbiter,
          demand,
        },
        0n,
      );
      return {
        escrowUid: result.attested.uid,
        escrowTransactionHash: result.hash,
        demand: input.listing.settlement_demand,
        arbitrationStatus: "not_requested",
        collectionStatus: "not_collectible",
      };
    },

    async submitFulfillment(input) {
      requireLiveArkhaiEnv(required);
      const { client, experienceAccessObligationAddress } = liveContext();
      const { request } = await client.viemClient.simulateContract({
        address: experienceAccessObligationAddress,
        abi: experienceAccessObligationAbi,
        functionName: "fulfill",
        args: [
          {
            attestationId: input.receipt.attestation_id,
            encryptedExperienceCid: input.receipt.encrypted_experience_cid,
            decryptedExperienceHash: `0x${input.receipt.decrypted_experience_hash}` as `0x${string}`,
            keyEnvelopeHash: `0x${input.keyEnvelopeHash}` as `0x${string}`,
            deliveryProofHash: `0x${input.deliveryProofHash}` as `0x${string}`,
          },
          input.receipt.escrow_uid as `0x${string}`,
        ],
      });
      const hash = await client.viemClient.writeContract(request);
      const receipt = await client.viemClient.waitForTransactionReceipt({ hash });
      const fulfillmentUid = receipt.logs
        .map((log) => {
          try {
            return decodeEventLog({
              abi: experienceAccessObligationAbi,
              data: log.data,
              topics: log.topics,
            });
          } catch {
            return undefined;
          }
        })
        .find((log) => log?.eventName === "ExperienceAccessFulfilled")?.args.fulfillmentUid as `0x${string}` | undefined;
      if (!fulfillmentUid) {
        throw new Error("ExperienceAccessFulfilled event not found");
      }
      return {
        fulfillmentUid,
        fulfillmentTransactionHash: hash,
        arbitrationStatus: "requested",
        collectionStatus: "not_collectible",
      };
    },

    async requestArbitration(input) {
      requireLiveArkhaiEnv(required);
      if (!input.receipt.fulfillment_uid) {
        throw new Error("purchase has no fulfillment UID");
      }
      const { client, oracleAddress } = liveContext();
      const demandData = encodeExperienceAccessDemandFromReceipt(input.receipt);
      const demand = client.arbiters.general.trustedOracle.encodeDemand({
        oracle: oracleAddress,
        data: demandData,
      });
      const hash = await client.arbiters.general.trustedOracle.requestArbitration(
        input.receipt.fulfillment_uid as `0x${string}`,
        oracleAddress,
        demand,
      );
      return {
        arbitrationStatus: input.approved ? "approved" : "requested",
        arbitrationTransactionHash: hash,
        collectionStatus: input.approved ? "collectible" : "not_collectible",
      };
    },

    async collect(input) {
      requireLiveArkhaiEnv(required);
      const { client } = liveContext();
      const hash = await client.erc20.escrow.nonTierable.collect(
        input.escrowUid as `0x${string}`,
        input.fulfillmentUid as `0x${string}`,
      );
      return {
        collectionStatus: "collected",
        collectionTransactionHash: hash,
      };
    },

    async listEscrows() {
      requireLiveArkhaiEnv(required);
      throw new Error("live Arkhai market indexing is intentionally handled by the Agentex receipt store for V1");
    },
  };
}

export async function listArkhaiEscrows(client = createArkhaiSettlementClient()): Promise<{ escrows: ArkhaiEscrowRecord[] }> {
  return client.listEscrows();
}

function localEscrowUid(listingId: string, buyerAgent: AgentRef): string {
  return `arkhai:escrow:${sha256(stableJson({ listing_id: listingId, buyer_agent: buyerAgent })).slice(0, 32)}`;
}

function localFulfillmentUid(escrowUid: string, keyEnvelopeHash: string, deliveryProofHash: string): string {
  return `arkhai:fulfillment:${sha256(stableJson({ escrow_uid: escrowUid, key_envelope_hash: keyEnvelopeHash, delivery_proof_hash: deliveryProofHash })).slice(0, 32)}`;
}

function localTx(kind: string, value: string): string {
  return `0x${sha256(stableJson({ kind, value }))}`;
}

function requireLocalEscrow(escrowUid: string): ArkhaiEscrowRecord {
  const record = localEscrows.get(escrowUid);
  if (!record) {
    throw new Error(`unknown Arkhai escrow: ${escrowUid}`);
  }
  return record;
}

function requireLiveArkhaiEnv(names: string[]): void {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`missing required Arkhai env: ${missing.join(", ")}`);
  }
}

function liveContext(): {
  client: ReturnType<typeof makeClient>;
  tokenAddress: `0x${string}`;
  trustedOracleArbiter: `0x${string}`;
  oracleAddress: `0x${string}`;
  experienceAccessObligationAddress: `0x${string}`;
} {
  const account = privateKeyToAccount(normalizePrivateKey(process.env.AGENTEX_ARKHAI_PRIVATE_KEY as string));
  const chainId = Number(process.env.AGENTEX_ARKHAI_CHAIN_ID);
  const rpcUrl = process.env.AGENTEX_ARKHAI_RPC_URL || process.env.AGENTEX_RPC_URL;
  if (!rpcUrl) {
    throw new Error("missing required Arkhai env: AGENTEX_ARKHAI_RPC_URL or AGENTEX_RPC_URL");
  }
  const walletClient = createWalletClient({
    account,
    chain: {
      id: chainId,
      name: `agentex-arkhai-${chainId}`,
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    },
    transport: http(rpcUrl),
  });
  const trustedOracleArbiter = normalizeAddress(process.env.AGENTEX_ARKHAI_ARBITER_ADDRESS as string);
  return {
    client: makeClient(walletClient, {
      erc20EscrowObligation: normalizeAddress(process.env.AGENTEX_ARKHAI_ERC20_ESCROW_ADDRESS as string),
      trustedOracleArbiter,
    }),
    tokenAddress: normalizeAddress(process.env.AGENTEX_ARKHAI_TOKEN_ADDRESS as string),
    trustedOracleArbiter,
    oracleAddress: normalizeAddress(process.env.AGENTEX_ARKHAI_ORACLE_ADDRESS as string),
    experienceAccessObligationAddress: normalizeAddress(process.env.AGENTEX_ARKHAI_EXPERIENCE_ACCESS_OBLIGATION_ADDRESS as string),
  };
}

function encodeExperienceAccessDemandFromListing(listing: MarketListing): `0x${string}` {
  return encodeAbiParameters(experienceAccessDemandAbi, [
    {
      attestationId: listing.attestation_id,
      encryptedExperienceCid: listing.encrypted_experience_cid,
      decryptedExperienceHash: `0x${listing.decrypted_experience_hash}` as `0x${string}`,
    },
  ]);
}

function encodeExperienceAccessDemandFromReceipt(receipt: PurchaseReceipt): `0x${string}` {
  return encodeAbiParameters(experienceAccessDemandAbi, [
    {
      attestationId: receipt.attestation_id,
      encryptedExperienceCid: receipt.encrypted_experience_cid,
      decryptedExperienceHash: `0x${receipt.decrypted_experience_hash}` as `0x${string}`,
    },
  ]);
}

function normalizePrivateKey(key: string): `0x${string}` {
  return (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`;
}

function normalizeAddress(address: string): `0x${string}` {
  return address.toLowerCase() as `0x${string}`;
}

const experienceAccessDemandAbi = parseAbiParameters(
  "(string attestationId,string encryptedExperienceCid,bytes32 decryptedExperienceHash)",
);

const experienceAccessObligationAbi = [
  {
    type: "function",
    name: "fulfill",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "data",
        type: "tuple",
        components: [
          { name: "attestationId", type: "string" },
          { name: "encryptedExperienceCid", type: "string" },
          { name: "decryptedExperienceHash", type: "bytes32" },
          { name: "keyEnvelopeHash", type: "bytes32" },
          { name: "deliveryProofHash", type: "bytes32" },
        ],
      },
      { name: "escrowUid", type: "bytes32" },
    ],
    outputs: [{ name: "fulfillmentUid", type: "bytes32" }],
  },
  {
    type: "event",
    name: "ExperienceAccessFulfilled",
    inputs: [
      { name: "fulfillmentUid", type: "bytes32", indexed: true },
      { name: "escrowUid", type: "bytes32", indexed: true },
      { name: "fulfiller", type: "address", indexed: true },
      { name: "attestationId", type: "string", indexed: false },
      { name: "encryptedExperienceCid", type: "string", indexed: false },
      { name: "decryptedExperienceHash", type: "bytes32", indexed: false },
      { name: "keyEnvelopeHash", type: "bytes32", indexed: false },
      { name: "deliveryProofHash", type: "bytes32", indexed: false },
    ],
  },
] as const satisfies Abi;
