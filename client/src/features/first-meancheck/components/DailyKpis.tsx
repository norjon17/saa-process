import { SimpleGrid } from '@mantine/core';
import { memo, useMemo } from 'react';

import { KpiTile } from '@/components/ui/KpiTile';
import { KpiSkeleton } from '@/components/ui/Skeletons';
import type { DailySummary } from '@/lib/api/types';
import { fmtPct } from '@/lib/format';
import { useIsMobile } from '@/lib/useIsMobile';

/** Month totals from GET /daily/summary (skeleton tiles until the first summary arrives). */
export const DailyKpis = memo(function DailyKpis({ summary }: { summary: DailySummary | undefined }) {
  const t = useMemo(() => {
    const acc = { passed: 0, failed: 0, idle: 0, mb: 0, pending: 0 };
    for (const i of summary?.items ?? []) {
      acc.passed += i.passed;
      acc.failed += i.failed;
      acc.idle += i.idle;
      acc.mb += i.mb;
      acc.pending += i.pending;
    }
    const judged = acc.passed + acc.failed;
    return { ...acc, judged, passRate: judged > 0 ? acc.passed / judged : null };
  }, [summary]);
  // Phones: three tiles per row without the sub lines, so the six tiles take two short rows.
  const isMobile = useIsMobile();
  if (!summary) return <KpiSkeleton count={6} />;
  return (
    <SimpleGrid cols={{ base: 3, lg: 6 }} spacing={isMobile ? 6 : 10} mb="md">
      <KpiTile compactOnMobile sectionKey="s1" label="Pass rate" value={fmtPct(t.passRate)} sub={isMobile ? undefined : `${t.passed} of ${t.judged} judged`} />
      <KpiTile compactOnMobile sectionKey="s1" label="Passed" value={t.passed} />
      <KpiTile compactOnMobile sectionKey="s5" label="Failed" value={t.failed} />
      <KpiTile compactOnMobile sectionKey="s6" label="Idle" value={t.idle} />
      <KpiTile compactOnMobile sectionKey="s4" label="MB" value={t.mb} />
      <KpiTile compactOnMobile sectionKey="s2" label="Pending" value={t.pending} sub={isMobile ? undefined : 'incomplete days'} />
    </SimpleGrid>
  );
});
