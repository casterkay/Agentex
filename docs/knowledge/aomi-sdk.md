---
title: Build an Aomi app — for agents
description: Self-contained guide for an AI agent told "build an Aomi app for our API". Inlines the aomi-build skill, SDK patterns, spec-to-tools rubric, and how to wire up a chat frontend. Read this once and you have everything to scaffold an Aomi SDK crate end-to-end.
source: https://aomi.dev/agents/build.md
---

# Build an Aomi app

This page is for an AI agent that has been told something like *"build an Aomi app for our REST API at api.acme.com"*. Read it once — it contains the full build procedure, SDK patterns, and how to add a chat frontend on top.

> If the agent has access to the canonical `aomi-build` skill at [github.com/aomi-labs/skills](https://github.com/aomi-labs/skills/tree/main/aomi-build), prefer that — same content, kept in sync. To install: `npx skills add aomi-labs/skills`.

## Quick orientation

An **Aomi App** is a Rust crate built on `aomi-sdk` that exposes an external service (REST, GraphQL, JSON-RPC, gRPC, or any callable surface) as a small set of intent-shaped tools the Aomi agent can invoke during a conversation. The standard file split is:

- `lib.rs` — manifest, preamble, tool registration
- `client.rs` — HTTP client, auth, typed models, response normalization
- `tool.rs` — `DynAomiTool` implementations

The procedure below converts a spec or repo into that shape.

## Procedure — the aomi-build skill

<!-- source: github.com/aomi-labs/skills:aomi-build/SKILL.md -->

Use this skill for tasks like:

- "Build an Aomi app from this OpenAPI spec."
- "Turn these REST endpoints into an Aomi plugin."
- "Scaffold a new Aomi SDK app for this product/API."
- "Update an existing Aomi app to support these new endpoints."
- "Turn these builder docs or SDK repos into an Aomi assistant."

## First Read

If a local `aomi-sdk` checkout exists, inspect these first:

- `sdk/examples/app-template-http/src/lib.rs`
- `sdk/examples/app-template-http/src/client.rs`
- `sdk/examples/app-template-http/src/tool.rs`
- `docs/repo-structure.md`
- `docs/host-interop.md`
- 2 or 3 relevant apps under `apps/*/src/{lib,client,tool}.rs`

If the supplied docs mostly point to GitHub repositories, SDKs, or examples instead of listing public endpoints:

- treat those linked repositories as the real source of truth
- inspect their README, config examples, example commands, and RPC/API surfaces
- check whether they expose or produce a runnable service interface such as REST, GraphQL, JSON-RPC, gRPC, webhooks, or another stable client contract
- prefer building against that executable surface instead of wrapping the docs themselves
- avoid inventing a public transactional API that the docs do not actually publish

If the current repo is `aomi-widget`, also inspect:

- `apps/landing/content/examples/*.mdx`
- `apps/landing/content/guides/build/**/*.mdx`

If the SDK repo is not available, read:

- [references/aomi-sdk-patterns.md](references/aomi-sdk-patterns.md)
- [references/spec-to-tools.md](references/spec-to-tools.md)

## Default Workflow

1. Identify the product surface:
   - What external API, SDK, repo, or spec is the source of truth?
   - What concrete callable surface exists: REST, GraphQL, JSON-RPC, gRPC, webhook, CLI contract, or something else?
   - Is there a real target we can point the app at: hosted service, self-hosted node, local example stack, or customer-provided endpoint?
   - Is this read-only, execution-oriented, or mixed?
   - What auth/env vars are required?
   - What user state must come from the host or caller?
   - Is this actually a public end-user API, a standard client interface exposed by a runtime/example app, or only builder-facing documentation?
2. Describe the intended user-facing toolset before implementation:
   - list the proposed tools by name
   - say what user intent each tool serves
   - call out which tools are read-only, which prepare actions, and which write or submit
   - mention any expected target URL, runtime, or host dependency
   - if the toolset is uncertain, surface the uncertainty before coding
   - identify the primary user workflow the app should make easy first
   - keep the first pass to the smallest sufficient toolset for that workflow unless the user asked for broader API coverage
3. Reduce the spec into semantically meaningful tools.
4. Scaffold or update the Aomi app using the standard file split:
   - `lib.rs` for manifest and preamble
   - `client.rs` for HTTP client, auth, models, and normalization
   - `tool.rs` for `DynAomiTool` implementations
5. Write the preamble around actual tool behavior, confirmation rules, and any host handoff.
6. Validate with the SDK build flow and add focused tests when logic is non-trivial.

## Tool Design Rules

- First decide what kind of app this should be:
  - product client
  - execution assistant
  - builder / SDK / runtime assistant
- Before implementing, state the proposed toolset in concrete user-facing terms. This is part of the design, not optional polish.
- Prefer the smallest sufficient toolset that makes the primary user workflow work end to end.
- If there are multiple plausible integration targets, briefly state which one you are choosing and why before coding.
- Prefer tools that interact with an actual product surface over tools that merely restate documentation.
- A hosted API is not required. A self-hosted service, local example stack, standard RPC server, or other runnable interface still counts as a real integration target.
- If the source material is SDK- or architecture-heavy, first ask whether it produces a service that clients call. If yes, build the client for that service.
- Only fall back to a builder-oriented or docs-oriented tool surface when no stable executable target is available.
- Do not mirror every endpoint 1:1 unless that is actually the cleanest model-facing API or the user explicitly asked for broad coverage.
- Prefer 3 to 8 tools with clear user intent boundaries such as `search_*`, `get_*`, `build_*`, `submit_*`, `list_*`, or `resolve_*`.
- Prefer intent-shaped tool names over raw protocol or transport names when practical.
- Aggregate noisy upstream endpoints behind a smaller tool surface when the model does not need the raw distinction.
- Prefer typed arguments over raw JSON string blobs when the primary workflow can be modeled cleanly that way.
- Separate core tools from escape hatches. A generic fallback tool such as `*_rpc` or `*_raw` is fine, but it should not replace a clean core workflow.
- Keep args typed and documented with `JsonSchema`. Field doc comments are model-facing and matter.
- Return stable JSON with predictable keys. Normalize upstream naming, paging, and inconsistent shapes inside `client.rs` or helper functions.
- Convert upstream errors into short actionable messages. Do not leak raw HTML, secrets, or giant payload dumps.

## File Responsibilities

### `lib.rs`

- Keep it easy to scan.
- Define `PREAMBLE` or a small `build_preamble()` hook.
- Register tools with `dyn_aomi_app!`.
- Only keep manifest-level wiring here.

### `client.rs`

- Own the app struct, HTTP client, auth headers, env vars, typed models, and response normalization.
- Prefer `reqwest::blocking::Client` with explicit timeouts for sync tools, matching the current SDK examples.
- Keep third-party API quirks here instead of spreading them across tool implementations.

### `tool.rs`

- Implement `DynAomiTool`.
- Use descriptions that tell the model when to call the tool, not just what endpoint it wraps.
- Map normalized client results into concise JSON results.
- Use `DynToolCallCtx` when host state such as connected wallet, session state, or caller attributes is needed.

## Preamble Rules

Write the preamble from the app's real contract:

- Define role, capabilities, workflow, and guardrails.
- Mention tool order for multi-step flows.
- State explicit confirmation requirements before write actions.
- If dates matter, include the current date or instruct the app to use exact dates.
- If the app relies on host wallet/signing tools, say that clearly and do not imply hidden infrastructure.

For deeper patterns and examples, read [references/aomi-sdk-patterns.md](references/aomi-sdk-patterns.md).

## Host Interop And Execution

For execution-oriented apps:

- Follow the public host conventions from `docs/host-interop.md`.
- Do not invent private namespaces or internal fallback behavior.
- When the next step belongs to the host wallet or signer, return machine-readable `SYSTEM_NEXT_ACTION` guidance.
- Preserve exact transaction or signature args when a downstream host tool must execute them.
- Do not claim a write succeeded until the upstream API submit step has actually completed.

## Validation

When working inside `aomi-sdk`:

- Scaffold with `cargo run -p xtask -- new-app <name>` if starting from scratch, or copy `sdk/examples/app-template-http`.
- Build the plugin with `cargo run -p xtask -- build-aomi --app <name>`.
- If `build-aomi` reports zero built plugins for a brand new app, check whether the new `apps/<name>/Cargo.toml` is still untracked. The current xtask prefers `git ls-files` discovery for app manifests.
- For a direct compile signal on an untracked app, use `cargo build --manifest-path apps/<name>/Cargo.toml`.
- If the app has meaningful branching or normalization logic, add unit tests with `aomi_sdk::testing::{TestCtxBuilder, run_tool, run_async_tool}`.
- If a real target is available, validate the app with a short ladder:
  - compile/build
  - connectivity check
  - one representative read flow
  - one representative write or submit flow when applicable
  - post-write verification such as status, receipt, or refreshed state
- Prefer proving one end-to-end user scenario over checking many disconnected endpoints.

When the task also touches docs or demos in `aomi-widget`, update the relevant examples or guides to match the new app behavior.

## Output Expectations

Aim to leave behind:

- a coherent Aomi app crate or patch
- typed tool args and strong descriptions
- a preamble that explains the tool contract and rules
- stable JSON outputs for the host/model
- an app that can point at a real product surface when one exists
- a short validation pass or a clear note about what could not be verified

## SDK patterns

<!-- source: github.com/aomi-labs/skills:aomi-build/references/aomi-sdk-patterns.md -->

These patterns come from the SDK example and the inspected public apps in `aomi-sdk`.

## Canonical Layout

Use this split unless there is a strong reason not to:

```text
apps/my-app/
├─ Cargo.toml
└─ src/
   ├─ lib.rs
   ├─ client.rs
   └─ tool.rs
```

- `lib.rs`: manifest, preamble, `dyn_aomi_app!`
- `client.rs`: app struct, HTTP client, auth, models, helpers
- `tool.rs`: `DynAomiTool` impls and user-facing tool surface

## Minimal Manifest Shape

```rust
use aomi_sdk::*;

mod client;
mod tool;

const PREAMBLE: &str = r#"## Role
You are ...
"#;

dyn_aomi_app!(
    app = client::MyApp,
    name = "my-app",
    version = "0.1.0",
    preamble = PREAMBLE,
    tools = [
        client::SearchThing,
        client::GetThing,
    ]
);
```

Keep `lib.rs` small. The manifest should be easy to audit at a glance.

## What The Real Apps Show

### `sdk/examples/app-template-http`

Use as the default baseline for read-only HTTP APIs.

- Simple `reqwest::blocking` client
- Clean typed args
- Small tool surface
- Straightforward JSON normalization

### `apps/x`

Use this pattern when the upstream API:

- needs an env-backed API key
- has a wrapper response envelope
- benefits from normalized data models and formatting helpers

Notable conventions:

- auth env vars live in `client.rs`
- logical API failures are normalized before reaching tools
- tools return concise, model-friendly JSON

### `apps/polymarket`

Use this pattern when the app needs:

- multiple upstream API surfaces
- dynamic preamble context such as exact current date
- intent resolution before execution
- multi-step flows with explicit user confirmation

Notable conventions:

- preamble explains exact flow order
- tool surface separates search, details, intent resolution, preview, and submit
- results include next-step hints without hiding uncertainty

### `apps/khalani`

Use this pattern when execution must hand off to host wallet tools.

Notable conventions:

- app tools never send the wallet request directly
- build tools return `SYSTEM_NEXT_ACTION`
- preamble tells the model to preserve exact host args and continue after wallet callbacks

### Executable product integrations

When the source material is mostly SDK docs, example repos, runtime notes, or architecture docs, first check whether it exposes or produces a client-facing interface such as:

- REST or GraphQL
- JSON-RPC
- gRPC
- webhooks
- a stable CLI request/response contract
- a local example service or reference node

If such a surface exists:

- build the app against that executable interface
- treat the SDK, example repo, and docs as implementation references
- expose user-useful operations against the real service, not just summaries of the docs
- validate with at least one real call when possible

### Builder-oriented fallbacks

Use a builder-oriented shape only when the source material is mostly:

- SDK documentation
- example repositories
- architecture notes
- runtime / RPC references
- config files and quickstarts

In that case:

- do not pretend there is a public swap, quote, or portfolio API unless the source really documents one
- do not hide the absence of a real integration target
- prefer tools such as `list_*_resources`, `get_*_overview`, `get_*_quickstart`, `get_*_rpc_surface`, or `get_*_network_defaults`
- make the preamble explicit that the app is a builder assistant, not an end-user trading agent
- say clearly what would be needed to upgrade the app into a real client later, such as a base URL, running example service, or customer endpoint

## Tool Authoring Checklist

Every tool should answer these:

- What user intent does it serve?
- What exact name should the model call?
- What fields does the model need to provide?
- What result shape will be easiest for the model to reason over?
- If the upstream API is inconsistent, where will normalization happen?

Prefer names like:

- `search_*`
- `get_*`
- `list_*`
- `resolve_*`
- `build_*`
- `submit_*`

## Client Conventions

Keep these in `client.rs` whenever possible:

- base URLs
- auth headers
- shared request helpers
- response envelopes
- normalization helpers
- typed upstream models

Prefer short actionable errors such as:

- `X_API_KEY environment variable not set`
- `Gamma API error 404: ...`
- `Failed to parse markets: ...`

## Validation Commands

Inside `aomi-sdk`, the repo documents these as the standard loop:

```bash
cargo run -p xtask -- new-app my-app
cargo run -p xtask -- build-aomi --app my-app
```

One caveat from practice:

- `xtask build-aomi` currently prefers tracked `apps/*/Cargo.toml` files via `git ls-files`
- a brand new untracked app can therefore compile fine but still be skipped by `build-aomi`
- use `cargo build --manifest-path apps/my-app/Cargo.toml` for an immediate compile check before the new app is tracked

For focused logic tests, use the SDK test helpers:

```rust
use aomi_sdk::testing::{TestCtxBuilder, run_tool};
```

Use `run_async_tool` only when the tool is actually async.

## Spec to tools

<!-- source: github.com/aomi-labs/skills:aomi-build/references/spec-to-tools.md -->

Use this when the input is an OpenAPI document, Swagger spec, Postman collection, endpoint list, or product brief.

It also applies when the "spec" is really one of these:

- SDK docs that link out to source repos
- runtime / RPC documentation
- example applications
- architecture notes with concrete commands, configs, and method names

## Extract First

Before writing code, pull out:

- base URL and authentication scheme
- the actual integration target the finished app should call
- main entities and identifiers
- read operations vs write operations
- pagination, filters, and search parameters
- user-specific inputs the host must provide
- confirmation or safety requirements
- rate limits, async jobs, and polling behavior
- common error shapes
- whether the docs actually publish an end-user API or mainly document a builder workflow

If a detail is missing, do not invent it. Leave a TODO or ask for the smallest missing piece.

## Find The Real Integration Target

Prefer the nearest executable product surface over explanatory documentation.

Ask these questions early:

- What will the finished app actually call?
- Is there a concrete service contract such as REST, GraphQL, JSON-RPC, gRPC, webhook delivery, or a stable CLI protocol?
- Is the target hosted, self-hosted, customer-provided, or only available through a local example stack?
- If the source is an SDK or example project, does it expose a service that clients use after the builder sets it up?

Useful rule of thumb:

- If users can point the app at a running thing, build the client for that thing.
- If no running thing exists yet, only then consider a builder or reference assistant.

## Decide The App Type Early

Choose one of these before naming tools:

- **Product client**: the source exposes a real callable product surface, even if it is self-hosted or example-backed.
- **Execution assistant**: the docs expose quote/build/submit flows and host or wallet handoff matters.
- **Builder assistant**: the docs mostly explain how to build on top of a network, SDK, or runtime.

Builder assistants are valid outcomes, but they are the fallback, not the default. If the docs mostly point to SDK repos and example stacks, first check whether those repos produce a runnable interface that the app can call.

## Map Endpoints To Model-Facing Tools

Do not default to one tool per endpoint. Instead, group endpoints by user intent.

Before implementation, write down the proposed toolset explicitly:

- tool name
- what the user would ask for that should trigger it
- key inputs
- key outputs
- whether it reads, prepares, or writes
- whether it depends on a live target, wallet, signer, or host callback

Treat this as a required checkpoint. If the proposed toolset is weak, too docs-oriented, too endpoint-shaped, or not clearly tied to user intent, revise it before writing code.

When choosing the first implementation:

- optimize for the primary user workflow first
- keep the toolset as small as possible while still making that workflow work end to end
- prefer app-specific high-value actions over broad protocol coverage when the source makes the important workflow obvious
- avoid schema or discovery tools unless they are needed to support the chosen workflow
- only mirror the wider API surface if the user asked for broad coverage

Good mappings:

- several lookup endpoints -> `search_*` or `get_*`
- multiple list and detail calls -> `resolve_*` then `get_*`
- quote + build + submit endpoints -> `get_*_quote`, `build_*`, `submit_*`
- create side effects -> preview/build first, then explicit submit after confirmation
- standard runtime interfaces -> wrap the standard methods first, then add extension hooks or custom methods
- SDK + example repo + config + RPC docs -> `list_*_resources`, `get_*_overview`, `get_*_quickstart`, `get_*_rpc_surface`, `get_*_defaults`
- example-backed transactional app -> one health/connectivity tool, a few read tools for key state, one write tool for the main action, and one verification tool for the outcome

Less useful mappings:

- raw REST verbs as tool names
- exposing every transport detail directly to the model
- returning unnormalized upstream payloads when only 20 percent of the fields matter
- choosing a docs-summary tool surface when a real client could be built instead
- inventing public user actions that are not actually documented by the source
- building a large first-pass toolset before proving the primary user workflow

## Preamble Rubric

A strong preamble usually includes:

- `## Role`
- `## Capabilities`
- `## Workflow`
- `## Rules`

For execution apps, spell out:

- when confirmation is required
- which tool comes first
- which tool hands off to the wallet or host
- what must be preserved exactly between steps

## Output Shape Rubric

Return the minimum stable JSON the model needs for the next step.

Good result shapes often include:

- a top-level echo of the key input
- normalized identifiers
- concise summaries
- arrays of candidate objects
- `requires_selection`, `selection_reason`, or `next_step_hint` when ambiguity remains
- `SYSTEM_NEXT_ACTION` when the host must take over

Avoid:

- leaking auth credentials
- giant raw payloads
- mixed naming conventions from multiple upstream APIs
- claiming success before the final submit step succeeds

## Suggested Build Loop

1. Read the spec and summarize the app contract.
2. Identify the concrete service or runtime target.
3. Propose the tool surface in concrete user-facing terms.
4. Scaffold or patch `lib.rs`, `client.rs`, and `tool.rs`.
5. Normalize auth, models, and errors in `client.rs`.
6. Implement small, strongly typed tools.
7. Build and test.
8. If the target is available, verify a short end-to-end scenario:
   - connectivity
   - key read
   - key write when applicable
   - post-write verification
9. Update docs or examples if the repo includes them.

If the app is brand new in `aomi-sdk`, remember that `cargo run -p xtask -- build-aomi --app <name>` may skip an untracked app. A direct `cargo build --manifest-path apps/<name>/Cargo.toml` is the fastest compile check until the manifest is tracked.



## Adding a chat frontend

If the user also asked for a chat UI to interact with the app you just built, you have two options.

### Option A — Bundled widget (fastest, "ChatGPT-style" out of the box)

Install the prebuilt `AomiFrame` widget into a Next.js + Tailwind + shadcn project:

```bash
npx shadcn add https://aomi.dev/r/aomi-frame.json
```

Then render it on a page:

```tsx
import { AomiFrame } from "@/components/aomi-frame";

export default function ChatPage() {
  return (
    <div style={{ height: "100vh" }}>
      <AomiFrame
        backendUrl={process.env.NEXT_PUBLIC_BACKEND_URL!}
        height="100%"
      />
    </div>
  );
}
```

Set `NEXT_PUBLIC_BACKEND_URL=https://api.aomi.dev` in `.env.local`. To target the app you just built instead of the default, pass `app="<your-app-name>"` to `AomiFrame` or set it from the ControlBar UI.

Full quickstart with wallet integration: <https://aomi.dev/docs/build/quickstart.md>

### Option B — Headless React library (custom UI, your own components)

When the user wants a sidebar layout, embedded inline chat, or non-chat UI shapes, install the headless library and wire your own components on top:

```bash
pnpm install @aomi-labs/react
```

Then read:
- <https://aomi.dev/docs/build/ui/headless/install.md> — runtime setup
- <https://aomi.dev/docs/build/ui/headless/runtime-provider.md> — provider that holds backend connection, session, tool state
- <https://aomi.dev/docs/build/ui/headless/hooks.md> — React hooks for chat, tools, sessions
- <https://aomi.dev/docs/build/ui/headless/build-custom-ui.md> — composer / message-list / tool-view patterns

### When to pick which

| Need                               | Use                                                 |
| ---------------------------------- | --------------------------------------------------- |
| Working chat in <30 min            | Bundled widget (Option A)                           |
| Branded but ChatGPT-shaped         | Bundled widget + theming overrides                  |
| Sidebar / inline / non-chat layout | Headless library (Option B)                         |
| Replace specific UI parts only     | Bundled widget + override individual sub-components |

## Deeper reference (fetch these only if you need them)

- API reference (HTTP backend): <https://aomi.dev/docs/build/services/api-reference.md>
- Building apps overview: <https://aomi.dev/docs/build/services/building-apps.md>
- Namespaces and tool naming: <https://aomi.dev/docs/build/namespaces.md>
- SDK reference (React): <https://aomi.dev/docs/reference/sdk.md>
- Architecture: <https://aomi.dev/docs/reference/architecture.md>
- Account abstraction (for execution apps): <https://aomi.dev/docs/reference/account-abstraction.md>
- Sessions and state: <https://aomi.dev/docs/build/services/sessions.md>

## Verification

After scaffolding the app:

```bash
# From the aomi-sdk root, with the new app at apps/<name>/
cargo build --manifest-path apps/<name>/Cargo.toml
cargo run -p xtask -- build-aomi --app <name>
```

If `build-aomi` reports zero built plugins for a brand-new app, the manifest is probably untracked by git — `build-aomi` uses `git ls-files` for discovery. `cargo build --manifest-path apps/<name>/Cargo.toml` is the fastest direct compile signal until that's fixed.

## Source

- Skills repo (canonical): <https://github.com/aomi-labs/skills>
- Widget + landing repo: <https://github.com/aomi-labs/aomi-widget>
- Full corpus (every doc + both skills): <https://aomi.dev/llms-full.txt>

