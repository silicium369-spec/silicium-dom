// SPDX-License-Identifier: LicenseRef-Silicium-Community-1.0
// Protected under Patent Pending (The Silicium Authors). All rights reserved.

/**
 * SILICIUM V8 DOM ENGINE — PURE V8/BLINK HARDWARE-AWARE KEYED DOM RUNTIME
 * Keyed Architecture (100% krausest/js-framework-benchmark Compliant):
 *   1. Block-Amortized Template Instantiation (tplChunk64 / tplChunk16 power-of-2 block cloning)
 *   2. Atomic Detached Replacement (replaceChildren) & In-Situ .nodeValue Recycling (replaceRowsInSitu)
 *   3. Monomorphic Planar TextNode & Smi TypedArray Cache (Uint32Array, Uint16Array) + 4-Way Unrolled Walker (i += 4)
 *   4. Surgical O(1) insertBefore Swap (strict node identity preservation)
 *   5. Divisionless Lemire Fast Modulo via Math.imul & On-The-Fly V8 ConsString Synthesis
 */

export interface SiliciumRowRecord {
  readonly id: number;
  readonly label: string;
  readonly labelIndex?: number;
}

export interface SiliciumColumn<TRow = SiliciumRowRecord> {
  readonly key: keyof TRow | string;
  readonly header?: string;
  readonly className?: string;
  readonly width?: string;
  readonly renderText?: (row: TRow, rowIndex: number) => string;
}

export interface SiliciumRowView {
  readonly count: number;
  readonly ids: Uint32Array;
  readonly labelIndices: Uint16Array;
  readonly labels: readonly string[];
}

export interface SiliciumV8DataGridProps<TRow = SiliciumRowRecord> {
  readonly rows?: readonly TRow[] | number;
  readonly columns?: readonly SiliciumColumn<TRow>[];
  readonly keyed?: boolean;
  readonly rowHtml?: string;
  readonly container?: HTMLElement | null;
  readonly onSelectRow?: (rowId: number, rowIndex: number) => void;
  readonly onDeleteRow?: (rowId: number, rowIndex: number) => void;
}

export interface SiliciumV8DataGridDescriptor<TRow = SiliciumRowRecord> {
  readonly $$typeof: symbol;
  readonly type: typeof SiliciumV8DataGrid;
  readonly props: SiliciumV8DataGridProps<TRow>;
  readonly key: string | null;
  mount(container: HTMLElement): SiliciumV8DataGridController<TRow>;
}

const DEFAULT_ADJECTIVES: readonly string[] = [
  "pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint",
  "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly",
  "adorable", "important", "inexpensive", "cheap", "expensive", "fancy",
];
const DEFAULT_COLOURS: readonly string[] = [
  "red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange",
];
const DEFAULT_NOUNS: readonly string[] = [
  "table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger",
  "pizza", "mouse", "keyboard",
];

export const DEFAULT_ROW_HTML =
  '<tr><td class="col-md-1"> </td><td class="col-md-4"><a class="lbl"> </a></td><td class="col-md-1"><a><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a></td><td class="col-md-6"></td></tr>';

export function synthesizeRowLabel(code: number): string {
  const base =
    DEFAULT_ADJECTIVES[code & 0x1f] +
    " " +
    DEFAULT_COLOURS[(code >>> 5) & 0x0f] +
    " " +
    DEFAULT_NOUNS[(code >>> 9) & 0x0f];
  return (code & 0x2000) !== 0 ? base + " !!!" : base;
}

export class SiliciumV8DomEngine {
  count: number;
  nextId: number;
  rngState: number;
  capacity: number;
  ids: Uint32Array;
  labelIndices: Uint16Array;
  labels: string[];

  constructor(initialCapacity = 16384) {
    this.count = 0;
    this.nextId = 1;
    this.rngState = 0x85ebca6b;
    this.capacity = initialCapacity;
    this.ids = new Uint32Array(initialCapacity);
    this.labelIndices = new Uint16Array(initialCapacity);
    this.labels = new Array(initialCapacity);
  }

  ensureCapacity(minCapacity: number): void {
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

  // Lemire divisionless reduction via Math.imul (Patent Pending)
  nextLabelCode(): number {
    const s = (this.rngState = (Math.imul(this.rngState, 1664525) + 1013904223) | 0);
    const s2 = (this.rngState = (Math.imul(this.rngState, 1664525) + 1013904223) | 0);
    const adj = (Math.imul(s & 0xffff, 25) >>> 16) & 0x1f;
    const col = (Math.imul((s >>> 16) & 0xffff, 11) >>> 16) & 0x0f;
    const noun = (Math.imul(s2 & 0xffff, 13) >>> 16) & 0x0f;
    return adj | (col << 5) | (noun << 9);
  }

  buildRows(count: number): SiliciumRowView {
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

  setRows(rows: readonly SiliciumRowRecord[]): SiliciumRowView {
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

  appendRows(count: number): SiliciumRowView {
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

  appendRowsData(rows: readonly SiliciumRowRecord[]): SiliciumRowView {
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

  updateEvery10th(): SiliciumRowView {
    const labelIndices = this.labelIndices;
    const labels = this.labels;
    for (let i = 0; i < this.count; i += 10) {
      labelIndices[i] |= 0x2000;
      labels[i] = labels[i] + " !!!";
    }
    return this.getRowView();
  }

  swapRows(indexA: number, indexB: number): boolean {
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

  selectRow(rowId: number): boolean {
    return rowId >= 0;
  }

  deleteRow(rowId: number): boolean {
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

  clear(): void {
    this.count = 0;
  }

  getRowView(): SiliciumRowView {
    return {
      count: this.count,
      ids: new Uint32Array(this.ids.buffer, 0, this.count),
      labelIndices: new Uint16Array(this.labelIndices.buffer, 0, this.count),
      labels: this.labels,
    };
  }

  decodeLabel(code: number): string {
    return synthesizeRowLabel(code);
  }
}

export class SiliciumV8DataGridController<TRow = SiliciumRowRecord> {
  readonly engine: SiliciumV8DomEngine;
  readonly keyed: boolean;
  tbody: HTMLTableSectionElement;
  table: HTMLElement;
  rows: HTMLTableRowElement[];
  idNodes: Text[];
  labelNodes: Text[];
  rowIds: Uint32Array;
  selectedTr: HTMLTableRowElement | null;
  tplRow: Node;
  tplChunk16: DocumentFragment;
  tplChunk64: DocumentFragment;

  constructor(
    engine: SiliciumV8DomEngine,
    container: HTMLElement,
    props: Partial<SiliciumV8DataGridProps<TRow>> = {}
  ) {
    this.engine = engine;
    this.keyed = props.keyed ?? true;
    this.rows = [];
    this.idNodes = [];
    this.labelNodes = [];
    this.rowIds = new Uint32Array(16384);
    this.selectedTr = null;

    const ROW_HTML = props.rowHtml || DEFAULT_ROW_HTML;
    const doc = container.ownerDocument || document;
    const tpl1 = doc.createElement("template");
    tpl1.innerHTML = ROW_HTML;
    this.tplRow = tpl1.content.firstChild!;

    const tpl16 = doc.createElement("template");
    tpl16.innerHTML = ROW_HTML.repeat(16);
    this.tplChunk16 = tpl16.content;

    const tpl64 = doc.createElement("template");
    tpl64.innerHTML = ROW_HTML.repeat(64);
    this.tplChunk64 = tpl64.content;

    const existingTbody =
      container.tagName === "TBODY"
        ? (container as HTMLTableSectionElement)
        : container.querySelector<HTMLTableSectionElement>("tbody");

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

  ensureIdsCapacity(size: number): void {
    if (size > this.rowIds.length) {
      const next = new Uint32Array(Math.max(size, this.rowIds.length * 2));
      next.set(this.rowIds);
      this.rowIds = next;
    }
  }

  unrolledWalker(
    firstTr: ChildNode,
    startIdx: number,
    endIdx: number,
    ids: Uint32Array,
    labels: readonly string[]
  ): void {
    let tr: ChildNode | null = firstTr;
    const rows = this.rows;
    const idNodes = this.idNodes;
    const labelNodes = this.labelNodes;
    const rowIds = this.rowIds;
    let i = startIdx;

    for (; i + 4 <= endIdx && tr; i += 4) {
      // Unrolled step 0
      let tdId = tr.firstChild as HTMLElement;
      let idNode = tdId.firstChild as Text;
      let labelNode = (tdId.nextSibling as HTMLElement).firstChild!.firstChild as Text;
      let idVal = ids[i];
      idNode.nodeValue = "" + idVal;
      labelNode.nodeValue = labels[i];
      rows[i] = tr as HTMLTableRowElement;
      idNodes[i] = idNode;
      labelNodes[i] = labelNode;
      rowIds[i] = idVal;
      tr = tr.nextSibling!;

      // Unrolled step 1
      tdId = tr.firstChild as HTMLElement;
      idNode = tdId.firstChild as Text;
      labelNode = (tdId.nextSibling as HTMLElement).firstChild!.firstChild as Text;
      idVal = ids[i + 1];
      idNode.nodeValue = "" + idVal;
      labelNode.nodeValue = labels[i + 1];
      rows[i + 1] = tr as HTMLTableRowElement;
      idNodes[i + 1] = idNode;
      labelNodes[i + 1] = labelNode;
      rowIds[i + 1] = idVal;
      tr = tr.nextSibling!;

      // Unrolled step 2
      tdId = tr.firstChild as HTMLElement;
      idNode = tdId.firstChild as Text;
      labelNode = (tdId.nextSibling as HTMLElement).firstChild!.firstChild as Text;
      idVal = ids[i + 2];
      idNode.nodeValue = "" + idVal;
      labelNode.nodeValue = labels[i + 2];
      rows[i + 2] = tr as HTMLTableRowElement;
      idNodes[i + 2] = idNode;
      labelNodes[i + 2] = labelNode;
      rowIds[i + 2] = idVal;
      tr = tr.nextSibling!;

      // Unrolled step 3
      tdId = tr.firstChild as HTMLElement;
      idNode = tdId.firstChild as Text;
      labelNode = (tdId.nextSibling as HTMLElement).firstChild!.firstChild as Text;
      idVal = ids[i + 3];
      idNode.nodeValue = "" + idVal;
      labelNode.nodeValue = labels[i + 3];
      rows[i + 3] = tr as HTMLTableRowElement;
      idNodes[i + 3] = idNode;
      labelNodes[i + 3] = labelNode;
      rowIds[i + 3] = idVal;
      tr = tr.nextSibling;
    }

    for (; i < endIdx && tr; i++) {
      const tdId = tr.firstChild as HTMLElement;
      const idNode = tdId.firstChild as Text;
      const labelNode = (tdId.nextSibling as HTMLElement).firstChild!.firstChild as Text;
      const idVal = ids[i];
      idNode.nodeValue = "" + idVal;
      labelNode.nodeValue = labels[i];
      rows[i] = tr as HTMLTableRowElement;
      idNodes[i] = idNode;
      labelNodes[i] = labelNode;
      rowIds[i] = idVal;
      tr = tr.nextSibling;
    }
  }

  bindChunk(
    firstTr: ChildNode,
    startIdx: number,
    endIdx: number,
    ids: Uint32Array,
    labels: readonly string[]
  ): void {
    this.unrolledWalker(firstTr, startIdx, endIdx, ids, labels);
  }

  buildDetachedFragment(
    startIdx: number,
    totalCount: number,
    ids: Uint32Array,
    labels: readonly string[]
  ): DocumentFragment {
    const fragment = this.tbody.ownerDocument.createDocumentFragment();
    let cursor = startIdx;

    while (cursor + 64 <= totalCount) {
      const frag64 = this.tplChunk64.cloneNode(true) as DocumentFragment;
      this.unrolledWalker(frag64.firstChild!, cursor, cursor + 64, ids, labels);
      fragment.appendChild(frag64);
      cursor += 64;
    }

    while (cursor + 16 <= totalCount) {
      const frag16 = this.tplChunk16.cloneNode(true) as DocumentFragment;
      this.unrolledWalker(frag16.firstChild!, cursor, cursor + 16, ids, labels);
      fragment.appendChild(frag16);
      cursor += 16;
    }

    while (cursor < totalCount) {
      const tr = this.tplRow.cloneNode(true) as HTMLTableRowElement;
      const tdId = tr.firstChild as HTMLElement;
      const idNode = tdId.firstChild as Text;
      const labelNode = (tdId.nextSibling as HTMLElement).firstChild!.firstChild as Text;
      const idVal = ids[cursor];
      idNode.nodeValue = "" + idVal;
      labelNode.nodeValue = labels[cursor];
      this.rows[cursor] = tr;
      this.idNodes[cursor] = idNode;
      this.labelNodes[cursor] = labelNode;
      this.rowIds[cursor] = idVal;
      fragment.appendChild(tr);
      cursor++;
    }

    return fragment;
  }

  mountRange(
    startIdx: number,
    totalCount: number,
    ids: Uint32Array,
    labels: readonly string[]
  ): void {
    const fragment = this.buildDetachedFragment(startIdx, totalCount, ids, labels);
    this.tbody.appendChild(fragment);
  }

  replaceRowsDetached(view: SiliciumRowView): SiliciumRowView {
    this.rows.length = view.count;
    this.idNodes.length = view.count;
    this.labelNodes.length = view.count;
    const fragment = this.buildDetachedFragment(0, view.count, view.ids, view.labels);
    this.tbody.replaceChildren(fragment);
    return view;
  }

  replaceRowsInSitu(countOrView: number | SiliciumRowView): SiliciumRowView {
    const view =
      typeof countOrView === "number"
        ? this.engine.buildRows(countOrView)
        : countOrView;
    this.ensureIdsCapacity(view.count);
    const prevLen = this.rows.length;
    const sharedLen = Math.min(prevLen, view.count);

    for (let i = 0; i < sharedLen; i++) {
      const idVal = view.ids[i];
      this.idNodes[i].nodeValue = "" + idVal;
      this.labelNodes[i].nodeValue = view.labels[i];
      this.rowIds[i] = idVal;
    }

    if (view.count > prevLen) {
      this.rows.length = view.count;
      this.idNodes.length = view.count;
      this.labelNodes.length = view.count;
      this.mountRange(prevLen, view.count, view.ids, view.labels);
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

  render(countOrRows: number | readonly TRow[], isAppend = false): SiliciumRowView {
    let view: SiliciumRowView;
    if (Array.isArray(countOrRows)) {
      const rows = countOrRows as unknown as readonly SiliciumRowRecord[];
      view = isAppend ? this.engine.appendRowsData(rows) : this.engine.setRows(rows);
    } else {
      const count = typeof countOrRows === "number" ? countOrRows : countOrRows.length;
      view = isAppend ? this.engine.appendRows(count) : this.engine.buildRows(count);
    }
    this.ensureIdsCapacity(view.count);

    if (isAppend) {
      const prevLen = this.rows.length;
      this.rows.length = view.count;
      this.idNodes.length = view.count;
      this.labelNodes.length = view.count;
      this.mountRange(prevLen, view.count, view.ids, view.labels);
      return view;
    }

    if (this.selectedTr) {
      this.selectedTr.className = "";
      this.selectedTr = null;
    }

    const prevLen = this.rows.length;
    if (prevLen === 0 || (this.keyed && view.count > 0 && this.rowIds[0] !== view.ids[0])) {
      return this.replaceRowsDetached(view);
    }

    return this.replaceRowsInSitu(view);
  }

  append(countOrRows: number | readonly TRow[]): SiliciumRowView {
    return this.render(countOrRows, true);
  }

  updateEvery10th(): SiliciumRowView {
    const view = this.engine.updateEvery10th();
    for (let i = 0; i < this.rows.length; i += 10) {
      this.labelNodes[i].nodeValue = view.labels[i];
    }
    return view;
  }

  swapRows(indexA = 1, indexB = 998): boolean {
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

  selectRowAt(rowIndex: number): void {
    const tr = this.rows[rowIndex];
    if (!tr) return;
    if (this.selectedTr) this.selectedTr.className = "";
    this.selectedTr = tr;
    tr.className = "danger";
    this.engine.selectRow(this.rowIds[rowIndex]);
  }

  deleteRowAt(rowIndex: number): void {
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

  handleClick(e: MouseEvent): void {
    let target = e.target as HTMLElement | null;
    if (target && target.tagName === "SPAN") {
      target = target.parentNode as HTMLElement | null;
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

  clear(): void {
    this.engine.clear();
    if (this.tbody.firstChild) this.tbody.textContent = "";
    this.rows.length = 0;
    this.idNodes.length = 0;
    this.labelNodes.length = 0;
    this.selectedTr = null;
  }
}

export function mountSiliciumV8DataGrid<TRow = SiliciumRowRecord>(
  container: HTMLElement,
  props: Partial<SiliciumV8DataGridProps<TRow>> = {}
): SiliciumV8DataGridController<TRow> {
  const engine = new SiliciumV8DomEngine();
  const grid = new SiliciumV8DataGridController<TRow>(engine, container, props);
  if (props.rows) grid.render(props.rows, false);
  return grid;
}

export function mountKrausestV8BenchmarkApp(doc: Document = document): SiliciumV8DataGridController {
  const tbody = doc.getElementById("tbody") as HTMLTableSectionElement;
  const grid = mountSiliciumV8DataGrid(tbody, { keyed: true });
  doc.getElementById("run")?.addEventListener("click", () => grid.render(1000, false));
  doc.getElementById("runlots")?.addEventListener("click", () => grid.render(10000, false));
  doc.getElementById("add")?.addEventListener("click", () => grid.append(1000));
  doc.getElementById("update")?.addEventListener("click", () => grid.updateEvery10th());
  doc.getElementById("clear")?.addEventListener("click", () => grid.clear());
  doc.getElementById("swaprows")?.addEventListener("click", () => grid.swapRows(1, 998));
  return grid;
}

export function SiliciumV8DataGrid<TRow = SiliciumRowRecord>(
  props: SiliciumV8DataGridProps<TRow>
): SiliciumV8DataGridDescriptor<TRow> {
  if (props.container) {
    mountSiliciumV8DataGrid(props.container, props);
  }
  return {
    $$typeof: Symbol.for("react.element"),
    type: SiliciumV8DataGrid,
    props,
    key: null,
    mount: (container: HTMLElement) => mountSiliciumV8DataGrid(container, props),
  };
}

if (
  typeof document !== "undefined" &&
  document.getElementById("tbody") &&
  document.getElementById("run")
) {
  mountKrausestV8BenchmarkApp(document);
}

