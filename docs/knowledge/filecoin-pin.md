---
title: Filecoin Pin
source: https://github.com/filecoin-project/filecoin-pin
updated: 2026-05-16
---

# Filecoin Pin

Filecoin Pin is the official package Agenetics should use for IPFS/Filecoin persistence.

Useful integration points:

- CLI: `npm install -g filecoin-pin`, then `filecoin-pin add <path>`.
- Library: `npm install --save filecoin-pin`, then import high-level helpers from `filecoin-pin`.
- Upload flow: create a UnixFS CAR with `createCarFromPath`, initialize Filecoin access with
  `initializeSynapse`, then call `executeUpload`.
- Auth: `PRIVATE_KEY=0x...` or `--private-key`; session key mode uses `WALLET_ADDRESS` and
  `SESSION_KEY`.
- Network: mainnet by default; `NETWORK=calibration` or `--network calibration` for testnet.

The package wraps Synapse SDK internally. Use the package surface first; only drop to lower-level
Synapse APIs if Filecoin Pin does not expose the needed behavior.
