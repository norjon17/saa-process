import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import type { EndorsementProgress, SectionKey, Shift } from '@shared/domain';
import { SECTION_META } from '@shared/domain';

import type { AppColumn } from '@/components/table/types';
import { Pill, RemarkPill, ShiftPill } from '@/components/ui/StatusPill';
import type { Category, Endorsement, EndorsementInput, Tool, User } from '@/lib/api/types';
import { peopleLabel } from '@/lib/format';
import { SHIFT_COLORS } from '@/theme/colors';

import { ToolSelectCell } from './components/ToolSelectCell';
import classes from './endorsement.module.css';
import { asSectionKey } from './sections';

export interface ColumnRefs {
  categories: Category[];
  tools: Tool[];
  users: User[];
}

export interface ColumnOptions {
  /** board = fully editable; history = only Remarks editable; tool = read-only, tool column hidden. */
  mode: 'board' | 'history' | 'tool';
  refs: ColumnRefs;
  /** Board only: commit handler for the Tool select (rendered as a custom cell so the code can also link to the drilldown). */
  onToolChange?: (row: Endorsement, toolId: number | null) => void;
  /**
   * Phone card layout (DataTable below 768px). Board cards: tool + remarks in the heading, date/shift hidden (the board's
   * shift navigator already says them). History/tool cards: date, shift, tool, remarks in the heading. NONE rows show a
   * single NONE instead of one per heading cell.
   */
  mobile?: boolean;
}

/** Column widths from the original dashboard (px, minimums). Tool takes 22px from Status so the inline select + drilldown link fit. */
export const COLUMN_WIDTHS = { date: 88, shift: 52, category: 160, tool: 92, issue: 190, status: 408, by: 105, to: 105, remarks: 85 } as const;
export const TABLE_MIN_WIDTH = Object.values(COLUMN_WIDTHS).reduce((a, b) => a + b, 0) + 34;

const SHIFT_PILL_OPTIONS = (['DS', 'NS'] as const satisfies readonly Shift[]).map((s) => ({ value: s, label: s, bg: SHIFT_COLORS[s].gradient, fg: '#fff' }));

const REMARK_PILL_OPTIONS: { value: EndorsementProgress; label: string; bg: string; fg: string }[] = [
  { value: 'open', label: '-', bg: '#e2e8f0', fg: '#64748b' },
  { value: 'ongoing', label: 'Ongoing', bg: 'linear-gradient(135deg,#854d0e,#ca8a04)', fg: '#fef08a' },
  { value: 'done', label: 'DONE', bg: 'linear-gradient(135deg,#166534,#16a34a)', fg: '#fff' },
];

const NONE = 'NONE';
const noneOr = (r: Endorsement, node: ReactNode): ReactNode => (r.isNone ? NONE : node);
const isNone = (r: Endorsement) => r.isNone;

const people = (list: { name: string }[], raw: string | null) => (list.length ? peopleLabel(list) : (raw ?? ''));

export function toolLink(tool: { id: number; code: string } | null): ReactNode {
  if (!tool) return '';
  return (
    <Link to="/endorsement/tools/$toolId" params={{ toolId: String(tool.id) }} className={classes.codeLink}>
      {tool.code}
    </Link>
  );
}

function categoryCell(r: Endorsement): ReactNode {
  const key = asSectionKey(r.sectionKey);
  return (
    <span className={classes.catLine}>
      <span className={classes.catSection} style={{ color: `var(--saa-${key}-text)` }}>
        {SECTION_META[key].name}
      </span>
      <span>{r.category?.name ?? '—'}</span>
    </span>
  );
}

export function buildEndorsementColumns(o: ColumnOptions): AppColumn<Endorsement>[] {
  const board = o.mode === 'board';
  const mobile = !!o.mobile;
  /** NONE rows on phone cards: heading cells other than the first say nothing (the card is already black + "NONE"). */
  const noneQuiet = (r: Endorsement, node: ReactNode): ReactNode => (r.isNone ? (mobile ? null : NONE) : node);
  const { categories, tools, users } = o.refs;
  const categoryOptions = () => categories.filter((c) => c.isActive).map((c) => ({ value: String(c.id), label: c.name }));
  const toolOptions = () => tools.filter((t) => t.isActive).map((t) => ({ value: String(t.id), label: t.code }));
  const userOptions = () => users.filter((u) => u.isActive).map((u) => ({ value: String(u.id), label: u.name }));

  const cols: AppColumn<Endorsement>[] = [
    {
      id: 'date',
      header: 'Date',
      accessor: (r) => r.date,
      render: (r) => (r.isNone ? <span className={classes.noneDate}>{r.date}</span> : r.date),
      width: COLUMN_WIDTHS.date,
      minWidth: COLUMN_WIDTHS.date,
      sortable: true,
      mobile: board ? 'hidden' : 'title',
      ...(board ? { editor: { kind: 'date' as const }, readOnly: isNone } : {}),
    },
    {
      id: 'shift',
      header: 'Shift',
      accessor: (r) => r.shift,
      render: (r) => noneQuiet(r, <ShiftPill shift={r.shift} />),
      width: COLUMN_WIDTHS.shift,
      minWidth: COLUMN_WIDTHS.shift,
      sortable: false,
      mobile: board ? 'hidden' : 'title',
      ...(board ? { editor: { kind: 'pill' as const, options: () => SHIFT_PILL_OPTIONS }, readOnly: isNone } : {}),
    },
    {
      id: 'category',
      header: 'Section / Category',
      accessor: (r) => (r.category ? String(r.category.id) : null),
      render: (r) => noneOr(r, board ? (r.category?.name ?? '—') : categoryCell(r)),
      exportValue: (r) => (r.isNone ? NONE : (r.category?.name ?? '')),
      width: COLUMN_WIDTHS.category,
      minWidth: COLUMN_WIDTHS.category,
      sortable: false,
      mobile: 'full',
      mobileLabel: board ? 'Category' : 'Section / category',
      ...(board ? { editor: { kind: 'select' as const, options: categoryOptions }, readOnly: isNone } : {}),
    },
    {
      id: 'tool',
      header: 'Tool',
      accessor: (r) => r.tool?.id ?? null,
      render: (r) => {
        if (r.isNone) return NONE;
        if (board && o.onToolChange) {
          const onChange = o.onToolChange;
          return <ToolSelectCell value={r.tool ? String(r.tool.id) : null} toolId={r.tool?.id ?? null} options={toolOptions()} onChange={(id) => onChange(r, id)} />;
        }
        return toolLink(r.tool);
      },
      exportValue: (r) => (r.isNone ? NONE : (r.tool?.code ?? '')),
      width: COLUMN_WIDTHS.tool,
      minWidth: COLUMN_WIDTHS.tool,
      sortable: false,
      mobile: 'title',
      hidden: o.mode === 'tool',
    },
    {
      id: 'issue',
      header: 'Issue',
      accessor: (r) => r.issue,
      render: (r) => noneOr(r, <div className={classes.wrapText}>{r.issue}</div>),
      width: COLUMN_WIDTHS.issue,
      minWidth: COLUMN_WIDTHS.issue,
      align: 'left',
      sortable: false,
      mobile: 'full',
      ...(board ? { editor: { kind: 'textarea' as const, placeholder: 'Issue…' }, readOnly: isNone } : {}),
    },
    {
      id: 'actionStatus',
      header: 'Status',
      accessor: (r) => r.actionStatus,
      render: (r) => noneOr(r, <div className={classes.wrapText}>{r.actionStatus}</div>),
      width: COLUMN_WIDTHS.status,
      minWidth: COLUMN_WIDTHS.status,
      align: 'left',
      sortable: false,
      mobile: 'full',
      mobileLabel: 'Action / status',
      ...(board ? { editor: { kind: 'textarea' as const, placeholder: 'Action / status…' }, readOnly: isNone } : {}),
    },
    {
      id: 'endorseBy',
      header: 'Endorse By',
      accessor: (r) => r.endorseBy.map((p) => String(p.id)),
      render: (r) => noneOr(r, people(r.endorseBy, r.endorseByRaw)),
      exportValue: (r) => (r.isNone ? NONE : people(r.endorseBy, r.endorseByRaw)),
      width: COLUMN_WIDTHS.by,
      minWidth: COLUMN_WIDTHS.by,
      sortable: false,
      ...(board ? { editor: { kind: 'multiselect' as const, options: userOptions, max: 2 }, readOnly: isNone } : {}),
    },
    {
      id: 'endorseTo',
      header: 'Endorse To',
      accessor: (r) => r.endorseTo.map((p) => String(p.id)),
      render: (r) => noneOr(r, people(r.endorseTo, r.endorseToRaw)),
      exportValue: (r) => (r.isNone ? NONE : people(r.endorseTo, r.endorseToRaw)),
      width: COLUMN_WIDTHS.to,
      minWidth: COLUMN_WIDTHS.to,
      sortable: false,
      ...(board ? { editor: { kind: 'multiselect' as const, options: userOptions }, readOnly: isNone } : {}),
    },
    {
      id: 'progress',
      header: 'Remarks',
      accessor: (r) => r.progress,
      render: (r) => noneQuiet(r, <RemarkPill progress={r.progress} />),
      exportValue: (r) => (r.isNone ? NONE : remarkLabel(r.progress)),
      width: COLUMN_WIDTHS.remarks,
      minWidth: COLUMN_WIDTHS.remarks,
      sortable: false,
      mobile: 'title',
      ...(o.mode !== 'tool' ? { editor: { kind: 'pill' as const, options: () => REMARK_PILL_OPTIONS }, readOnly: isNone } : {}),
    },
  ];
  return cols;
}

export const remarkLabel = (p: EndorsementProgress) => (p === 'done' ? 'DONE' : p === 'ongoing' ? 'Ongoing' : '-');

const ids = (v: unknown) => (Array.isArray(v) ? v.map(Number).filter((n) => Number.isFinite(n)) : []);

/** Translates an inline-editor commit into the PATCH body the server expects. */
export function patchFromCell(columnId: string, value: unknown): Partial<EndorsementInput> | null {
  switch (columnId) {
    case 'date':
      return typeof value === 'string' && value ? { date: value } : null;
    case 'shift':
      return value === 'DS' || value === 'NS' ? { shift: value } : null;
    case 'category':
      return value ? { categoryId: Number(value) } : { categoryId: null };
    case 'tool':
      return value ? { toolId: Number(value) } : { toolId: null };
    case 'issue':
      return { issue: String(value ?? '') };
    case 'actionStatus':
      return { actionStatus: String(value ?? '') };
    case 'endorseBy':
      return { endorseBy: ids(value) };
    case 'endorseTo':
      return { endorseTo: ids(value) };
    case 'progress':
      return value === 'open' || value === 'ongoing' || value === 'done' ? { progress: value } : null;
    default:
      return null;
  }
}

/** Client-side CSV export in the same column order as the server's. */
export const EXPORT_HEADERS = ['Date', 'Shift', 'Section', 'Category', 'Tool', 'Issue', 'Status', 'Endorse By', 'Endorse To', 'Remarks'];
export function exportRow(e: Endorsement): (string | number | null)[] {
  const key: SectionKey = asSectionKey(e.sectionKey);
  return [
    e.date,
    e.shift,
    SECTION_META[key].name,
    e.isNone ? NONE : (e.category?.name ?? ''),
    e.isNone ? NONE : (e.tool?.code ?? ''),
    e.issue,
    e.actionStatus,
    e.isNone ? NONE : people(e.endorseBy, e.endorseByRaw),
    e.isNone ? NONE : people(e.endorseTo, e.endorseToRaw),
    e.isNone ? NONE : remarkLabel(e.progress),
  ];
}

export function SectionPill({ sectionKey }: { sectionKey: SectionKey }) {
  return <Pill style={{ background: `var(--saa-${sectionKey}-bg)`, color: `var(--saa-${sectionKey}-text)` }}>{SECTION_META[sectionKey].name}</Pill>;
}
