# TODO

- [x] Implement the live/judged V1 execution path end to end.
  `npm run demo:live` now writes `demo/live-output/summary.json` when given complete live evidence. Producing the real external evidence is tracked by the deployment, registry, Filecoin Pay, and Aomi items below.

- [x] Restore root project verifiability.
  Root dependencies are installed through Node 24, `package-lock.json` exists, and `npm test`, `npm run typecheck`, and `npm run contracts:compile` pass.

- [ ] Replace the TypeScript local registry path with real registry contract submission/status checks.
  The Solidity registry exists, but the CLI path still uses local attestation state and synthetic transaction hashes.

- [ ] Implement Filecoin Pay as a real wallet/payment flow.
  Purchases still record a `filecoinPayReference` string rather than executing or verifying a Filecoin Pay path.

- [ ] Produce a complete live deployment receipt.
  `deployments/live-v1.json` is ignored and the current local copy lacks contract addresses and receipt block numbers. `npm run demo:live` now rejects incomplete receipts, but a fresh live deployment still needs to produce the real receipt.

- [x] Make the web dashboard lint and build clean.
  Dashboard types were tightened, the summary source is visible, and `cd web && npm run lint` plus `cd web && npm run build` pass.

- [x] Replace the Aomi scaffold with a real SDK-specific `DynAomiTool` plugin.
  The Rust crate now registers the Agentex Aomi app, exposes typed participant-agent tools, calls the Agentex HTTP service, and preserves host handoff for confirmed write flows.
