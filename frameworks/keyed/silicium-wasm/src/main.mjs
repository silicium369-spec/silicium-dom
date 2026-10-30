// SPDX-License-Identifier: LicenseRef-Silicium-Community-1.0
// Protected under Patent Pending (The Silicium Authors). All rights reserved.

import { mountSiliciumDataGrid } from "silicium-dom";

const tbody = document.getElementById("tbody");
const wasmSource = new URL("./silicium_dom.wasm", import.meta.url);
const grid = await mountSiliciumDataGrid(tbody, { keyed: true, wasmSource });

document.getElementById("run").addEventListener("click", () => grid.render(1000, false));
document.getElementById("runlots").addEventListener("click", () => grid.render(10000, false));
document.getElementById("add").addEventListener("click", () => grid.append(1000));
document.getElementById("update").addEventListener("click", () => grid.updateEvery10th());
document.getElementById("clear").addEventListener("click", () => grid.clear());
document.getElementById("swaprows").addEventListener("click", () => grid.swapRows(1, 998));
