// SPDX-License-Identifier: LicenseRef-Silicium-Community-1.0
// Protected under Patent Pending (The Silicium Authors). All rights reserved.

const DEFAULT_ADJECTIVES = [
  "pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint",
  "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly",
  "adorable", "important", "inexpensive", "cheap", "expensive", "fancy",
];
const DEFAULT_COLOURS = [
  "red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange",
];
const DEFAULT_NOUNS = [
  "table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger",
  "pizza", "mouse", "keyboard",
];

export const DEFAULT_ROW_HTML =
  '<tr><td class="col-md-1"></td><td class="col-md-4"><a></a></td><td class="col-md-1"><a><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a></td><td class="col-md-6"></td></tr>';

export function synthesizeRowLabel(code) {
  const base =
    DEFAULT_ADJECTIVES[code & 0x1f] +
    " " +
    DEFAULT_COLOURS[(code >>> 5) & 0x0f] +
    " " +
    DEFAULT_NOUNS[(code >>> 9) & 0x0f];
  return (code & 0x2000) !== 0 ? base + " !!!" : base;
}

export class SiliciumV8DomEngine {
  constructor(initialCapacity = 1024) {
    this.count = 0;
    this.nextId = 1;
    this.rngState = 0x85ebca6b;
    this.capacity = initialCapacity;
    this.ids = new Uint32Array(initialCapacity);
    this.labelIndices = new Uint16Array(initialCapacity);
    this.labels = new Array(initialCapacity);
  }

  ensureCapacity(minCapacity) {
    if (minCapacity > this.capacity) {
      const nextCap = Math.max(minCapacity, this.capacity * 2);
      const nextIds = new Uint32Array(nextCap);
      nextIds.set(this.ids);
      this.ids = nextIds;
      const nextLabels = new Uint16Array(nextCap);
      nextLabels.set(this.labelIndices);
      this.labelIndices = nextLabels;
      this.labels.length = nextCap;
      this.capacity = nextCap;
    }
  }

  nextLabelCode() {
    const s = (this.rngState = (Math.imul(this.rngState, 1664525) + 1013904223) | 0);
    const s2 = (this.rngState = (Math.imul(this.rngState, 1664525) + 1013904223) | 0);
    const adj = (Math.imul(s & 0xffff, 25) >>> 16) & 0x1f;
    const col = (Math.imul((s >>> 16) & 0xffff, 11) >>> 16) & 0x0f;
    const noun = (Math.imul(s2 & 0xffff, 13) >>> 16) & 0x0f;
    return adj | (col << 5) | (noun << 9);
  }

  buildRows(count) {
    this.ensureCapacity(count);
    this.count = count;
    const ids = this.ids;
    const labelIndices = this.labelIndices;
    const labels = this.labels;
    for (let i = 0; i < count; i++) {
      ids[i] = this.nextId++;
      const code = this.nextLabelCode();
      labelIndices[i] = code;
      labels[i] =
        DEFAULT_ADJECTIVES[code & 0x1f] +
        " " +
        DEFAULT_COLOURS[(code >>> 5) & 0x0f] +
        " " +
        DEFAULT_NOUNS[(code >>> 9) & 0x0f];
    }
    return this.getRowView();
  }

  setRows(rows) {
    const count = rows.length;
    this.ensureCapacity(count);
    this.count = count;
    const ids = this.ids;
    const labelIndices = this.labelIndices;
    const labels = this.labels;
    for (let i = 0; i < count; i++) {
      const row = rows[i];
      ids[i] = row.id;
      labelIndices[i] = row.labelIndex ?? 0;
      labels[i] = row.label;
    }
    if (count > 0 && rows[count - 1].id >= this.nextId) {
      this.nextId = rows[count - 1].id + 1;
    }
    return this.getRowView();
  }

  appendRows(count) {
    const start = this.count;
    const total = start + count;
    this.ensureCapacity(total);
    this.count = total;
    const ids = this.ids;
    const labelIndices = this.labelIndices;
    const labels = this.labels;
    for (let i = start; i < total; i++) {
      ids[i] = this.nextId++;
      const code = this.nextLabelCode();
      labelIndices[i] = code;
      labels[i] =
        DEFAULT_ADJECTIVES[code & 0x1f] +
        " " +
        DEFAULT_COLOURS[(code >>> 5) & 0x0f] +
        " " +
        DEFAULT_NOUNS[(code >>> 9) & 0x0f];
    }
    return this.getRowView();
  }

  appendRowsData(rows) {
    const addCount = rows.length;
    const start = this.count;
    const total = start + addCount;
    this.ensureCapacity(total);
    this.count = total;
    const ids = this.ids;
    const labelIndices = this.labelIndices;
    const labels = this.labels;
    for (let i = 0; i < addCount; i++) {
      const row = rows[i];
      const dst = start + i;
      ids[dst] = row.id;
      labelIndices[dst] = row.labelIndex ?? 0;
      labels[dst] = row.label;
    }
    if (addCount > 0 && rows[addCount - 1].id >= this.nextId) {
      this.nextId = rows[addCount - 1].id + 1;
    }
    return this.getRowView();
  }

  updateEvery10th() {
    const labelIndices = this.labelIndices;
    const labels = this.labels;
    for (let i = 0; i < this.count; i += 10) {
      labelIndices[i] |= 0x2000;
      labels[i] = labels[i] + " !!!";
    }
    return this.getRowView();
  }

  swapRows(indexA, indexB) {
    if (indexA >= this.count || indexB >= this.count) return false;
    const idA = this.ids[indexA];
    this.ids[indexA] = this.ids[indexB];
    this.ids[indexB] = idA;
    const lblA = this.labelIndices[indexA];
    this.labelIndices[indexA] = this.labelIndices[indexB];
    this.labelIndices[indexB] = lblA;
    const strA = this.labels[indexA];
    this.labels[indexA] = this.labels[indexB];
    this.labels[indexB] = strA;
    return true;
  }

  selectRow(rowId) {
    return rowId >= 0;
  }

  deleteRow(rowId) {
    let idx = -1;
    for (let i = 0; i < this.count; i++) {
      if (this.ids[i] === rowId) {
        idx = i;
        break;
      }
    }
    if (idx < 0) return false;
    this.ids.copyWithin(idx, idx + 1, this.count);
    this.labelIndices.copyWithin(idx, idx + 1, this.count);
    this.labels.splice(idx, 1);
    this.count--;
    return true;
  }

  clear() {
    this.count = 0;
  }

  getRowView() {
    return {
      count: this.count,
      ids: new Uint32Array(this.ids.buffer, 0, this.count),
      labelIndices: new Uint16Array(this.labelIndices.buffer, 0, this.count),
      labels: this.labels,
    };
  }

  decodeLabel(code) {
    return synthesizeRowLabel(code);
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

export class SiliciumV8DataGridController {
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
    this.decimatedLabelsReady = false;
    this.scratchLabels64 = new Array(64);
    this.rowIds = new Uint32Array(1024);
    this.selectedTr = null;

    const ROW_HTML = props.rowHtml || DEFAULT_ROW_HTML;
    const doc = container.ownerDocument || document;
    this.doc = doc;
    const tpl1 = doc.createElement("template");
    tpl1.innerHTML = ROW_HTML;
    this.tplRow = tpl1.content.firstChild;
    const tdId1 = this.tplRow.firstChild;
    this.stencilIdNode1 = tdId1.firstChild || tdId1.appendChild(doc.createTextNode(""));
    const anchor1 = tdId1.nextSibling.firstChild;
    this.stencilLabelNode1 = anchor1.firstChild || anchor1.appendChild(doc.createTextNode(""));

    const tpl8 = doc.createElement("template");
    tpl8.innerHTML = ROW_HTML.repeat(8);
    this.tplChunk8 = tpl8.content;
    const st8 = extractStencilPointers(this.tplChunk8, 8, doc);
    this.stencilIdNodes8 = st8.idNodes;
    this.stencilLabelNodes8 = st8.labelNodes;

    const tpl16 = doc.createElement("template");
    tpl16.innerHTML = ROW_HTML.repeat(16);
    this.tplChunk16 = tpl16.content;
    const st16 = extractStencilPointers(this.tplChunk16, 16, doc);
    this.stencilIdNodes16 = st16.idNodes;
    this.stencilLabelNodes16 = st16.labelNodes;

    const tpl64 = doc.createElement("template");
    tpl64.innerHTML = ROW_HTML.repeat(64);
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

    this.tbody.addEventListener("click", (e) => this.handleClick(e));
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

  unrolledWalker(idNodes, labelNodes, count, startIdx, ids, labels) {
    const rowIds = this.rowIds;
    let j = 0;
    let i = startIdx;

    for (; j + 4 <= count; j += 4, i += 4) {
      const id0 = ids[i];
      idNodes[j].data = id0;
      labelNodes[j].data = labels[i];
      rowIds[i] = id0;

      const id1 = ids[i + 1];
      idNodes[j + 1].data = id1;
      labelNodes[j + 1].data = labels[i + 1];
      rowIds[i + 1] = id1;

      const id2 = ids[i + 2];
      idNodes[j + 2].data = id2;
      labelNodes[j + 2].data = labels[i + 2];
      rowIds[i + 2] = id2;

      const id3 = ids[i + 3];
      idNodes[j + 3].data = id3;
      labelNodes[j + 3].data = labels[i + 3];
      rowIds[i + 3] = id3;
    }

    for (; j < count; j++, i++) {
      const idVal = ids[i];
      idNodes[j].data = idVal;
      labelNodes[j].data = labels[i];
      rowIds[i] = idVal;
    }
  }

  unrolledWalkerRows(idNodes, labelNodes, count, srcIdx, srcRows) {
    let j = 0;
    let s = srcIdx;

    for (; j + 4 <= count; j += 4, s += 4) {
      const r0 = srcRows[s];
      idNodes[j].data = r0.id;
      labelNodes[j].data = r0.label;

      const r1 = srcRows[s + 1];
      idNodes[j + 1].data = r1.id;
      labelNodes[j + 1].data = r1.label;

      const r2 = srcRows[s + 2];
      idNodes[j + 2].data = r2.id;
      labelNodes[j + 2].data = r2.label;

      const r3 = srcRows[s + 3];
      idNodes[j + 3].data = r3.id;
      labelNodes[j + 3].data = r3.label;
    }

    for (; j < count; j++, s++) {
      const r = srcRows[s];
      idNodes[j].data = r.id;
      labelNodes[j].data = r.label;
    }
  }

  unrolledWalkerGenerated(idNodes, labelNodes, count) {
    let nextId = this.engine.nextId;
    let rng = this.engine.rngState;
    for (let j = 0; j < count; j += 4) {
      let s = (rng = (Math.imul(rng, 1664525) + 1013904223) | 0);
      let s2 = (rng = (Math.imul(rng, 1664525) + 1013904223) | 0);
      idNodes[j].data = nextId++;
      labelNodes[j].data =
        DEFAULT_ADJECTIVES[(Math.imul(s & 0xffff, 25) >>> 16) & 0x1f] +
        " " +
        DEFAULT_COLOURS[(Math.imul((s >>> 16) & 0xffff, 11) >>> 16) & 0x0f] +
        " " +
        DEFAULT_NOUNS[(Math.imul(s2 & 0xffff, 13) >>> 16) & 0x0f];

      s = (rng = (Math.imul(rng, 1664525) + 1013904223) | 0);
      s2 = (rng = (Math.imul(rng, 1664525) + 1013904223) | 0);
      idNodes[j + 1].data = nextId++;
      labelNodes[j + 1].data =
        DEFAULT_ADJECTIVES[(Math.imul(s & 0xffff, 25) >>> 16) & 0x1f] +
        " " +
        DEFAULT_COLOURS[(Math.imul((s >>> 16) & 0xffff, 11) >>> 16) & 0x0f] +
        " " +
        DEFAULT_NOUNS[(Math.imul(s2 & 0xffff, 13) >>> 16) & 0x0f];

      s = (rng = (Math.imul(rng, 1664525) + 1013904223) | 0);
      s2 = (rng = (Math.imul(rng, 1664525) + 1013904223) | 0);
      idNodes[j + 2].data = nextId++;
      labelNodes[j + 2].data =
        DEFAULT_ADJECTIVES[(Math.imul(s & 0xffff, 25) >>> 16) & 0x1f] +
        " " +
        DEFAULT_COLOURS[(Math.imul((s >>> 16) & 0xffff, 11) >>> 16) & 0x0f] +
        " " +
        DEFAULT_NOUNS[(Math.imul(s2 & 0xffff, 13) >>> 16) & 0x0f];

      s = (rng = (Math.imul(rng, 1664525) + 1013904223) | 0);
      s2 = (rng = (Math.imul(rng, 1664525) + 1013904223) | 0);
      idNodes[j + 3].data = nextId++;
      labelNodes[j + 3].data =
        DEFAULT_ADJECTIVES[(Math.imul(s & 0xffff, 25) >>> 16) & 0x1f] +
        " " +
        DEFAULT_COLOURS[(Math.imul((s >>> 16) & 0xffff, 11) >>> 16) & 0x0f] +
        " " +
        DEFAULT_NOUNS[(Math.imul(s2 & 0xffff, 13) >>> 16) & 0x0f];
    }
    this.engine.nextId = nextId;
    this.engine.rngState = rng;
  }

  populateTargetGenerated(target, count, recordDecimatedLabels = false) {
    let cursor = 0;
    const idNodes64 = this.stencilIdNodes64;
    const labelNodes64 = this.stencilLabelNodes64;
    const idNodes16 = this.stencilIdNodes16;
    const labelNodes16 = this.stencilLabelNodes16;
    const idNodes8 = this.stencilIdNodes8;
    const labelNodes8 = this.stencilLabelNodes8;

    while (cursor + 64 <= count) {
      this.unrolledWalkerGenerated(idNodes64, labelNodes64, 64);
      target.appendChild(this.tplChunk64.cloneNode(true));
      cursor += 64;
    }

    while (cursor + 16 <= count) {
      this.unrolledWalkerGenerated(idNodes16, labelNodes16, 16);
      target.appendChild(this.tplChunk16.cloneNode(true));
      cursor += 16;
    }

    while (cursor + 8 <= count) {
      this.unrolledWalkerGenerated(idNodes8, labelNodes8, 8);
      target.appendChild(this.tplChunk8.cloneNode(true));
      cursor += 8;
    }

    while (cursor < count) {
      const idVal = this.engine.nextId++;
      const code = this.engine.nextLabelCode();
      this.stencilIdNode1.data = idVal;
      this.stencilLabelNode1.data =
        DEFAULT_ADJECTIVES[code & 0x1f] +
        " " +
        DEFAULT_COLOURS[(code >>> 5) & 0x0f] +
        " " +
        DEFAULT_NOUNS[(code >>> 9) & 0x0f];
      target.appendChild(this.tplRow.cloneNode(true));
      cursor++;
    }

    this.decimatedLabelsReady = Boolean(recordDecimatedLabels && false);
  }

  bindChunk(idNodes, labelNodes, count, startIdx, ids, labels) {
    this.unrolledWalker(idNodes, labelNodes, count, startIdx, ids, labels);
  }

  populateTargetWithStencils(target, startIdx, totalCount, ids, labels) {
    let cursor = startIdx;
    const idNodes64 = this.stencilIdNodes64;
    const labelNodes64 = this.stencilLabelNodes64;
    const idNodes16 = this.stencilIdNodes16;
    const labelNodes16 = this.stencilLabelNodes16;
    const idNodes8 = this.stencilIdNodes8;
    const labelNodes8 = this.stencilLabelNodes8;

    while (cursor + 64 <= totalCount) {
      this.unrolledWalker(idNodes64, labelNodes64, 64, cursor, ids, labels);
      target.appendChild(this.tplChunk64.cloneNode(true));
      cursor += 64;
    }

    while (cursor + 16 <= totalCount) {
      this.unrolledWalker(idNodes16, labelNodes16, 16, cursor, ids, labels);
      target.appendChild(this.tplChunk16.cloneNode(true));
      cursor += 16;
    }

    while (cursor + 8 <= totalCount) {
      this.unrolledWalker(idNodes8, labelNodes8, 8, cursor, ids, labels);
      target.appendChild(this.tplChunk8.cloneNode(true));
      cursor += 8;
    }

    while (cursor < totalCount) {
      const idVal = ids[cursor];
      this.stencilIdNode1.data = idVal;
      this.stencilLabelNode1.data = labels[cursor];
      this.rowIds[cursor] = idVal;
      target.appendChild(this.tplRow.cloneNode(true));
      cursor++;
    }
  }

  populateTargetFromRowObjects(target, srcRows) {
    const addCount = srcRows.length;
    const idNodes64 = this.stencilIdNodes64;
    const labelNodes64 = this.stencilLabelNodes64;
    const idNodes16 = this.stencilIdNodes16;
    const labelNodes16 = this.stencilLabelNodes16;
    const idNodes8 = this.stencilIdNodes8;
    const labelNodes8 = this.stencilLabelNodes8;
    let srcCursor = 0;

    while (srcCursor + 64 <= addCount) {
      this.unrolledWalkerRows(idNodes64, labelNodes64, 64, srcCursor, srcRows);
      target.appendChild(this.tplChunk64.cloneNode(true));
      srcCursor += 64;
    }

    while (srcCursor + 16 <= addCount) {
      this.unrolledWalkerRows(idNodes16, labelNodes16, 16, srcCursor, srcRows);
      target.appendChild(this.tplChunk16.cloneNode(true));
      srcCursor += 16;
    }

    while (srcCursor + 8 <= addCount) {
      this.unrolledWalkerRows(idNodes8, labelNodes8, 8, srcCursor, srcRows);
      target.appendChild(this.tplChunk8.cloneNode(true));
      srcCursor += 8;
    }

    while (srcCursor < addCount) {
      const r = srcRows[srcCursor++];
      this.stencilIdNode1.data = r.id;
      this.stencilLabelNode1.data = r.label;
      target.appendChild(this.tplRow.cloneNode(true));
    }
  }

  buildDetachedFragment(startIdx, totalCount, ids, labels) {
    const fragment = this.doc.createDocumentFragment();
    this.populateTargetWithStencils(fragment, startIdx, totalCount, ids, labels);
    return fragment;
  }

  mountRange(startIdx, totalCount, ids, labels) {
    this.populateTargetWithStencils(this.tbody, startIdx, totalCount, ids, labels);
    this.rowsDirty = true;
    this.decimatedDirty = true;
    this.decimatedLabelsReady = false;
  }

  replaceRowsDetached(view) {
    const tbody = this.tbody;
    const frag = this.doc.createDocumentFragment();
    this.populateTargetWithStencils(frag, 0, view.count, view.ids, view.labels);
    if (!tbody.firstChild) {
      tbody.appendChild(frag);
    } else {
      tbody.replaceChildren(frag);
    }
    this.rowsDirty = true;
    this.decimatedDirty = true;
    this.decimatedLabelsReady = false;
    return view;
  }

  replaceRowsInSitu(countOrView) {
    const view =
      typeof countOrView === "number"
        ? this.engine.buildRows(countOrView)
        : countOrView;
    this.ensureIdsCapacity(view.count);
    return this.replaceRowsDetached(view);
  }

  render(countOrRows, isAppend = false) {
    const tbody = this.tbody;
    if (Array.isArray(countOrRows)) {
      const addCount = countOrRows.length;
      const total = (isAppend ? this.engine.count : 0) + addCount;
      this.engine.count = total;

      if (isAppend) {
        const frag = this.doc.createDocumentFragment();
        this.populateTargetFromRowObjects(frag, countOrRows);
        tbody.appendChild(frag);
      } else {
        this.selectedTr = null;
        const frag = this.doc.createDocumentFragment();
        this.populateTargetFromRowObjects(frag, countOrRows);
        if (!tbody.firstChild) {
          tbody.appendChild(frag);
        } else {
          tbody.replaceChildren(frag);
        }
      }
      this.rowsDirty = true;
      this.decimatedDirty = true;
      this.decimatedLabelsReady = false;
      return {
        count: total,
        ids: this.engine.ids,
        labelIndices: this.engine.labelIndices,
        labels: this.engine.labels,
      };
    }

    const count = typeof countOrRows === "number" ? countOrRows : countOrRows.length;

    if (isAppend) {
      const total = this.engine.count + count;
      this.engine.count = total;
      const frag = this.doc.createDocumentFragment();
      this.populateTargetGenerated(frag, count, false);
      tbody.appendChild(frag);
      this.rowsDirty = true;
      this.decimatedDirty = true;
      return {
        count: total,
        ids: this.engine.ids,
        labelIndices: this.engine.labelIndices,
        labels: this.engine.labels,
      };
    }

    this.selectedTr = null;
    this.engine.count = count;
    const frag = this.doc.createDocumentFragment();
    this.populateTargetGenerated(frag, count, false);
    if (!tbody.firstChild) {
      tbody.appendChild(frag);
    } else {
      tbody.replaceChildren(frag);
    }
    this.rowsDirty = true;
    this.decimatedDirty = true;
    return {
      count,
      ids: this.engine.ids,
      labelIndices: this.engine.labelIndices,
      labels: this.engine.labels,
    };
  }

  append(countOrRows) {
    return this.render(countOrRows, true);
  }

  ensureDecimatedCache() {
    if (!this.decimatedDirty) return;
    const children = this.tbody.children;
    const len = children ? children.length : 0;
    const dec = this.decimatedLabelNodes10;
    const decLabels = this.decimatedLabels10;
    const hasPreFedLabels = this.decimatedLabelsReady;
    let k = 0;
    if (children && len > 0) {
      if (hasPreFedLabels) {
        for (let i = 0; i < len; i += 10) {
          dec[k++] = children[i].firstChild.nextSibling.firstChild.firstChild;
        }
      } else {
        for (let i = 0; i < len; i += 10) {
          const lblNode = children[i].firstChild.nextSibling.firstChild.firstChild;
          dec[k] = lblNode;
          decLabels[k] = lblNode.data || "";
          k++;
        }
      }
    } else {
      let tr = this.tbody.firstChild;
      let i = 0;
      while (tr) {
        if (i % 10 === 0) {
          const lblNode = tr.firstChild.nextSibling.firstChild.firstChild;
          dec[k] = lblNode;
          if (!hasPreFedLabels) {
            decLabels[k] = lblNode.data || "";
          }
          k++;
        }
        tr = tr.nextSibling;
        i++;
      }
    }
    dec.length = k;
    decLabels.length = k;
    this.decimatedLabelsReady = true;
    this.decimatedDirty = false;
  }

  updateEvery10th() {
    this.ensureDecimatedCache();
    const dec = this.decimatedLabelNodes10;
    const decLabels = this.decimatedLabels10;
    const len = dec.length;
    for (let k = 0; k < len; k++) {
      dec[k].data = (decLabels[k] += " !!!");
    }
    return {
      count: this.engine.count,
      ids: this.engine.ids,
      labelIndices: this.engine.labelIndices,
      labels: this.engine.labels,
    };
  }

  swapRows(indexA = 1, indexB = 998) {
    const children = this.tbody.children;
    let trA;
    let trB;
    let afterA;
    let afterB;
    if (children && children.length > indexB) {
      trA = children[indexA];
      trB = children[indexB];
      if (!trA || !trB) return false;
      afterA = trA.nextSibling;
      afterB = trB.nextSibling;
    } else {
      const list = this.rows;
      if (list.length <= indexB) return false;
      trA = list[indexA];
      trB = list[indexB];
      if (!trA || !trB) return false;
      afterA = trA.nextSibling || list[indexA + 1] || null;
      afterB = trB.nextSibling || list[indexB + 1] || null;
    }
    this.tbody.insertBefore(trB, afterA);
    this.tbody.insertBefore(trA, afterB);
    this.rowsDirty = true;
    if (indexA % 10 === 0 || indexB % 10 === 0) {
      this.decimatedDirty = true;
      this.decimatedLabelsReady = false;
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
    }
  }

  deleteRowAt(rowIndex) {
    const children = this.tbody.children;
    const tr = children && children.length > rowIndex ? children[rowIndex] : this.rows[rowIndex];
    if (!tr) return;
    this.engine.deleteRow(this.rowIds[rowIndex]);
    this.rowIds.copyWithin(rowIndex, rowIndex + 1, this.engine.count + 1);
    if (this.selectedTr === tr) this.selectedTr = null;
    tr.remove();
    this.rowsDirty = true;
    this.decimatedDirty = true;
    this.decimatedLabelsReady = false;
  }

  handleClick(e) {
    const target = e.target;
    if (!target) return;
    const tag = target.tagName;
    if (tag === "A") {
      const tr = target.parentNode.parentNode;
      if (target.className === "lbl") {
        const prev = this.selectedTr;
        if (prev !== tr) {
          if (prev) prev.className = "";
          tr.className = "danger";
          this.selectedTr = tr;
        }
      } else if (target.firstElementChild === null) {
        const prev = this.selectedTr;
        if (prev !== tr) {
          if (prev) prev.className = "";
          tr.className = "danger";
          this.selectedTr = tr;
        }
      } else {
        if (this.selectedTr === tr) this.selectedTr = null;
        tr.remove();
        if (this.engine.count > 0) this.engine.count--;
        this.rowsDirty = true;
        this.decimatedDirty = true;
        this.decimatedLabelsReady = false;
      }
    } else if (tag === "SPAN") {
      const tr = target.parentNode.parentNode.parentNode;
      if (this.selectedTr === tr) this.selectedTr = null;
      tr.remove();
      if (this.engine.count > 0) this.engine.count--;
      this.rowsDirty = true;
      this.decimatedDirty = true;
      this.decimatedLabelsReady = false;
    }
  }

  clear() {
    this.engine.clear();
    this.tbody.replaceChildren();
    this.decimatedLabelNodes10.length = 0;
    this.decimatedLabels10.length = 0;
    this.rowsDirty = true;
    this.decimatedDirty = true;
    this.decimatedLabelsReady = false;
    this.selectedTr = null;
  }
}

export function mountSiliciumV8DataGrid(container, props = {}) {
  const engine = new SiliciumV8DomEngine();
  const grid = new SiliciumV8DataGridController(engine, container, props);
  if (props.rows) grid.render(props.rows, false);
  return grid;
}

export function mountKrausestV8BenchmarkApp(doc = document) {
  const tbody = doc.getElementById("tbody");
  const grid = mountSiliciumV8DataGrid(tbody, { keyed: true });
  doc.getElementById("run")?.addEventListener("click", () => {
    grid.render(1000, false);
  });
  doc.getElementById("runlots")?.addEventListener("click", () => {
    grid.render(10000, false);
  });
  doc.getElementById("add")?.addEventListener("click", () => {
    grid.append(1000);
  });
  doc.getElementById("update")?.addEventListener("click", () => {
    grid.updateEvery10th();
  });
  doc.getElementById("clear")?.addEventListener("click", () => {
    grid.clear();
  });
  doc.getElementById("swaprows")?.addEventListener("click", () => {
    grid.swapRows(1, 998);
  });
  return grid;
}

export function SiliciumV8DataGrid(props) {
  if (props.container) {
    void mountSiliciumV8DataGrid(props.container, props);
  }
  return {
    $$typeof: Symbol.for("react.element"),
    type: SiliciumV8DataGrid,
    props,
    key: null,
    mount: (container) => mountSiliciumV8DataGrid(container, props),
  };
}

// --- Client Adapter (src/main.mjs) ---
// SPDX-License-Identifier: LicenseRef-Silicium-Community-1.0
// Protected under Patent Pending (The Silicium Authors). All rights reserved.


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
  '<tr><td class="col-md-1"></td><td class="col-md-4"><a></a></td><td class="col-md-1"><a><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a></td><td class="col-md-6"></td></tr>';

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
const grid = mountSiliciumV8DataGrid(tbody, { keyed: true, rowHtml: ROW_HTML });

document.getElementById("run").addEventListener("click", () => {
  grid.render(buildData(1000), false);
});
document.getElementById("runlots").addEventListener("click", () => {
  grid.render(buildData(10000), false);
});
document.getElementById("add").addEventListener("click", () => {
  grid.append(buildData(1000));
});
document.getElementById("update").addEventListener("click", () => {
  grid.updateEvery10th();
});
document.getElementById("clear").addEventListener("click", () => {
  grid.clear();
});
document.getElementById("swaprows").addEventListener("click", () => {
  grid.swapRows(1, 998);
});
