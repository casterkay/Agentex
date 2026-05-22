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
pub struct GetMarketStateArgs {
    /// Optional exchange-round agents. When present, Agentex returns the ring order.
    #[serde(default)]
    pub agents: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct InspectTradeActivityArgs {
    /// OpenClaw activity JSON path.
    pub activity_path: String,
    /// Optional OpenClaw memory path.
    #[serde(default)]
    pub memory_path: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PrepareExperienceSaleArgs {
    /// OpenClaw activity JSON path containing exactly one trade.
    pub activity_path: String,
    /// OpenClaw memory path that contains the source reflection context.
    pub memory_path: String,
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
    /// OpenClaw activity JSON path containing exactly one trade.
    pub activity_path: String,
    /// OpenClaw memory path that contains the source reflection context.
    pub memory_path: String,
    /// Seller ERC-8004 identity.
    pub seller_agent: AgentRef,
    /// Experience encryption key supplied by the host.
    pub key: String,
    /// Whitelisted venue decoder ID.
    pub decoder_id: String,
    /// Whitelisted venue decoder signing key or local demo key.
    pub decoder_key: String,
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
    /// Filecoin Pin wallet private key supplied by the host when live publishing.
    #[serde(default)]
    pub private_key: Option<String>,
    /// Filecoin Pin network, usually mainnet or calibration.
    #[serde(default)]
    pub network: Option<String>,
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
pub struct VerifyAndIngestExperienceArgs {
    /// Agentex purchase receipt path.
    pub purchase_receipt_path: String,
    /// Experience decryption key supplied by the host.
    pub key: String,
    /// Buyer OpenClaw repository path.
    pub buyer_repo: String,
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
    GetMarketState,
    GetMarketStateArgs,
    "get_market_state",
    "Read market state, available Agentex tools, and optional exchange-round state for the current trading agent."
);

service_tool!(
    InspectTradeActivity,
    InspectTradeActivityArgs,
    "inspect_trade_activity",
    "Inspect an OpenClaw activity and memory pair before creating a sellable experience."
);

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

pub struct VerifyAndIngestExperience;

impl DynAomiTool for VerifyAndIngestExperience {
    type App = AgentexApp;
    type Args = VerifyAndIngestExperienceArgs;
    const NAME: &'static str = "verify_and_ingest_experience";
    const DESCRIPTION: &'static str =
        "Verify decrypted content and import it into the buyer's OpenClaw learning store after confirmation.";

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
