// SPDX-License-Identifier: LicenseRef-Silicium-Community-1.0
// Protected under Patent Pending (The Silicium Authors). All rights reserved.

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const payloadRoot = resolve(scriptsDir, "..");

const wasmFwDir = join(payloadRoot, "frameworks", "keyed", "silicium-wasm");
const v8FwDir = join(payloadRoot, "frameworks", "keyed", "silicium-v8");

mkdirSync(join(wasmFwDir, "src"), { recursive: true });
mkdirSync(join(v8FwDir, "src"), { recursive: true });

// 1. Copy legal shields (SCSL-1.0 / PATENTS.md / CLA.md) into each standalone framework directory
for (const legalFile of ["LICENSE", "PATENTS.md", "CLA.md"]) {
  const srcLegal = join(payloadRoot, legalFile);
  if (existsSync(srcLegal)) {
    copyFileSync(srcLegal, join(wasmFwDir, legalFile));
    copyFileSync(srcLegal, join(v8FwDir, legalFile));
  }
}

// 2. Execute each standalone framework's build-prod.mjs (links 15-line src/main.mjs with silicium-dom SDK)
execFileSync(process.execPath, [join(wasmFwDir, "build-prod.mjs")], { stdio: "inherit" });
execFileSync(process.execPath, [join(v8FwDir, "build-prod.mjs")], { stdio: "inherit" });
