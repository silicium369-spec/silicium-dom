// SPDX-License-Identifier: LicenseRef-Silicium-Community-1.0
// Protected under Patent Pending (The Silicium Authors). All rights reserved.

import { mountSiliciumDataGrid } from "silicium-dom";

const ADJECTIVES = [
  "pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint",
  "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly",
  "adorable", "important", "inexpensive", "cheap", "expensive", "fancy",
];
const COLOURS = [
  "red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange",
];
const NOUNS = [
  "table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger",
  "pizza", "mouse", "keyboard",
];

const ROW_HTML =
  '<tr><td class="col-md-1"></td><td class="col-md-4"><a class="lbl"></a></td><td class="col-md-1"><a><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a></td><td class="col-md-6"></td></tr>';

let nextId = 1;

export function _random(max) {
  return Math.round(Math.random() * 1000) % max;
}

export function buildData(count) {
  const data = new Array(count);
  for (let i = 0; i < count; i++) {
    data[i] = {
      id: nextId++,
      label:
        ADJECTIVES[_random(ADJECTIVES.length)] +
        " " +
        COLOURS[_random(COLOURS.length)] +
        " " +
        NOUNS[_random(NOUNS.length)],
    };
  }
  return data;
}

const tbody = document.getElementById("tbody");
const wasmSource = new URL("./silicium_dom.wasm", import.meta.url);
const grid = await mountSiliciumDataGrid(tbody, { keyed: true, rowHtml: ROW_HTML, wasmSource });

document.getElementById("run").addEventListener("click", () => grid.render(1000, false));
document.getElementById("runlots").addEventListener("click", () => grid.render(10000, false));
document.getElementById("add").addEventListener("click", () => grid.append(1000));
document.getElementById("update").addEventListener("click", () => grid.updateEvery10th());
document.getElementById("clear").addEventListener("click", () => grid.clear());
document.getElementById("swaprows").addEventListener("click", () => grid.swapRows(1, 998));
