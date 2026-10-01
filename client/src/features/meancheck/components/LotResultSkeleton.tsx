import { Group, SimpleGrid, Skeleton, Stack } from '@mantine/core';

import { ChartSkeleton } from '@/components/ui/Skeletons';

import classes from './meancheck.module.css';

/** Chart grid placeholder (six charts, two per row on large screens) while the recharts chunk loads. */
export function LotChartsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading charts">
      <div className={classes.blockTitle}>Charts (heads in fixture order)</div>
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        {Array.from({ length: 6 }, (_, i) => (
          <ChartSkeleton key={i} h={i < 4 ? 246 : 266} />
        ))}
      </SimpleGrid>
    </div>
  );
}

function BlockSkeleton({ rows, titleWidth = 220 }: { rows: number; titleWidth?: number }) {
  return (
    <Stack gap={4}>
      <Skeleton height={14} width={titleWidth} radius="sm" mb={4} />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={22} radius="sm" opacity={1 - i * 0.05} />
      ))}
    </Stack>
  );
}

/** Placeholder with the shape of `LotResultCard` (hero, info, the three report blocks, charts) while `GET /lots/:id` or a dry run is in flight. */
export function LotResultSkeleton({ withCharts = true }: { withCharts?: boolean }) {
  return (
    <div className={classes.card} aria-busy="true" aria-label="Loading verdict">
      <Group justify="space-between" p="md" wrap="nowrap">
        <Stack gap={6}>
          <Skeleton height={24} width={240} radius="sm" />
          <Skeleton height={12} width={320} radius="sm" />
        </Stack>
        <Skeleton height={34} width={120} radius="xl" />
      </Group>
      <div className={classes.body}>
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="xs">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} height={38} radius="sm" />
          ))}
        </SimpleGrid>
        <BlockSkeleton rows={4} titleWidth={300} />
        <BlockSkeleton rows={8} />
        <BlockSkeleton rows={6} titleWidth={140} />
        {withCharts && <LotChartsSkeleton />}
      </div>
    </div>
  );
}
