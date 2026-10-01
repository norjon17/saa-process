import { Chip, Group, Loader, SegmentedControl, Skeleton, Stack, Text, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconHistory, IconSearch } from '@tabler/icons-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { useRegions, useUsers } from '@/features/ref/api';
import type { AuditAction, AuditEntity } from '@/lib/api/types';
import { useIsMobile } from '@/lib/useIsMobile';

import { useChangeLogs, type ChangeLogFilters } from './api';
import classes from './change-logs.module.css';
import { ChangeLogRow, type ValueResolver } from './ChangeLogRow';

const ACTION_OPTIONS: { value: 'all' | AuditAction; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'activate', label: 'Activate' },
  { value: 'deactivate', label: 'Deactivate' },
];

/** Fetch the next page when the last rendered row is this close to the end of what is loaded. */
const PREFETCH_ROWS = 10;

/**
 * Drawer body (lazy-loaded chunk): filters + a virtualised, infinitely scrolling history list.
 * Only the rows in view (+ overscan) are in the DOM, however many pages have been loaded.
 */
export default function ChangeLogDrawerContent({ entities }: { entities: readonly AuditEntity[] }) {
  const [search, setSearch] = useState('');
  const [q] = useDebouncedValue(search.trim(), 300);
  const [action, setAction] = useState<'all' | AuditAction>('all');
  const filters = useMemo<ChangeLogFilters>(() => ({ entities, q, action: action === 'all' ? null : action }), [entities, q, action]);
  // Phones: five segments do not fit 360px, so the action filter becomes wrapping chips.
  const isMobile = useIsMobile();

  return (
    <>
      <Stack gap={8} className={classes.filters}>
        <TextInput
          size={isMobile ? 'sm' : 'xs'}
          placeholder="Search name, label or changed value…"
          leftSection={<IconSearch size={14} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          aria-label="Search change logs"
        />
        {isMobile ? (
          <Chip.Group value={action} onChange={(v) => setAction(v as 'all' | AuditAction)}>
            <Group gap={6} role="radiogroup" aria-label="Filter by action">
              {ACTION_OPTIONS.map((o) => (
                <Chip key={o.value} value={o.value} size="sm" radius="xl" variant="outline">
                  {o.label}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        ) : (
          <SegmentedControl size="xs" fullWidth data={ACTION_OPTIONS} value={action} onChange={(v) => setAction(v as 'all' | AuditAction)} aria-label="Filter by action" />
        )}
      </Stack>
      {/* Remount per filter set: new query key, scroll back to the top, fresh measurements. */}
      <ChangeLogList key={JSON.stringify(filters)} filters={filters} />
    </>
  );
}

function ChangeLogList({ filters }: { filters: ChangeLogFilters }) {
  const query = useChangeLogs(filters);
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const resolve = useResolver();

  const scrollRef = useRef<HTMLDivElement>(null);
  // One extra virtual row at the end for the loader / "End of history" marker.
  const count = items.length > 0 ? items.length + 1 : 0;
  // No React Compiler in this app; the virtualizer instance is read fresh on every render below.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
    overscan: 8,
    getItemKey: (index) => items[index]?.id ?? 'footer',
  });
  const virtualItems = virtualizer.getVirtualItems();
  const lastIndex = virtualItems.length ? virtualItems[virtualItems.length - 1]!.index : -1;

  useEffect(() => {
    if (lastIndex >= items.length - PREFETCH_ROWS && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [lastIndex, items.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (query.isPending) {
    return (
      <div className={classes.scroller} aria-busy="true" aria-label="Loading change logs">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={classes.skeletonRow}>
            <Skeleton height={12} width="60%" radius="sm" mb={6} />
            <Skeleton height={10} width="85%" radius="sm" />
          </div>
        ))}
      </div>
    );
  }
  if (query.isError) {
    return (
      <Text size="sm" c="red">
        Could not load change logs: {query.error.message}
      </Text>
    );
  }
  if (items.length === 0) {
    return <EmptyState icon={<IconHistory size={28} stroke={1.4} />} message={filters.q || filters.action ? 'No changes match these filters' : 'No changes recorded yet'} />;
  }

  return (
    <div ref={scrollRef} className={classes.scroller}>
      <div className={classes.sizer} style={{ height: virtualizer.getTotalSize() }}>
        {virtualItems.map((vi) => {
          const log = items[vi.index];
          return (
            <div key={vi.key} ref={virtualizer.measureElement} data-index={vi.index} className={classes.item} style={{ transform: `translateY(${vi.start}px)` }}>
              {log ? (
                <ChangeLogRow log={log} resolve={resolve} />
              ) : (
                <div className={classes.status}>
                  {hasNextPage || isFetchingNextPage ? (
                    <>
                      <Loader size="xs" /> Loading more…
                    </>
                  ) : (
                    'End of history'
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Resolve region / EE ids to names from the (already cached) reference lists. */
function useResolver(): ValueResolver {
  const users = useUsers(true);
  const regions = useRegions();
  const userNames = useMemo(() => new Map((users.data ?? []).map((u) => [u.id, u.name])), [users.data]);
  const regionNames = useMemo(() => new Map((regions.data ?? []).map((r) => [r.id, r.name])), [regions.data]);
  return useCallback(
    (field: string, value: unknown) => {
      if (typeof value !== 'number') return undefined;
      if (field === 'eeUserId') return userNames.get(value);
      if (field === 'regionId') return regionNames.get(value);
      return undefined;
    },
    [userNames, regionNames],
  );
}
