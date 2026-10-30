# Statutory Patent & Intellectual Property Notice

SPDX-License-Identifier: LicenseRef-Silicium-Community-1.0

Protected under Patent Pending (including national and international PCT patent applications). All rights reserved.

## 1. Express Patent Exclusion (Zero Implied Patent Grant)

Nothing in the **Silicium Community & Evaluation Software License 1.0 (`SCSL-1.0` / `LicenseRef-Silicium-Community-1.0`)** grants any express or implied license, immunity, or right under any patent or patent application covering:
- Cache-line aligned (`64B`) contiguous column-oriented DOM row stores confined within primary processor data cache (`<= 32 KB`) with zero hot-path heap allocations (`malloc = 0`);
- Sub-word parallel (`SWAR`) and vectorized (`SIMD`) tag delimiter scanning and deterministic finite-state grammar transition tables in primary data cache;
- Division-free modular indexing and direct linear memory pointer projection across WebAssembly and native C-ABI boundaries.

## 2. Horizontal Bi-Edition Boundary

- **Community Single-Node Binary Edition (`bin/silicium_dom.wasm` & `bin/libsilicium_dom_arena.so`)**:
  Licensed under `LicenseRef-Silicium-Community-1.0` (`LICENSE`) for non-commercial evaluation, personal projects, and benchmark verification.
- **Enterprise Production & DataGrid SDK Edition (`@silicium/dom-enterprise`)**:
  Requires a commercial **Silicium Enterprise License** (`silicium369@gmail.com`) for commercial SaaS deployment, multi-worker `SharedArrayBuffer` SIMD128 acceleration, and enterprise support.

## 3. Defensive Patent Revocation

Any patent assertion, litigation, or administrative validity challenge initiated against the Licensor or the Software triggers immediate and retroactive termination of all software and evaluation grants pursuant to **SHIELD 5** of `LICENSE`.
