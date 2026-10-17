import { Drawer, Popover, SimpleGrid, Skeleton, Text } from '@mantine/core';
import { memo, useMemo, useState, type Ref } from 'react';

import { useIsMobile } from '@/lib/useIsMobile';

import type { PmItem, PmPatch } from '../api';
import { PM_NUMBER_KEYS, pmProgress } from '../columns';
import { PM_STATE_META, PM_STATES, pmState, shortDate, type PmState } from '../pmState';
import classes from './pmBoard.module.css';
import { PmDoneEditor } from './PmDoneEditor';

const STATE_CLASS: Record<PmState, string> = { done: classes.done!, pending: classes.pending!, missed: classes.missed!, none: classes.none! };
const COUNT_ICON: Record<PmState, string> = { done: '✔', pending: '⏳', missed: '✖', none: '—' };

const REGION_RANK = (name: string) => (name.toLowerCase() === 'luzon' ? 0 : name.toLowerCase() === 'mindanao' ? 1 : name === 'Unassigned' ? 99 : 2);
const regionClass = (name: string) => (name.toLowerCase() === 'luzon' ? classes.regionLuzon : name.toLowerCase() === 'mindanao' ? classes.regionMindanao : '');

// Mantine 9 has no `size="auto"` for drawers (it resolves to an undefined CSS var → full height): size to content.
const BOTTOM_SHEET = { content: { height: 'auto', maxHeight: '90dvh', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } };

export const regionOf = (item: PmItem) => item.tool.region ?? 'Unassigned';

interface Entry {
  item: PmItem;
  state: PmState;
}

interface ToolCardProps {
  entry: Entry;
  year: string;
  open: boolean;
  onClick: (item: PmItem) => void;
  /** React 19: `ref` is a plain prop — Popover.Target attaches its anchor ref (and aria props) here. */
  ref?: Ref<HTMLButtonElement>;
}

/** The card face: tool, type, EE, state + done date. No measurement numbers — only a small "n/18" hint. */
const ToolCardFace = memo(function ToolCardFace({ entry, year, open, onClick, ref, ...rest }: ToolCardProps & Record<string, unknown>) {
  const { item, state } = entry;
  const meta = PM_STATE_META[state];
  const date = item.row?.actualDate;
  const filled = item.row ? pmProgress(item).filled : 0;
  return (
    <button
      type="button"
      {...rest}
      ref={ref}
      className={`${classes.tool} ${STATE_CLASS[state]} ${open ? classes.toolOpen : ''}`}
      onClick={() => onClick(item)}
      aria-label={`${item.tool.code}: ${state === 'done' && date ? `PM done ${shortDate(date, year)}` : meta.label}. Set PM done date`}
    >
      <div className={classes.toolTop}>
        <span className={classes.toolCode}>{item.tool.code}</span>
        <span className={classes.toolType}>{item.row?.toolType ?? item.tool.toolType ?? ''}</span>
      </div>
      <div className={classes.toolLine}>
        <span>EE</span>
        <b>{item.row?.ee?.name ?? item.tool.ee?.name ?? '—'}</b>
      </div>
      <div className={classes.toolState}>
        <span>{state === 'done' && date ? `Done ${shortDate(date, year)}` : meta.short}</span>
        {item.row && (
          <span className={classes.hint} title="PM measurements filled in (full PM form)">
            meas. {filled}/{PM_NUMBER_KEYS.length}
          </span>
        )}
      </div>
    </button>
  );
});

export function PmBoardLegend() {
  return (
    <div className={classes.legend}>
      {PM_STATES.map((k) => (
        <span key={k}>
          <span className={classes.legendSwatch} style={{ background: PM_STATE_META[k].swatch }} />
          {PM_STATE_META[k].label}
        </span>
      ))}
    </div>
  );
}

export function PmBoardSkeleton() {
  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" aria-busy="true" aria-label="Loading PM status">
      {[0, 1].map((region) => (
        <div key={region} className={classes.regionCard}>
          <div className={classes.regionHdr}>
            <Skeleton height={14} width={160} radius="sm" />
            <Skeleton height={14} width={120} radius="sm" />
          </div>
          <div className={classes.toolGrid}>
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} height={76} radius={8} />
            ))}
          </div>
        </div>
      ))}
    </SimpleGrid>
  );
}

export interface PmToolBoardProps {
  items: PmItem[];
  month: string;
  currentMonth: string;
  today: string;
  loading?: boolean;
  /** Message when `items` is empty (e.g. filters match nothing). */
  emptyMessage?: string;
  onSave: (item: PmItem, patch: PmPatch) => void;
  onOpenForm: (item: PmItem) => void;
}

/**
 * PM status as tool cards grouped by region (like Meancheck → Tool status). Tapping a card sets the PM done date:
 * a Popover next to the card on desktop, a bottom Drawer on phones.
 */
export function PmToolBoard({ items, month, currentMonth, today, loading, emptyMessage = 'No active tools.', onSave, onOpenForm }: PmToolBoardProps) {
  const isMobile = useIsMobile();
  const [openId, setOpenId] = useState<number | null>(null);
  const year = month.slice(0, 4);

  const groups = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const item of items) {
      const region = regionOf(item);
      const list = m.get(region) ?? [];
      list.push({ item, state: pmState(item, month, currentMonth) });
      m.set(region, list);
    }
    return [...m.entries()].toSorted(([a], [b]) => REGION_RANK(a) - REGION_RANK(b) || a.localeCompare(b));
  }, [items, month, currentMonth]);

  const openEntry = useMemo(() => {
    if (openId === null) return null;
    for (const [, entries] of groups) for (const e of entries) if (e.item.tool.id === openId) return e;
    return null;
  }, [groups, openId]);

  if (loading && !items.length) return <PmBoardSkeleton />;
  if (!items.length) {
    return (
      <Text c="dimmed" size="sm" ta="center" py="lg">
        {emptyMessage}
      </Text>
    );
  }

  const close = () => setOpenId(null);
  const toggle = (item: PmItem) => setOpenId((id) => (id === item.tool.id ? null : item.tool.id));
  const editor = (e: Entry, phone: boolean) => (
    <PmDoneEditor
      key={`${e.item.tool.id}-${month}`}
      item={e.item}
      month={month}
      state={e.state}
      today={today}
      phone={phone}
      onSave={(patch) => {
        onSave(e.item, patch);
        close();
      }}
      onOpenForm={() => {
        close();
        onOpenForm(e.item);
      }}
    />
  );

  return (
    <>
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        {groups.map(([region, entries]) => {
          const counts = entries.reduce<Record<PmState, number>>(
            (acc, e) => {
              acc[e.state] += 1;
              return acc;
            },
            { done: 0, pending: 0, missed: 0, none: 0 },
          );
          return (
            <section key={region} className={classes.regionCard} aria-label={`${region} tools`}>
              <div className={`${classes.regionHdr} ${regionClass(region)}`}>
                <span>
                  {region} · {entries.length} {entries.length === 1 ? 'tool' : 'tools'}
                </span>
                <span className={classes.regionCounts}>
                  {PM_STATES.filter((s) => s !== 'missed' || counts.missed > 0).map((s) => (
                    <span key={s} className={classes.count} title={PM_STATE_META[s].label}>
                      {COUNT_ICON[s]} {counts[s]}
                    </span>
                  ))}
                </span>
              </div>
              <div className={classes.toolGrid}>
                {entries.map((e) =>
                  isMobile ? (
                    <ToolCardFace key={e.item.tool.id} entry={e} year={year} open={openId === e.item.tool.id} onClick={toggle} />
                  ) : (
                    <Popover
                      key={e.item.tool.id}
                      opened={openId === e.item.tool.id}
                      onChange={(o) => !o && close()}
                      onDismiss={close}
                      width={280}
                      position="bottom"
                      withArrow
                      shadow="md"
                      trapFocus
                      returnFocus
                    >
                      <Popover.Target>
                        <ToolCardFace entry={e} year={year} open={openId === e.item.tool.id} onClick={toggle} />
                      </Popover.Target>
                      <Popover.Dropdown>{openId === e.item.tool.id && editor(e, false)}</Popover.Dropdown>
                    </Popover>
                  ),
                )}
              </div>
            </section>
          );
        })}
      </SimpleGrid>

      {isMobile && (
        <Drawer opened={openEntry !== null} onClose={close} position="bottom" padding="md" withCloseButton={false} radius="lg" styles={BOTTOM_SHEET}>
          {openEntry && editor(openEntry, true)}
        </Drawer>
      )}
    </>
  );
}
