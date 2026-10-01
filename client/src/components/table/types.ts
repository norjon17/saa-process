import type { ReactNode } from 'react';

export type CellEditor =
  | { kind: 'text'; placeholder?: string }
  | { kind: 'textarea'; placeholder?: string }
  | { kind: 'number'; step?: number; precision?: number; min?: number; max?: number }
  | { kind: 'date' }
  | { kind: 'checkbox' }
  | { kind: 'select'; options: () => { value: string; label: string }[]; clearable?: boolean }
  | { kind: 'pill'; options: () => { value: string; label: string; bg: string; fg: string }[] }
  | { kind: 'multiselect'; options: () => { value: string; label: string }[]; max?: number };

/**
 * App-level column definition. Every table in the app is described with these and converted to
 * TanStack Table 9 column defs inside `useAppTable` — nothing else touches the TanStack API.
 */
export interface AppColumn<T> {
  id: string;
  header: ReactNode;
  /** Value used for sorting / export / editing. */
  accessor: (row: T) => string | number | boolean | null | undefined | string[] | number[];
  /** Custom cell renderer (read-only tables, or when not editing). */
  render?: (row: T) => ReactNode;
  width?: number;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  editor?: CellEditor;
  /** Value to write when the editor commits (defaults to the accessor value shape). */
  readOnly?: (row: T) => boolean;
  exportValue?: (row: T) => string | number | null | undefined;
  hidden?: boolean;
  /**
   * Phone card layout (DataTable below 768px): `title` → shown in the card heading (defaults to the first column),
   * `full` → label above a full-width value (long text, multi-selects), `hidden` → left out of the card.
   */
  mobile?: 'title' | 'full' | 'hidden';
  /** Card label when `header` is not plain text (or is too long for a phone). */
  mobileLabel?: string;
}

export interface SortSpec {
  id: string;
  desc: boolean;
}
