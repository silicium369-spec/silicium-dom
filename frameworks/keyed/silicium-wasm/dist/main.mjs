// SPDX-License-Identifier: LicenseRef-Silicium-Community-1.0
// Protected under Patent Pending (The Silicium Authors). All rights reserved.

const T0 = [
  "pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint",
  "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly",
  "adorable", "important", "inexpensive", "cheap", "expensive", "fancy",
];
const T1 = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
const T2 = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];

const ROW_HTML =
  '<tr><td class="col-md-1"> </td><td class="col-md-4"><a class="lbl"> </a></td><td class="col-md-1"><a><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a></td><td class="col-md-6"></td></tr>';

function synthesizeWasmLabel(code) {
  const base =
    T0[code & 0x1f] +
    " " +
    T1[(code >>> 5) & 0x0f] +
    " " +
    T2[(code >>> 9) & 0x0f];
  return (code & 0x2000) !== 0 ? base + " !!!" : base;
}

export class SiliciumDomEngine {
  static async init(wasmSource = new URL("./silicium_dom.wasm", import.meta.url)) {
    if (wasmSource instanceof WebAssembly.Module) {
      return new SiliciumDomEngine(await WebAssembly.instantiate(wasmSource, {}));
    }
    const buffer =
      typeof wasmSource === "string" || wasmSource instanceof URL
        ? await (await fetch(wasmSource)).arrayBuffer()
        : wasmSource;
    const { instance } = await WebAssembly.instantiate(buffer, {});
    return new SiliciumDomEngine(instance);
  }

  constructor(instance) {
    this.abi = instance.exports;
    this.memory = this.abi.memory;
    this.abi.silici_dom_init();
  }

  get count() {
    return this.abi.silici_dom_get_count() >>> 0;
  }

  getRowView() {
    const count = this.count;
    const idsPtr = this.abi.silici_dom_get_ids_ptr() >>> 0;
    const labelsPtr = this.abi.silici_dom_get_labels_ptr() >>> 0;
    return {
      count,
      ids: new Uint32Array(this.memory.buffer, idsPtr, count),
      labelIndices: new Uint16Array(this.memory.buffer, labelsPtr, count),
    };
  }

  buildRows(count) {
    this.abi.silici_dom_build_rows(count >>> 0);
    return this.getRowView();
  }

  appendRows(count) {
    this.abi.silici_dom_append_rows(count >>> 0);
    return this.getRowView();
  }

  updateEvery10th() {
    this.abi.silici_dom_update_partial_10();
    return this.getRowView();
  }

  swapRows(indexA, indexB) {
    return this.abi.silici_dom_swap_rows(indexA >>> 0, indexB >>> 0) === 1;
  }

  selectRow(rowId) {
    return this.abi.silici_dom_select_row(rowId >>> 0) === 1;
  }

  deleteRow(rowId) {
    return this.abi.silici_dom_delete_row(rowId >>> 0) === 1;
  }

  clear() {
    this.abi.silici_dom_clear();
  }

  validateHtmlTagGrammar(utf8Bytes) {
    const scratchOffset = 65536;
    new Uint8Array(this.memory.buffer, scratchOffset, utf8Bytes.length).set(utf8Bytes);
    return this.abi.silici_dom_check_html_tag(scratchOffset, utf8Bytes.length) >>> 0;
  }

  decodeLabel(labelCode) {
    return synthesizeWasmLabel(labelCode);
  }
}

export class SiliciumDataGridController {
  constructor(engine, container, props = {}) {
    this.engine = engine;
    this.keyed = props.keyed ?? true;
    this.rows = [];
    this.idNodes = [];
    this.labelNodes = [];
    this.rowIds = new Uint32Array(16384);
    this.selectedTr = null;

    const doc = container.ownerDocument;
    const tpl1 = doc.createElement("template");
    tpl1.innerHTML = ROW_HTML;
    this.tplRow = tpl1.content.firstChild;

    const tpl16 = doc.createElement("template");
    tpl16.innerHTML = ROW_HTML.repeat(16);
    this.tplChunk16 = tpl16.content;

    const tpl64 = doc.createElement("template");
    tpl64.innerHTML = ROW_HTML.repeat(64);
    this.tplChunk64 = tpl64.content;

    const existingTbody = container.tagName === "TBODY" ? container : container.querySelector("tbody");
    if (existingTbody) {
      this.tbody = existingTbody;
      this.table = existingTbody.closest("table") || container;
    } else {
      const table = doc.createElement("table");
      table.className = "table table-hover table-striped test-data";
      this.tbody = doc.createElement("tbody");
      this.tbody.id = "tbody";
      table.appendChild(this.tbody);
      container.appendChild(table);
      this.table = table;
    }

    this.handleClick = this.handleClick.bind(this);
    this.table.addEventListener("click", this.handleClick);
  }

  bindChunk(firstTr, startIdx, endIdx, ids, labels) {
    let tr = firstTr;
    const rows = this.rows;
    const idNodes = this.idNodes;
    const labelNodes = this.labelNodes;
    const rowIds = this.rowIds;
    for (let i = startIdx; i < endIdx && tr; i++) {
      const tdId = tr.firstChild;
      const idNode = tdId.firstChild;
      const labelNode = tdId.nextSibling.firstChild.firstChild;
      const idVal = ids[i];
      const code = labels[i];
      idNode.nodeValue = "" + idVal;
      labelNode.nodeValue =
        T0[code & 0x1f] +
        " " +
        T1[(code >>> 5) & 0x0f] +
        " " +
        T2[(code >>> 9) & 0x0f];
      rows[i] = tr;
      idNodes[i] = idNode;
      labelNodes[i] = labelNode;
      rowIds[i] = idVal;
      tr = tr.nextSibling;
    }
  }

  buildDetachedFragment(startIdx, totalCount, ids, labels) {
    const fragment = this.tbody.ownerDocument.createDocumentFragment();
    let cursor = startIdx;

    while (cursor + 64 <= totalCount) {
      const frag64 = this.tplChunk64.cloneNode(true);
      this.bindChunk(frag64.firstChild, cursor, cursor + 64, ids, labels);
      fragment.appendChild(frag64);
      cursor += 64;
    }

    while (cursor + 16 <= totalCount) {
      const frag16 = this.tplChunk16.cloneNode(true);
      this.bindChunk(frag16.firstChild, cursor, cursor + 16, ids, labels);
      fragment.appendChild(frag16);
      cursor += 16;
    }

    while (cursor < totalCount) {
      const tr = this.tplRow.cloneNode(true);
      const tdId = tr.firstChild;
      const idNode = tdId.firstChild;
      const labelNode = tdId.nextSibling.firstChild.firstChild;
      const idVal = ids[cursor];
      const code = labels[cursor];
      idNode.nodeValue = "" + idVal;
      labelNode.nodeValue =
        T0[code & 0x1f] +
        " " +
        T1[(code >>> 5) & 0x0f] +
        " " +
        T2[(code >>> 9) & 0x0f];
      this.rows[cursor] = tr;
      this.idNodes[cursor] = idNode;
      this.labelNodes[cursor] = labelNode;
      this.rowIds[cursor] = idVal;
      fragment.appendChild(tr);
      cursor++;
    }

    return fragment;
  }

  mountRange(startIdx, totalCount, ids, labels) {
    const fragment = this.buildDetachedFragment(startIdx, totalCount, ids, labels);
    this.tbody.appendChild(fragment);
  }

  render(countOrRows, isAppend = false) {
    const count = typeof countOrRows === "number" ? countOrRows : countOrRows.length;
    const view = isAppend ? this.engine.appendRows(count) : this.engine.buildRows(count);
    if (view.count > this.rowIds.length) {
      const next = new Uint32Array(view.count + 4096);
      next.set(this.rowIds);
      this.rowIds = next;
    }

    if (isAppend) {
      const prevLen = this.rows.length;
      this.rows.length = view.count;
      this.idNodes.length = view.count;
      this.labelNodes.length = view.count;
      this.mountRange(prevLen, view.count, view.ids, view.labelIndices);
      return view;
    }

    if (this.selectedTr) {
      this.selectedTr.className = "";
      this.selectedTr = null;
    }

    const prevLen = this.rows.length;
    if (prevLen === 0 || (this.keyed && view.count > 0 && this.rowIds[0] !== view.ids[0])) {
      this.rows.length = view.count;
      this.idNodes.length = view.count;
      this.labelNodes.length = view.count;
      const fragment = this.buildDetachedFragment(0, view.count, view.ids, view.labelIndices);
      this.tbody.replaceChildren(fragment);
      return view;
    }

    const sharedLen = prevLen < view.count ? prevLen : view.count;
    for (let i = 0; i < sharedLen; i++) {
      const idVal = view.ids[i];
      this.idNodes[i].nodeValue = "" + idVal;
      this.labelNodes[i].nodeValue = synthesizeWasmLabel(view.labelIndices[i]);
      this.rowIds[i] = idVal;
    }

    if (view.count > prevLen) {
      this.rows.length = view.count;
      this.idNodes.length = view.count;
      this.labelNodes.length = view.count;
      this.mountRange(prevLen, view.count, view.ids, view.labelIndices);
    } else if (view.count < prevLen) {
      for (let i = prevLen - 1; i >= view.count; i--) {
        this.rows[i].remove();
      }
      this.rows.length = view.count;
      this.idNodes.length = view.count;
      this.labelNodes.length = view.count;
    }
    return view;
  }

  append(count) {
    return this.render(count, true);
  }

  updateEvery10th() {
    const view = this.engine.updateEvery10th();
    for (let i = 0; i < this.rows.length; i += 10) {
      this.labelNodes[i].nodeValue += " !!!";
    }
    return view;
  }

  swapRows(indexA = 1, indexB = 998) {
    if (this.rows.length <= indexB || !this.engine.swapRows(indexA, indexB)) return false;
    const trA = this.rows[indexA];
    const trB = this.rows[indexB];
    trB.className = this.selectedTr === trB ? "danger" : "";
    trA.className = this.selectedTr === trA ? "danger" : "";
    this.tbody.insertBefore(trB, this.rows[indexA + 1]);
    this.tbody.insertBefore(trA, this.rows[indexB + 1]);
    this.rows[indexA] = trB;
    this.rows[indexB] = trA;
    [this.idNodes[indexA], this.idNodes[indexB]] = [this.idNodes[indexB], this.idNodes[indexA]];
    [this.labelNodes[indexA], this.labelNodes[indexB]] = [this.labelNodes[indexB], this.labelNodes[indexA]];
    const idA = this.rowIds[indexA];
    this.rowIds[indexA] = this.rowIds[indexB];
    this.rowIds[indexB] = idA;
    return true;
  }

  selectRowAt(rowIndex) {
    const tr = this.rows[rowIndex];
    if (!tr) return;
    if (this.selectedTr) this.selectedTr.className = "";
    this.selectedTr = tr;
    tr.className = "danger";
    this.engine.selectRow(this.rowIds[rowIndex]);
  }

  deleteRowAt(rowIndex) {
    const tr = this.rows[rowIndex];
    if (!tr) return;
    this.engine.deleteRow(this.rowIds[rowIndex]);
    this.rows.splice(rowIndex, 1);
    this.idNodes.splice(rowIndex, 1);
    this.labelNodes.splice(rowIndex, 1);
    this.rowIds.copyWithin(rowIndex, rowIndex + 1, this.rows.length + 1);
    if (this.selectedTr === tr) this.selectedTr = null;
    tr.remove();
  }

  handleClick(e) {
    let target = e.target;
    if (target && target.tagName === "SPAN") {
      target = target.parentNode;
    }
    if (target && target.tagName === "A") {
      const tr = target.closest("tr");
      if (!tr) return;
      const idx = tr.sectionRowIndex;
      if (idx < 0 || idx >= this.rows.length) return;
      if (target.classList.contains("lbl") || target.firstChild?.nodeValue) {
        this.selectRowAt(idx);
      } else {
        this.deleteRowAt(idx);
      }
    }
  }

  clear() {
    this.engine.clear();
    if (this.tbody.firstChild) this.tbody.textContent = "";
    this.rows.length = 0;
    this.idNodes.length = 0;
    this.labelNodes.length = 0;
    this.selectedTr = null;
  }
}

export async function mountSiliciumDataGrid(container, props = {}) {
  const engine = await SiliciumDomEngine.init(props.wasmSource);
  const grid = new SiliciumDataGridController(engine, container, props);
  if (props.rows) grid.render(props.rows, false);
  return grid;
}

export async function mountKrausestBenchmarkApp(
  doc = document,
  wasmSource = new URL("./silicium_dom.wasm", import.meta.url)
) {
  const tbody = doc.getElementById("tbody");
  const grid = await mountSiliciumDataGrid(tbody, { keyed: true, wasmSource });
  doc.getElementById("run")?.addEventListener("click", () => grid.render(1000, false));
  doc.getElementById("runlots")?.addEventListener("click", () => grid.render(10000, false));
  doc.getElementById("add")?.addEventListener("click", () => grid.append(1000));
  doc.getElementById("update")?.addEventListener("click", () => grid.updateEvery10th());
  doc.getElementById("clear")?.addEventListener("click", () => grid.clear());
  doc.getElementById("swaprows")?.addEventListener("click", () => grid.swapRows(1, 998));
  return grid;
}

export function SiliciumDataGrid(props) {
  if (props.container) {
    void mountSiliciumDataGrid(props.container, props);
  }
  return {
    $$typeof: Symbol.for("react.element"),
    type: SiliciumDataGrid,
    props,
    key: null,
    mount: (container) => mountSiliciumDataGrid(container, props),
  };
}

// --- Client Adapter (src/main.mjs) ---
// SPDX-License-Identifier: LicenseRef-Silicium-Community-1.0
// Protected under Patent Pending (The Silicium Authors). All rights reserved.


const tbody = document.getElementById("tbody");
const wasmSource = new URL("./silicium_dom.wasm", import.meta.url);
const grid = await mountSiliciumDataGrid(tbody, { keyed: true, wasmSource });

document.getElementById("run").addEventListener("click", () => grid.render(1000, false));
document.getElementById("runlots").addEventListener("click", () => grid.render(10000, false));
document.getElementById("add").addEventListener("click", () => grid.append(1000));
document.getElementById("update").addEventListener("click", () => grid.updateEvery10th());
document.getElementById("clear").addEventListener("click", () => grid.clear());
document.getElementById("swaprows").addEventListener("click", () => grid.swapRows(1, 998));
