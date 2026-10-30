---
name: "silicium-dom-arena"
description: "Agent-native CLI & Dual-Engine evaluation harness for silicium-dom (silicium-dom-arena, Community Edition, SCSL-1.0). Supports machine-readable JSON output (--json) and deterministic WebAssembly + V8 Keyed DOM verification."
---

<skill id="silicium-dom-arena" version="1.0" mode="AGENT_NATIVE_CLI">

# silicium-dom-arena (`silicium-dom`)

Agent-native command-line interface and Dual-Engine (`WebAssembly` + `Pure V8`) evaluation harness for **silicium-dom-arena** (`silicium-dom` on npm).

- **Developer**: Silicium Architecture Research Team (`silicium369@gmail.com`)
- **License**: Silicium Community & Evaluation License v1.0 (`SCSL-1.0` — Octa-Shield Edition, SPDX: `LicenseRef-Silicium-Community-1.0`)
- **Patent Notice**: Protected under Patent Pending. All rights reserved.

## Discovery & Machine-Readable Output

Pass `--help` or `--json` to `reproduce_all.sh` to inspect commands and emit structured JSON telemetry on `stdout`:

```bash
bash reproduce_all.sh --help
bash reproduce_all.sh --json
bash reproduce_all.sh --smoke
```

## Dual-Engine SDK & Standalone `krausest/js-framework-benchmark` Entrypoints

- **Engine 1 (Pure V8 Synchronous TypedArray Keyed DOM)**: `silicium-dom/v8` (`./sdk/silicium_v8_dom.mjs`, root `./v8_index.html`, standalone upstream directory `./frameworks/keyed/silicium-v8/`)
- **Engine 2 (WebAssembly Zero-Copy Keyed DOM)**: `silicium-dom` (`./sdk/silicium_dom.mjs` + `./bin/silicium_dom.wasm`, root `./index.html`, standalone upstream directory `./frameworks/keyed/silicium-wasm/`)

## Community Hardware Envelope (`SCSL-1.0`)

The Community Edition operates within the single-node evaluation envelope (up to 16,384 static DOM rows, 1 physical CPU socket, 32 logical cores, and `127.0.0.1` loopback binding).

</skill>
