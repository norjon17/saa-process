import { Card, Group, SimpleGrid, Skeleton, Stack } from '@mantine/core';

/** Skeleton placeholders shown while route chunks or first data loads. */
export function KpiSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 3, lg: count }} spacing={10} mb="md">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={130} radius={12} />
      ))}
    </SimpleGrid>
  );
}

export function TableSkeleton({ rows = 6, height = 30 }: { rows?: number; height?: number }) {
  return (
    <Stack gap={6} p="xs" aria-busy="true" aria-label="Loading table">
      <Skeleton height={26} radius="sm" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={height} radius="sm" opacity={1 - i * 0.1} />
      ))}
    </Stack>
  );
}

export function ChartSkeleton({ h = 260 }: { h?: number }) {
  return <Skeleton height={h} radius="md" aria-label="Loading chart" />;
}

export function PageSkeleton() {
  return (
    <Stack gap="md" aria-busy="true" aria-label="Loading page">
      <Group justify="space-between">
        <Stack gap={6}>
          <Skeleton height={26} width={220} radius="sm" />
          <Skeleton height={12} width={320} radius="sm" />
        </Stack>
        <Skeleton height={30} width={260} radius="sm" />
      </Group>
      <KpiSkeleton />
      <Card p={0}>
        <TableSkeleton rows={8} />
      </Card>
    </Stack>
  );
}
