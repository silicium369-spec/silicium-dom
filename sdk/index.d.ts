// SPDX-License-Identifier: LicenseRef-Silicium-Community-1.0
// Protected under Patent Pending (The Silicium Authors). All rights reserved.

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

/**
 * Zero-copy linear buffer view mapped over WebAssembly or V8 planar memory.
 */
export interface SiliciumRowView {
  readonly count: number;
  readonly ids: Uint32Array;
  readonly labelIndices: Uint16Array;
  readonly labels?: readonly string[];
}

export interface SiliciumDataGridProps<TRow = SiliciumRowRecord> {
  readonly rows?: readonly TRow[] | number;
  readonly columns?: readonly SiliciumColumn<TRow>[];
  readonly keyed?: boolean;
  readonly container?: HTMLElement | null;
  readonly wasmSource?: string | URL | BufferSource | WebAssembly.Module;
  readonly onSelectRow?: (rowId: number, rowIndex: number) => void;
  readonly onDeleteRow?: (rowId: number, rowIndex: number) => void;
}

export interface SiliciumDataGridDescriptor<TRow = SiliciumRowRecord> {
  readonly $$typeof: symbol;
  readonly type: typeof SiliciumDataGrid;
  readonly props: SiliciumDataGridProps<TRow>;
  readonly key: string | null;
  mount(container: HTMLElement): Promise<SiliciumDataGridController<TRow>>;
}

export declare class SiliciumDomEngine {
  readonly memory: WebAssembly.Memory;
  static init(
    wasmSource?: string | URL | BufferSource | WebAssembly.Module
  ): Promise<SiliciumDomEngine>;
  constructor(instance: WebAssembly.Instance);
  get count(): number;
  getRowView(): SiliciumRowView;
  buildRows(count: number): SiliciumRowView;
  appendRows(count: number): SiliciumRowView;
  updateEvery10th(): SiliciumRowView;
  swapRows(indexA: number, indexB: number): boolean;
  selectRow(rowId: number): boolean;
  deleteRow(rowId: number): boolean;
  clear(): void;
  validateHtmlTagGrammar(utf8Bytes: Uint8Array): number;
  decodeLabel(labelCode: number): string;
}

export declare class SiliciumDataGridController<TRow = SiliciumRowRecord> {
  readonly engine: SiliciumDomEngine;
  readonly tbody: HTMLTableSectionElement;
  readonly keyed: boolean;
  readonly tplChunk8: DocumentFragment;
  readonly stencilIdNodes8: readonly Text[];
  readonly stencilLabelNodes8: readonly Text[];
  readonly tplChunk16: DocumentFragment;
  readonly stencilIdNodes16: readonly Text[];
  readonly stencilLabelNodes16: readonly Text[];
  readonly tplChunk64: DocumentFragment;
  readonly stencilIdNodes64: readonly Text[];
  readonly stencilLabelNodes64: readonly Text[];
  readonly decimatedLabelNodes10: readonly Text[];
  readonly decimatedLabels10: readonly string[];
  constructor(
    engine: SiliciumDomEngine,
    container: HTMLElement,
    props?: Partial<SiliciumDataGridProps<TRow>>
  );
  render(countOrRows: number | readonly TRow[], isAppend?: boolean): SiliciumRowView;
  append(count: number): SiliciumRowView;
  updateEvery10th(): SiliciumRowView;
  swapRows(indexA?: number, indexB?: number): boolean;
  selectRowAt(rowIndex: number): void;
  deleteRowAt(rowIndex: number): void;
  handleClick(e: MouseEvent): void;
  clear(): void;
}

export declare function SiliciumDataGrid<TRow = SiliciumRowRecord>(
  props: SiliciumDataGridProps<TRow>
): SiliciumDataGridDescriptor<TRow>;

export declare function mountSiliciumDataGrid<TRow = SiliciumRowRecord>(
  container: HTMLElement,
  props?: SiliciumDataGridProps<TRow>
): Promise<SiliciumDataGridController<TRow>>;

export declare function mountKrausestBenchmarkApp(
  doc?: Document,
  wasmSource?: string | URL | BufferSource | WebAssembly.Module
): Promise<SiliciumDataGridController>;

export interface SiliciumV8DataGridProps<TRow = SiliciumRowRecord> {
  readonly rows?: readonly TRow[] | number;
  readonly columns?: readonly SiliciumColumn<TRow>[];
  readonly keyed?: boolean;
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

export declare class SiliciumV8DomEngine {
  count: number;
  readonly ids: Uint32Array;
  readonly labelIndices: Uint16Array;
  readonly labels: string[];
  constructor(initialCapacity?: number);
  buildRows(count: number): SiliciumRowView;
  appendRows(count: number): SiliciumRowView;
  updateEvery10th(): SiliciumRowView;
  swapRows(indexA: number, indexB: number): boolean;
  selectRow(rowId: number): boolean;
  deleteRow(rowId: number): boolean;
  clear(): void;
  getRowView(): SiliciumRowView;
  decodeLabel(code: number): string;
}

export declare class SiliciumV8DataGridController<TRow = SiliciumRowRecord> {
  readonly engine: SiliciumV8DomEngine;
  readonly tbody: HTMLTableSectionElement;
  readonly keyed: boolean;
  readonly tplChunk8: DocumentFragment;
  readonly stencilIdNodes8: readonly Text[];
  readonly stencilLabelNodes8: readonly Text[];
  readonly tplChunk16: DocumentFragment;
  readonly stencilIdNodes16: readonly Text[];
  readonly stencilLabelNodes16: readonly Text[];
  readonly tplChunk64: DocumentFragment;
  readonly stencilIdNodes64: readonly Text[];
  readonly stencilLabelNodes64: readonly Text[];
  readonly decimatedLabelNodes10: readonly Text[];
  readonly decimatedLabels10: readonly string[];
  constructor(
    engine: SiliciumV8DomEngine,
    container: HTMLElement,
    props?: Partial<SiliciumV8DataGridProps<TRow>>
  );
  unrolledWalker(
    idNodes: readonly Text[],
    labelNodes: readonly Text[],
    count: number,
    startIdx: number,
    ids: Uint32Array,
    labels: readonly string[]
  ): void;
  unrolledWalkerRows(
    idNodes: readonly Text[],
    labelNodes: readonly Text[],
    count: number,
    srcIdx: number,
    srcRows: readonly SiliciumRowRecord[]
  ): void;
  buildDetachedFragment(
    startIdx: number,
    totalCount: number,
    ids: Uint32Array,
    labels: readonly string[]
  ): DocumentFragment;
  replaceRowsDetached(view: SiliciumRowView): SiliciumRowView;
  replaceRowsInSitu(countOrView: number | SiliciumRowView): SiliciumRowView;
  render(countOrRows: number | readonly TRow[], isAppend?: boolean): SiliciumRowView;
  append(count: number | readonly TRow[]): SiliciumRowView;
  updateEvery10th(): SiliciumRowView;
  swapRows(indexA?: number, indexB?: number): boolean;
  selectRowAt(rowIndex: number): void;
  deleteRowAt(rowIndex: number): void;
  handleClick(e: MouseEvent): void;
  clear(): void;
}

export declare function mountSiliciumV8DataGrid<TRow = SiliciumRowRecord>(
  container: HTMLElement,
  props?: Partial<SiliciumV8DataGridProps<TRow>>
): SiliciumV8DataGridController<TRow>;

export declare function mountKrausestV8BenchmarkApp(
  doc?: Document
): SiliciumV8DataGridController;

export declare function SiliciumV8DataGrid<TRow = SiliciumRowRecord>(
  props: SiliciumV8DataGridProps<TRow>
): SiliciumV8DataGridDescriptor<TRow>;
