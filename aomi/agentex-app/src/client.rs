use serde_json::Value;

pub struct AgentexClient {
    pub base_url: String,
}

impl AgentexClient {
    pub fn from_env() -> Self {
        let base_url = std::env::var("AGENTEX_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8787".to_string());
        Self { base_url }
    }

    pub fn tool_url(&self, tool_name: &str) -> String {
        format!("{}/tool/{}", self.base_url.trim_end_matches('/'), tool_name)
    }

    pub fn normalize_result(value: Value) -> Value {
        value
    }
}
