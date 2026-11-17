// SPDX-License-Identifier: LicenseRef-Silicium-Community-1.0
// Protected under Patent Pending (The Silicium Authors). All rights reserved.

const T0 = [
  "pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint",
  "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly",
  "adorable", "important", "inexpensive", "cheap", "expensive", "fancy",
];
const T1 = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
const T2 = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];

export const DEFAULT_ROW_HTML =
  '<tr><td class="col-md-1"></td><td class="col-md-4"><a class="lbl"></a></td><td class="col-md-1"><a><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a></td><td class="col-md-6"></td></tr>';

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
  static async init(wasmSource = new URL("../bin/silicium_dom.wasm", import.meta.url)) {
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
    this._cachedBuffer = null;
    this._cachedIdsPtr = 0;
    this._cachedLabelsPtr = 0;
    this._cachedIdsView = null;
    this._cachedLabelsView = null;
    this.abi.silici_dom_init();
  }

  get count() {
    return this.abi.silici_dom_get_count() >>> 0;
  }

  getRowView() {
    const count = this.count;
    const buf = this.memory.buffer;
    const idsPtr = this.abi.silici_dom_get_ids_ptr() >>> 0;
    const labelsPtr = this.abi.silici_dom_get_labels_ptr() >>> 0;
    if (buf !== this._cachedBuffer || idsPtr !== this._cachedIdsPtr || labelsPtr !== this._cachedLabelsPtr) {
      this._cachedBuffer = buf;
      this._cachedIdsPtr = idsPtr;
      this._cachedLabelsPtr = labelsPtr;
      this._cachedIdsView = new Uint32Array(buf, idsPtr);
      this._cachedLabelsView = new Uint16Array(buf, labelsPtr);
    }
    return {
      count,
      ids: this._cachedIdsView,
      labelIndices: this._cachedLabelsView,
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

function extractStencilPointers(root, count, doc = document) {
  const idNodes = new Array(count);
  const labelNodes = new Array(count);
  let tr = root.firstChild;
  for (let i = 0; i < count && tr; i++) {
    const tdId = tr.firstChild;
    const idNode = tdId.firstChild || tdId.appendChild(doc.createTextNode(""));
    const anchor = tdId.nextSibling.firstChild;
    const lblNode = anchor.firstChild || anchor.appendChild(doc.createTextNode(""));
    idNodes[i] = idNode;
    labelNodes[i] = lblNode;
    tr = tr.nextSibling;
  }
  return { idNodes, labelNodes };
}

export class SiliciumDataGridController {
  constructor(engine, container, props = {}) {
    this.engine = engine;
    this.keyed = props.keyed ?? true;
    this._rowsCache = [];
    this.rowsDirty = true;
    this.idNodes = [];
    this.labelNodes = [];
    this.decimatedLabelNodes10 = [];
    this.decimatedLabels10 = [];
    this.decimatedDirty = true;
    this.rowIds = new Uint32Array(1024);
    this.selectedTr = null;

    const rowHtml = props.rowHtml || DEFAULT_ROW_HTML;
    const doc = container.ownerDocument || document;
    const tpl1 = doc.createElement("template");
    tpl1.innerHTML = rowHtml;
    this.tplRow = tpl1.content.firstChild;
    const tdId1 = this.tplRow.firstChild;
    this.stencilIdNode1 = tdId1.firstChild || tdId1.appendChild(doc.createTextNode(""));
    const anchor1 = tdId1.nextSibling.firstChild;
    this.stencilLabelNode1 = anchor1.firstChild || anchor1.appendChild(doc.createTextNode(""));

    const tpl8 = doc.createElement("template");
    tpl8.innerHTML = rowHtml.repeat(8);
    this.tplChunk8 = tpl8.content;
    const st8 = extractStencilPointers(this.tplChunk8, 8, doc);
    this.stencilIdNodes8 = st8.idNodes;
    this.stencilLabelNodes8 = st8.labelNodes;

    const tpl16 = doc.createElement("template");
    tpl16.innerHTML = rowHtml.repeat(16);
    this.tplChunk16 = tpl16.content;
    const st16 = extractStencilPointers(this.tplChunk16, 16, doc);
    this.stencilIdNodes16 = st16.idNodes;
    this.stencilLabelNodes16 = st16.labelNodes;

    const tpl64 = doc.createElement("template");
    tpl64.innerHTML = rowHtml.repeat(64);
    this.tplChunk64 = tpl64.content;
    const st64 = extractStencilPointers(this.tplChunk64, 64, doc);
    this.stencilIdNodes64 = st64.idNodes;
    this.stencilLabelNodes64 = st64.labelNodes;

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
    this.tbody.addEventListener("click", this.handleClick);
  }

  get rows() {
    if (this.rowsDirty) {
      this._rowsCache = Array.from(this.tbody.children || this.tbody.childNodes || []);
      this.rowsDirty = false;
    }
    return this._rowsCache;
  }

  set rows(val) {
    this._rowsCache = val;
    this.rowsDirty = false;
  }

  ensureIdsCapacity(size) {
    if (size > this.rowIds.length) {
      const next = new Uint32Array(Math.max(size, this.rowIds.length * 2));
      next.set(this.rowIds);
      this.rowIds = next;
    }
  }

  unrolledWalkerWasm(idNodes, labelNodes, count, startIdx, ids, labels) {
    const rowIds = this.rowIds;
    let j = 0;
    let i = startIdx;

    for (; j + 4 <= count; j += 4, i += 4) {
      const id0 = ids[i];
      const c0 = labels[i];
      idNodes[j].data = id0;
      labelNodes[j].data = T0[c0 & 0x1f] + " " + T1[(c0 >>> 5) & 0x0f] + " " + T2[(c0 >>> 9) & 0x0f];
      rowIds[i] = id0;

      const id1 = ids[i + 1];
      const c1 = labels[i + 1];
      idNodes[j + 1].data = id1;
      labelNodes[j + 1].data = T0[c1 & 0x1f] + " " + T1[(c1 >>> 5) & 0x0f] + " " + T2[(c1 >>> 9) & 0x0f];
      rowIds[i + 1] = id1;

      const id2 = ids[i + 2];
      const c2 = labels[i + 2];
      idNodes[j + 2].data = id2;
      labelNodes[j + 2].data = T0[c2 & 0x1f] + " " + T1[(c2 >>> 5) & 0x0f] + " " + T2[(c2 >>> 9) & 0x0f];
      rowIds[i + 2] = id2;

      const id3 = ids[i + 3];
      const c3 = labels[i + 3];
      idNodes[j + 3].data = id3;
      labelNodes[j + 3].data = T0[c3 & 0x1f] + " " + T1[(c3 >>> 5) & 0x0f] + " " + T2[(c3 >>> 9) & 0x0f];
      rowIds[i + 3] = id3;
    }

    for (; j < count; j++, i++) {
      const idVal = ids[i];
      const code = labels[i];
      idNodes[j].data = idVal;
      labelNodes[j].data = T0[code & 0x1f] + " " + T1[(code >>> 5) & 0x0f] + " " + T2[(code >>> 9) & 0x0f];
      rowIds[i] = idVal;
    }
  }

  populateTarget(target, startIdx, totalCount, ids, labels) {
    let cursor = startIdx;

    while (cursor + 64 <= totalCount) {
      this.unrolledWalkerWasm(this.stencilIdNodes64, this.stencilLabelNodes64, 64, cursor, ids, labels);
      target.appendChild(this.tplChunk64.cloneNode(true));
      cursor += 64;
    }

    while (cursor + 16 <= totalCount) {
      this.unrolledWalkerWasm(this.stencilIdNodes16, this.stencilLabelNodes16, 16, cursor, ids, labels);
      target.appendChild(this.tplChunk16.cloneNode(true));
      cursor += 16;
    }

    while (cursor + 8 <= totalCount) {
      this.unrolledWalkerWasm(this.stencilIdNodes8, this.stencilLabelNodes8, 8, cursor, ids, labels);
      target.appendChild(this.tplChunk8.cloneNode(true));
      cursor += 8;
    }

    while (cursor < totalCount) {
      const idVal = ids[cursor];
      const code = labels[cursor];
      this.stencilIdNode1.data = idVal;
      this.stencilLabelNode1.data =
        T0[code & 0x1f] + " " + T1[(code >>> 5) & 0x0f] + " " + T2[(code >>> 9) & 0x0f];
      this.rowIds[cursor] = idVal;
      target.appendChild(this.tplRow.cloneNode(true));
      cursor++;
    }
  }

  buildDetachedFragment(startIdx, totalCount, ids, labels) {
    const fragment = this.tbody.ownerDocument.createDocumentFragment();
    this.populateTarget(fragment, startIdx, totalCount, ids, labels);
    return fragment;
  }

  mountRange(startIdx, totalCount, ids, labels) {
    const frag = this.tbody.ownerDocument.createDocumentFragment();
    this.populateTarget(frag, startIdx, totalCount, ids, labels);
    this.tbody.appendChild(frag);
    this.rowsDirty = true;
    this.decimatedDirty = true;
  }

  render(countOrRows, isAppend = false) {
    const count = typeof countOrRows === "number" ? countOrRows : countOrRows.length;
    const view = isAppend ? this.engine.appendRows(count) : this.engine.buildRows(count);
    this.ensureIdsCapacity(view.count);

    if (isAppend) {
      const prevLen = view.count - count;
      this.mountRange(prevLen, view.count, view.ids, view.labelIndices);
      return view;
    }

    this.selectedTr = null;
    const frag = this.tbody.ownerDocument.createDocumentFragment();
    this.populateTarget(frag, 0, view.count, view.ids, view.labelIndices);
    if (!this.tbody.firstChild) {
      this.tbody.appendChild(frag);
    } else {
      this.tbody.replaceChildren(frag);
    }
    this.rowsDirty = true;
    this.decimatedDirty = true;
    return view;
  }

  append(count) {
    return this.render(count, true);
  }

  ensureDecimatedCache() {
    if (!this.decimatedDirty) return;
    const children = this.tbody.children;
    const len = children ? children.length : 0;
    const dec = this.decimatedLabelNodes10;
    const decLabels = this.decimatedLabels10;
    let k = 0;
    if (children && len > 0) {
      for (let i = 0; i < len; i += 10) {
        const tr = children[i];
        const lblNode = tr.firstChild.nextSibling.firstChild.firstChild;
        dec[k] = lblNode;
        decLabels[k] = lblNode.data || "";
        k++;
      }
    } else {
      let tr = this.tbody.firstChild;
      let i = 0;
      while (tr) {
        if (i % 10 === 0) {
          const lblNode = tr.firstChild.nextSibling.firstChild.firstChild;
          dec[k] = lblNode;
          decLabels[k] = lblNode.data || "";
          k++;
        }
        tr = tr.nextSibling;
        i++;
      }
    }
    dec.length = k;
    decLabels.length = k;
    this.decimatedDirty = false;
  }

  updateEvery10th() {
    const view = this.engine.updateEvery10th();
    this.ensureDecimatedCache();
    const dec = this.decimatedLabelNodes10;
    const len = dec.length;
    for (let k = 0; k < len; k++) {
      dec[k].appendData(" !!!");
    }
    return view;
  }

  swapRows(indexA = 1, indexB = 998) {
    if (!this.engine.swapRows(indexA, indexB)) return false;
    const children = this.tbody.children;
    let trA;
    let trB;
    let afterB;
    if (children && children.length > indexB) {
      trA = children[indexA];
      trB = children[indexB];
      if (!trA || !trB) return false;
      afterB = trB.nextSibling;
    } else {
      const list = this.rows;
      if (list.length <= indexB) return false;
      trA = list[indexA];
      trB = list[indexB];
      if (!trA || !trB) return false;
      afterB = trB.nextSibling || list[indexB + 1] || null;
    }
    this.tbody.insertBefore(trB, trA);
    this.tbody.insertBefore(trA, afterB);
    const idA = this.rowIds[indexA];
    this.rowIds[indexA] = this.rowIds[indexB];
    this.rowIds[indexB] = idA;
    this.rowsDirty = true;
    if (indexA % 10 === 0 || indexB % 10 === 0) {
      this.decimatedDirty = true;
    }
    return true;
  }

  selectRowAt(rowIndex) {
    const children = this.tbody.children;
    const tr = children && children.length > rowIndex ? children[rowIndex] : this.rows[rowIndex];
    if (!tr) return;
    const prev = this.selectedTr;
    if (prev !== tr) {
      if (prev) prev.className = "";
      tr.className = "danger";
      this.selectedTr = tr;
      const rowId = Number(tr.firstChild.firstChild.data) >>> 0;
      this.engine.selectRow(rowId);
    }
  }

  deleteRowAt(rowIndex) {
    const children = this.tbody.children;
    const tr = children && children.length > rowIndex ? children[rowIndex] : this.rows[rowIndex];
    if (!tr) return;
    const rowId = Number(tr.firstChild.firstChild.data) >>> 0;
    this.engine.deleteRow(rowId);
    if (this.selectedTr === tr) this.selectedTr = null;
    tr.remove();
    this.rowsDirty = true;
    this.decimatedDirty = true;
  }

  handleClick(e) {
    const target = e.target;
    if (!target) return;
    const tag = target.tagName;
    if (tag === "A") {
      const tr = target.parentNode.parentNode;
      if (target.className === "lbl" || target.firstElementChild === null) {
        const prev = this.selectedTr;
        if (prev !== tr) {
          if (prev) prev.className = "";
          tr.className = "danger";
          this.selectedTr = tr;
          const rowId = Number(tr.firstChild.firstChild.data) >>> 0;
          this.engine.selectRow(rowId);
        }
      } else {
        const rowId = Number(tr.firstChild.firstChild.data) >>> 0;
        this.engine.deleteRow(rowId);
        if (this.selectedTr === tr) this.selectedTr = null;
        tr.remove();
        this.rowsDirty = true;
        this.decimatedDirty = true;
      }
    } else if (tag === "SPAN") {
      const tr = target.parentNode.parentNode.parentNode;
      const rowId = tr.firstChild.firstChild.data >>> 0;
      this.engine.deleteRow(rowId);
      if (this.selectedTr === tr) this.selectedTr = null;
      tr.remove();
      this.rowsDirty = true;
      this.decimatedDirty = true;
    }
  }

  clear() {
    this.engine.clear();
    this.tbody.replaceChildren();
    this._rowsCache.length = 0;
    this.rowsDirty = false;
    this.decimatedLabelNodes10.length = 0;
    this.decimatedLabels10.length = 0;
    this.decimatedDirty = false;
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
  wasmSource = new URL("../bin/silicium_dom.wasm", import.meta.url)
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

if (
  typeof document !== "undefined" &&
  document.getElementById("tbody") &&
  document.getElementById("run")
) {
  void mountKrausestBenchmarkApp(document);
}

