use std::time::Duration;

use reqwest::blocking::Client;
use serde::Serialize;
use serde_json::{json, Value};

#[derive(Clone)]
pub struct AgentexApp {
    client: Client,
    base_url: String,
}

impl Default for AgentexApp {
    fn default() -> Self {
        let base_url = std::env::var("AGENTEX_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8787".to_string());
        Self::new(base_url)
    }
}

impl AgentexApp {
    pub fn new(base_url: impl Into<String>) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("reqwest client");
        Self {
            client,
            base_url: base_url.into(),
        }
    }

    pub fn tool_url(&self, tool_name: &str) -> String {
        format!("{}/tool/{}", self.base_url.trim_end_matches('/'), tool_name)
    }

    pub fn manifest_url(&self) -> String {
        format!("{}/api/aomi/manifest", self.base_url.trim_end_matches('/'))
    }

    pub fn post_tool<T: Serialize>(&self, tool_name: &str, args: &T) -> Result<Value, String> {
        let response = self
            .client
            .post(self.tool_url(tool_name))
            .json(args)
            .send()
            .map_err(|error| format!("Agentex service request failed: {error}"))?;
        let status = response.status();
        let value = response
            .json::<Value>()
            .map_err(|error| format!("Agentex service returned invalid JSON: {error}"))?;
        if !status.is_success() {
            return Err(normalize_error(status.as_u16(), value));
        }
        Ok(Self::normalize_result(value))
    }

    pub fn get_manifest(&self) -> Result<Value, String> {
        let response = self
            .client
            .get(self.manifest_url())
            .send()
            .map_err(|error| format!("Agentex manifest request failed: {error}"))?;
        let status = response.status();
        let value = response
            .json::<Value>()
            .map_err(|error| format!("Agentex manifest returned invalid JSON: {error}"))?;
        if !status.is_success() {
            return Err(normalize_error(status.as_u16(), value));
        }
        Ok(Self::normalize_result(value))
    }

    pub fn normalize_result(value: Value) -> Value {
        match value {
            Value::Object(mut object) => {
                object.remove("key");
                object.remove("privateKey");
                Value::Object(object)
            }
            other => other,
        }
    }
}

fn normalize_error(status: u16, value: Value) -> String {
    let message = value
        .get("error")
        .and_then(Value::as_str)
        .or_else(|| value.get("message").and_then(Value::as_str))
        .unwrap_or("unknown Agentex service error");
    format!("Agentex service error {status}: {message}")
}

pub fn host_handoff(action: &str, args: Value) -> Value {
    json!({
        "status": "host_action_required",
        "SYSTEM_NEXT_ACTION": {
            "type": action,
            "preserve_args": args
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_service_urls() {
        let app = AgentexApp::new("http://localhost:8787/");
        assert_eq!(app.tool_url("get_market_state"), "http://localhost:8787/tool/get_market_state");
        assert_eq!(app.manifest_url(), "http://localhost:8787/api/aomi/manifest");
    }

    #[test]
    fn normalization_removes_secret_echoes() {
        let normalized = AgentexApp::normalize_result(json!({
            "status": "ready",
            "key": "secret",
            "privateKey": "secret"
        }));
        assert_eq!(normalized, json!({ "status": "ready" }));
    }
}
