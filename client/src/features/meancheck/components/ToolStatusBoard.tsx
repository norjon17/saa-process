import { SimpleGrid, Skeleton, Text } from '@mantine/core';
import { Link } from '@tanstack/react-router';
import { memo, useMemo } from 'react';

import type { ToolStatusItem } from '@/lib/api/types';
import { formatDateTime, plantClock } from '@/lib/time';

import classes from './meancheck.module.css';

export type ToolState = 'passed' | 'failed' | 'pending' | 'none';

const STATE_META: Record<ToolState, { label: string; className: string; swatch: string }> = {
  passed: { label: 'Passed today', className: classes.toolPassed!, swatch: '#00c000' },
  failed: { label: 'Failed', className: classes.toolFailed!, swatch: '#e53935' },
  pending: { label: 'No mean check today', className: classes.toolPending!, swatch: '#ffff00' },
  none: { label: 'No data', className: classes.toolNone!, swatch: '#cfd8dc' },
};

/** A failed latest lot stays red until a passing lot replaces it; a passing lot only counts green on its own day. */
export function toolState(item: ToolStatusItem, today: string): ToolState {
  if (!item.latest) return 'none';
  if (item.latest.verdict === 'failed') return 'failed';
  return item.latest.mcDate === today ? 'passed' : 'pending';
}

const REGION_RANK = (name: string) => (name.toLowerCase() === 'luzon' ? 0 : name.toLowerCase() === 'mindanao' ? 1 : name === 'Unassigned' ? 99 : 2);

function regionClass(name: string) {
  const n = name.toLowerCase();
  return n === 'luzon' ? classes.regionLuzon : n === 'mindanao' ? classes.regionMindanao : '';
}

const ToolCard = memo(function ToolCard({ item, state }: { item: ToolStatusItem; state: ToolState }) {
  const meta = STATE_META[state];
  const body = (
    <>
      <div className={classes.toolCode}>{item.tool.code}</div>
      <div className={classes.toolLine}>
        <span>Lot</span>
        <b>{item.latest?.lotNo ?? '—'}</b>
      </div>
      <div className={classes.toolLine}>
        <span>Model</span>
        <b>
          {item.latest?.model ?? '—'}
          {item.latest?.headType ? ` ${item.latest.headType}` : ''}
        </b>
      </div>
      <div className={classes.toolLine}>
        <span>Type</span>
        <b>{item.tool.toolType ?? '—'}</b>
      </div>
      <div className={classes.toolLine}>
        <span>Last MC</span>
        <b>{item.latest ? formatDateTime(item.latest.createdAt) : '—'}</b>
      </div>
      <div className={classes.toolVerdict}>{item.latest ? item.latest.verdict : 'no data'}</div>
    </>
  );
  const className = `${classes.tool} ${meta.className}`;
  if (!item.latest) return <div className={className}>{body}</div>;
  return (
    <Link to="/meancheck/$lotId" params={{ lotId: String(item.latest.lotId) }} className={className} title={meta.label}>
      {body}
    </Link>
  );
});

export function ToolStatusLegend() {
  return (
    <div className={classes.legend}>
      {(Object.keys(STATE_META) as ToolState[]).map((k) => (
        <span key={k}>
          <span className={classes.legendSwatch} style={{ background: STATE_META[k].swatch }} />
          {STATE_META[k].label}
        </span>
      ))}
    </div>
  );
}

/** Two region panels of placeholder tool cards while `GET /tool-status` loads. */
export function ToolStatusSkeleton() {
  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" aria-busy="true" aria-label="Loading tool status">
      {[0, 1].map((region) => (
        <div key={region} className={classes.regionCard}>
          <div className={classes.regionHdr}>
            <Skeleton height={14} width={160} radius="sm" />
            <Skeleton height={14} width={120} radius="sm" />
          </div>
          <div className={classes.toolGrid}>
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} height={128} radius={8} />
            ))}
          </div>
        </div>
      ))}
    </SimpleGrid>
  );
}

/** HGAProject-style "Mean Check Dashboard": tool cards grouped by region, coloured by the latest verdict. */
export const ToolStatusBoard = memo(function ToolStatusBoard({ items, loading }: { items: ToolStatusItem[]; loading?: boolean }) {
  const today = plantClock().date;
  const groups = useMemo(() => {
    const m = new Map<string, { item: ToolStatusItem; state: ToolState }[]>();
    for (const item of items) {
      const region = item.tool.region ?? 'Unassigned';
      m.set(region, [...(m.get(region) ?? []), { item, state: toolState(item, today) }]);
    }
    return [...m.entries()].toSorted(([a], [b]) => REGION_RANK(a) - REGION_RANK(b) || a.localeCompare(b));
  }, [items, today]);

  if (loading && !items.length) return <ToolStatusSkeleton />;

  if (!items.length) {
    return (
      <Text c="dimmed" size="sm" ta="center" py="lg">
        No active tools.
      </Text>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
      {groups.map(([region, entries]) => {
        const counts = entries.reduce<Record<ToolState, number>>(
          (acc, e) => {
            acc[e.state] += 1;
            return acc;
          },
          { passed: 0, failed: 0, pending: 0, none: 0 },
        );
        return (
          <div key={region} className={classes.regionCard}>
            <div className={`${classes.regionHdr} ${regionClass(region)}`}>
              <span>
                {region} · {entries.length} tools
              </span>
              <span className={classes.regionCounts}>
                <span className={classes.count}>✔ {counts.passed}</span>
                <span className={classes.count}>✖ {counts.failed}</span>
                <span className={classes.count}>⏳ {counts.pending}</span>
                <span className={classes.count}>— {counts.none}</span>
              </span>
            </div>
            <div className={classes.toolGrid}>
              {entries.map((e) => (
                <ToolCard key={e.item.tool.id} item={e.item} state={e.state} />
              ))}
            </div>
          </div>
        );
      })}
    </SimpleGrid>
  );
});
