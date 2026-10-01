import { Menu, Skeleton, Stack, Text, Tooltip } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconCheck, IconEraser } from '@tabler/icons-react';
import { memo, useMemo, useRef, useState, type ReactNode } from 'react';

import { formatLongDate, isWeekend } from '@/lib/time';

import { TablePager } from './TablePager';

import classes from './grid.module.css';

export interface GridOption {
  value: string;
  label: string;
  bg: string;
  fg: string;
  short?: string;
}

export interface GridRow {
  key: string;
  label: ReactNode;
  sub?: ReactNode;
  group: string;
  cells: Record<string, string | null | undefined>;
  tooltips?: Record<string, string>;
  readOnly?: boolean;
  /** Rows sharing a pageKey (e.g. one tool's 8 sub-rows) are always paged together. Defaults to `key`. */
  pageKey?: string;
  /** Extra trailing cell (e.g. month summary). */
  trailing?: ReactNode;
  /** Plain-text row name for the picker menu heading (defaults to `label` when it is a string). */
  pickerLabel?: string;
}

export interface ToolDateGridProps {
  rows: GridRow[];
  days: string[];
  options: GridOption[];
  onCellChange?: (rowKey: string, day: string, value: string | null) => void;
  readOnly?: boolean;
  trailingHeader?: ReactNode;
  cellWidth?: number;
  renderCell?: (value: string | null | undefined, option: GridOption | undefined) => ReactNode;
  /** Tools per page (default 20). Pass 0 to disable paging. */
  pageSize?: number;
  /** Skeleton while the first data loads. */
  loading?: boolean;
  unit?: string;
}

/** Touch / pen taps open the picker instead of cycling (phones have no right-click). */
const isTouchPointer = (type: string) => type === 'touch' || type === 'pen';

const Cell = memo(function Cell({
  value,
  option,
  options,
  onChange,
  readOnly,
  tooltip,
  width,
  render,
  pickerLabel,
}: {
  value: string | null | undefined;
  option: GridOption | undefined;
  options: GridOption[];
  onChange?: (v: string | null) => void;
  readOnly: boolean;
  tooltip?: string;
  width: number;
  render?: ToolDateGridProps['renderCell'];
  pickerLabel?: string;
}) {
  const [opened, setOpened] = useState(false);
  // Pointer type of the press that produced the next click (click events carry no reliable pointerType everywhere).
  const pointerType = useRef('mouse');
  const editable = !readOnly && !!onChange;
  const cycle = () => {
    if (!editable) return;
    const idx = options.findIndex((o) => o.value === value);
    const next = options[(idx + 1) % options.length]!;
    onChange(next.value);
  };
  const content = render ? render(value, option) : (option?.short ?? option?.label ?? '');
  const inner = (
    <div
      className={classes.cell}
      style={{ width, background: option?.bg ?? 'transparent', color: option?.fg ?? 'var(--saa-text3)', cursor: readOnly ? 'default' : 'pointer' }}
      onPointerDown={(e) => {
        pointerType.current = e.pointerType;
      }}
      onClick={() => {
        if (!editable) return;
        // Mouse: left-click cycles. Touch: a tap opens the picker so a value is never changed by accident.
        if (isTouchPointer(pointerType.current)) setOpened(true);
        else cycle();
      }}
      onContextMenu={(e) => {
        // Right-click (desktop) and long-press (Android) open the picker.
        if (readOnly) return;
        e.preventDefault();
        setOpened(true);
      }}
      onKeyDown={(e) => {
        if (!editable) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cycle();
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          onChange(null);
        }
        const n = Number(e.key);
        if (n >= 1 && n <= options.length) onChange(options[n - 1]!.value);
      }}
      tabIndex={readOnly ? -1 : 0}
      role={readOnly ? undefined : 'button'}
      aria-label={option?.label ?? 'empty'}
      aria-haspopup={editable ? 'menu' : undefined}
    >
      {content}
    </div>
  );
  const wrapped = tooltip ? (
    <Tooltip label={tooltip} withArrow openDelay={400}>
      {inner}
    </Tooltip>
  ) : (
    inner
  );
  if (!editable) return wrapped;
  return (
    <Menu
      opened={opened}
      // Only closes come from the Menu itself; it opens from right-click / tap above, so a mouse click never opens it.
      onChange={(o) => {
        if (!o) setOpened(false);
      }}
      shadow="md"
      position="bottom-start"
      withinPortal
    >
      <Menu.Target>{wrapped}</Menu.Target>
      <Menu.Dropdown className={classes.picker}>
        {pickerLabel && <Menu.Label>{pickerLabel}</Menu.Label>}
        {options.map((o) => (
          <Menu.Item
            key={o.value}
            onClick={() => onChange(o.value)}
            leftSection={<span className={classes.pickerSwatch} style={{ background: o.bg }} />}
            rightSection={o.value === value ? <IconCheck size={14} /> : undefined}
            data-current={o.value === value || undefined}
          >
            {o.label}
          </Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Item onClick={() => onChange(null)} disabled={value === null || value === undefined} leftSection={<IconEraser size={14} />}>
          Clear
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
});

/** True on touch-first devices (no hover / coarse pointer) — for "tap a cell to pick" hints. */
export function useTouchPointer(): boolean {
  return useMediaQuery('(hover: none) and (pointer: coarse)', false, { getInitialValueInEffect: false });
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** "Fri, September 4" — picker menu heading. */
const dayLabel = (d: string) => `${WEEKDAY[new Date(d + 'T00:00:00Z').getUTCDay()]}, ${formatLongDate(d).replace(/, \d{4}$/, '')}`;

/**
 * Tools × days grid (1st Meancheck daily monitor, Contact Chip). Mouse: left-click cycles the value,
 * right-click opens the picker menu. Touch: a tap (or Android long-press) opens the picker — nothing cycles.
 * Keyboard: Enter/Space cycles, 1–9 sets, Delete clears. Rows are grouped by area; the tool column is sticky.
 */
export function ToolDateGrid({ rows, days, options, onCellChange, readOnly, trailingHeader, cellWidth = 30, renderCell, pageSize: initialPageSize = 20, loading, unit = 'tools' }: ToolDateGridProps) {
  const optionByValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const paged = pageSize > 0;

  // Page over logical units (tools), keeping a tool's sub-rows together and group order intact.
  const pageKeys = useMemo(() => [...new Set(rows.map((r) => r.pageKey ?? r.key))], [rows]);
  const pages = paged ? Math.max(1, Math.ceil(pageKeys.length / pageSize)) : 1;
  const safePage = Math.min(page, pages);
  const visibleRows = useMemo(() => {
    if (!paged) return rows;
    const keep = new Set(pageKeys.slice((safePage - 1) * pageSize, safePage * pageSize));
    return rows.filter((r) => keep.has(r.pageKey ?? r.key));
  }, [paged, rows, pageKeys, safePage, pageSize]);

  const groups = useMemo(() => {
    const m = new Map<string, GridRow[]>();
    for (const r of visibleRows) m.set(r.group, [...(m.get(r.group) ?? []), r]);
    return [...m.entries()];
  }, [visibleRows]);

  if (loading && rows.length === 0) {
    return (
      <Stack gap={4} aria-busy="true" aria-label="Loading grid">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} height={26} radius="sm" opacity={1 - i * 0.07} />
        ))}
      </Stack>
    );
  }

  return (
    <div>
    <div className={classes.wrap}>
      <table className={classes.table}>
        <thead>
          <tr>
            <th className={classes.stickyCol}>Tool</th>
            {days.map((d) => (
              <th key={d} className={`${classes.dayHead} ${isWeekend(d) ? classes.weekend : ''}`} style={{ width: cellWidth }}>
                <div>{Number(d.slice(8, 10))}</div>
                <div className={classes.dayWk}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(d + 'T00:00:00Z').getUTCDay()]}</div>
              </th>
            ))}
            {trailingHeader !== undefined && <th className={classes.trailing}>{trailingHeader}</th>}
          </tr>
        </thead>
        <tbody>
          {groups.map(([group, groupRows]) => (
            <GroupRows key={group} group={group} rows={groupRows} days={days} options={options} optionByValue={optionByValue} onCellChange={onCellChange} readOnly={!!readOnly} cellWidth={cellWidth} renderCell={renderCell} hasTrailing={trailingHeader !== undefined} />
          ))}
        </tbody>
      </table>
    </div>
    {paged && (
      <TablePager
        page={safePage}
        pageSize={pageSize}
        total={pageKeys.length}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        pageSizeOptions={[10, 20, 50, 100]}
        unit={unit}
      />
    )}
    </div>
  );
}

function GroupRows({
  group,
  rows,
  days,
  options,
  optionByValue,
  onCellChange,
  readOnly,
  cellWidth,
  renderCell,
  hasTrailing,
}: {
  group: string;
  rows: GridRow[];
  days: string[];
  options: GridOption[];
  optionByValue: Map<string, GridOption>;
  onCellChange?: ToolDateGridProps['onCellChange'];
  readOnly: boolean;
  cellWidth: number;
  renderCell?: ToolDateGridProps['renderCell'];
  hasTrailing: boolean;
}) {
  return (
    <>
      <tr className={classes.groupRow}>
        <td colSpan={days.length + 1 + (hasTrailing ? 1 : 0)}>{group}</td>
      </tr>
      {rows.map((r) => {
        const rowName = r.pickerLabel ?? (typeof r.label === 'string' ? r.label : undefined);
        return (
        <tr key={r.key}>
          <td className={classes.stickyCol}>
            <Text fw={800} size="xs" style={{ lineHeight: 1.1 }}>
              {r.label}
            </Text>
            {r.sub && (
              <Text size="xs" c="dimmed" style={{ fontSize: '0.58rem' }}>
                {r.sub}
              </Text>
            )}
          </td>
          {days.map((d) => {
            const v = r.cells[d] ?? null;
            return (
              <td key={d} className={`${classes.cellTd} ${isWeekend(d) ? classes.weekend : ''}`}>
                <Cell
                  value={v}
                  option={v ? optionByValue.get(v) : undefined}
                  options={options}
                  onChange={onCellChange ? (val) => onCellChange(r.key, d, val) : undefined}
                  readOnly={readOnly || !!r.readOnly}
                  tooltip={r.tooltips?.[d]}
                  width={cellWidth}
                  render={renderCell}
                  pickerLabel={rowName ? `${rowName} · ${dayLabel(d)}` : dayLabel(d)}
                />
              </td>
            );
          })}
          {hasTrailing && <td className={classes.trailing}>{r.trailing}</td>}
        </tr>
        );
      })}
    </>
  );
}
