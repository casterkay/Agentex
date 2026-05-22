use aomi_sdk::{DynAomiTool, DynToolCallCtx};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::client::{host_handoff, AgentexApp};

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AgentRef {
    /// ERC-8004 registry reference for the agent.
    pub agent_registry: String,
    /// Agent ID inside the registry.
    pub agent_id: String,
}

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct GetAgentStateArgs {
    /// Optional exchange-round agents. When present, Agentex returns the ring order.
    #[serde(default)]
    pub agents: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AomiTradeSource {
    /// Hosted Aomi app name.
    pub app: String,
    /// Aomi session ID for the current agent.
    pub session_id: String,
    /// Optional Aomi thread ID.
    #[serde(default)]
    pub thread_id: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AomiTradeContext {
    /// Aomi session or thread metadata that produced the decision.
    pub source: AomiTradeSource,
    /// Structured trade execution context with TxHash, venue, pair, side, size, fill price, reasoning, and reflection.
    pub trade: Value,
}

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PrepareWhitelistedTradeArgs {
    /// Target chain ID.
    pub chain_id: u64,
    /// Agentex whitelisted venue ID.
    pub whitelisted_venue_id: String,
    /// Pair to trade, such as ETH/USDC.
    pub pair: String,
    /// buy or sell.
    pub side: String,
    /// Order size.
    pub size: String,
    /// Optional maximum slippage in basis points.
    #[serde(default)]
    pub max_slippage_bps: Option<u64>,
}

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecordTradeExecutionArgs {
    /// Aomi-generated trade context after transaction simulation and signing.
    pub trade_context: AomiTradeContext,
    /// Explicit confirmation required after Aomi returns a transaction hash.
    #[serde(default)]
    pub confirm: bool,
}

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PrepareExperienceSaleArgs {
    /// Aomi-generated trade context containing exactly one executed trade.
    pub trade_context: AomiTradeContext,
    /// Seller ERC-8004 identity.
    pub seller_agent: AgentRef,
    /// Listing price amount.
    pub price_amount: String,
    /// Payment asset, such as USDFC.
    pub payment_asset: String,
    /// Optional output directory for generated Agentex artifacts.
    #[serde(default)]
    pub out_dir: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PublishExperienceSaleArgs {
    /// Aomi-generated trade context containing exactly one executed trade.
    pub trade_context: AomiTradeContext,
    /// Seller ERC-8004 identity.
    pub seller_agent: AgentRef,
    /// Experience encryption key supplied by the host.
    pub key: String,
    /// Whitelisted venue decoder ID.
    pub decoder_id: String,
    /// Seller nonce for registry attestation.
    pub seller_nonce: String,
    /// ISO timestamp after which the attestation expires.
    pub attestation_deadline: String,
    /// Agentex registry contract address.
    pub registry_address: String,
    /// Listing price amount.
    pub price_amount: String,
    /// Payment asset, such as USDFC.
    pub payment_asset: String,
    /// Optional output directory for generated Agentex artifacts.
    #[serde(default)]
    pub out_dir: Option<String>,
    /// Require live Filecoin-backed storage before listing.
    #[serde(default)]
    pub live: bool,
    /// Explicit confirmation required for public writes.
    #[serde(default)]
    pub confirm: bool,
}

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListingPathArgs {
    /// Agentex listing JSON path.
    pub listing_path: String,
}

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PurchaseExperienceAccessArgs {
    /// Agentex listing JSON path.
    pub listing_path: String,
    /// Buyer ERC-8004 identity.
    pub buyer_agent: AgentRef,
    /// Filecoin Pay payment reference created by the host or settlement flow.
    pub filecoin_pay_reference: String,
    /// Existing Arkhai escrow UID when the host created settlement externally.
    #[serde(default)]
    pub escrow_id: Option<String>,
    /// Buyer-specific decryption key envelope.
    pub key_envelope: String,
    /// Delivery proof text or reference.
    pub delivery_proof: String,
    /// Explicit confirmation required for purchase settlement.
    #[serde(default)]
    pub confirm: bool,
}

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct VerifyAndStoreExperienceArgs {
    /// Agentex purchase receipt path.
    pub purchase_receipt_path: String,
    /// Experience decryption key supplied by the host.
    pub key: String,
    /// Optional Agentex buyer-state storage directory.
    #[serde(default)]
    pub store_dir: Option<String>,
    /// Explicit confirmation required before writing into buyer memory.
    #[serde(default)]
    pub confirm: bool,
}

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecordExperienceFeedbackArgs {
    /// Agentex purchase receipt path.
    pub purchase_receipt_path: String,
    /// Numeric usefulness score from the buyer.
    pub score: f64,
    /// Optional concise buyer note.
    #[serde(default)]
    pub note: Option<String>,
}

macro_rules! service_tool {
    ($tool:ident, $args:ty, $name:literal, $description:literal) => {
        pub struct $tool;

        impl DynAomiTool for $tool {
            type App = AgentexApp;
            type Args = $args;
            const NAME: &'static str = $name;
            const DESCRIPTION: &'static str = $description;

            fn run(app: &AgentexApp, args: Self::Args, _ctx: DynToolCallCtx) -> Result<Value, String> {
                app.post_tool(Self::NAME, &args)
            }
        }
    };
}

service_tool!(
    GetAgentState,
    GetAgentStateArgs,
    "get_agent_state",
    "Read durable Agentex state, available tools, and optional exchange-round state for the current Aomi trading agent."
);

service_tool!(
    PrepareWhitelistedTrade,
    PrepareWhitelistedTradeArgs,
    "prepare_whitelisted_trade",
    "Prepare a whitelisted venue trade intent for Aomi transaction simulation and signing."
);

pub struct RecordTradeExecution;

impl DynAomiTool for RecordTradeExecution {
    type App = AgentexApp;
    type Args = RecordTradeExecutionArgs;
    const NAME: &'static str = "record_trade_execution";
    const DESCRIPTION: &'static str =
        "Record the Aomi-executed trade context and TxHash after explicit confirmation.";

    fn run(app: &AgentexApp, args: Self::Args, _ctx: DynToolCallCtx) -> Result<Value, String> {
        if !args.confirm {
            return Ok(host_handoff(Self::NAME, json!(args)));
        }
        app.post_tool(Self::NAME, &args)
    }
}

service_tool!(
    PrepareExperienceSale,
    PrepareExperienceSaleArgs,
    "prepare_experience_sale",
    "Preview the exact trade experience, public summary, listing terms, and risks before publishing."
);

pub struct PublishExperienceSale;

impl DynAomiTool for PublishExperienceSale {
    type App = AgentexApp;
    type Args = PublishExperienceSaleArgs;
    const NAME: &'static str = "publish_experience_sale";
    const DESCRIPTION: &'static str =
        "Publish the current agent's encrypted experience, proof, attestation, and listing after confirmation.";

    fn run(app: &AgentexApp, args: Self::Args, _ctx: DynToolCallCtx) -> Result<Value, String> {
        if !args.confirm {
            return Ok(host_handoff(Self::NAME, json!(args)));
        }
        app.post_tool(Self::NAME, &args)
    }
}

service_tool!(
    EvaluateExperienceListing,
    ListingPathArgs,
    "evaluate_experience_listing",
    "Inspect a listing's public trade summary, proof bindings, price, and delivery terms before purchase."
);

pub struct PurchaseExperienceAccess;

impl DynAomiTool for PurchaseExperienceAccess {
    type App = AgentexApp;
    type Args = PurchaseExperienceAccessArgs;
    const NAME: &'static str = "purchase_experience_access";
    const DESCRIPTION: &'static str =
        "Purchase decryption access for the current buyer agent after explicit confirmation.";

    fn run(app: &AgentexApp, args: Self::Args, _ctx: DynToolCallCtx) -> Result<Value, String> {
        if !args.confirm {
            return Ok(host_handoff(Self::NAME, json!(args)));
        }
        app.post_tool(Self::NAME, &args)
    }
}

pub struct VerifyAndStoreExperience;

impl DynAomiTool for VerifyAndStoreExperience {
    type App = AgentexApp;
    type Args = VerifyAndStoreExperienceArgs;
    const NAME: &'static str = "verify_and_store_experience";
    const DESCRIPTION: &'static str =
        "Verify decrypted content and store it in Agentex buyer state after confirmation.";

    fn run(app: &AgentexApp, args: Self::Args, _ctx: DynToolCallCtx) -> Result<Value, String> {
        if !args.confirm {
            return Ok(host_handoff(Self::NAME, json!(args)));
        }
        app.post_tool(Self::NAME, &args)
    }
}

service_tool!(
    RecordExperienceFeedback,
    RecordExperienceFeedbackArgs,
    "record_experience_feedback",
    "Record buyer feedback after verified experience delivery."
);
