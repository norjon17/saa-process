import { BarChart, LineChart } from '@mantine/charts';
import { Card, SimpleGrid } from '@mantine/core';
import { useMemo } from 'react';

import type { SectionKey } from '@shared/domain';
import { SECTION_KEYS, SECTION_META } from '@shared/domain';

import { EmptyState } from '@/components/ui/EmptyState';
import type { Endorsement } from '@/lib/api/types';
import { monthLabel } from '@/lib/time';
import { useIsMobile } from '@/lib/useIsMobile';
import { SECTIONS } from '@/theme/colors';

import classes from '../endorsement.module.css';
import { asSectionKey } from '../sections';

/** One stacked series per section so each category bar wears its section colour (fixed order s1…s6). */
const SECTION_SERIES = SECTION_KEYS.map((k) => ({ name: k, label: SECTION_META[k].name, color: `${SECTIONS[k].mantine}.7`, stackId: 'n' }));

type CategoryRow = { category: string; sectionKey: SectionKey; total: number } & Partial<Record<SectionKey, number>>;

/** Phones: category names are cut to fit the narrower axis (the tooltip still shows the full name). */
const shortLabel = (v: unknown) => {
  const s = String(v);
  return s.length > 13 ? `${s.slice(0, 12).trimEnd()}…` : s;
};

export function ToolCharts({ rows }: { rows: Endorsement[] }) {
  const isMobile = useIsMobile();
  const live = useMemo(() => rows.filter((r) => !r.isNone), [rows]);

  const byCategory = useMemo<CategoryRow[]>(() => {
    const m = new Map<string, CategoryRow>();
    for (const r of live) {
      const key = asSectionKey(r.sectionKey);
      const name = r.category?.name ?? `${SECTION_META[key].name} (uncategorised)`;
      const cur = m.get(name) ?? { category: name, sectionKey: key, total: 0 };
      cur.total += 1;
      cur[key] = (cur[key] ?? 0) + 1;
      m.set(name, cur);
    }
    return [...m.values()].toSorted((a, b) => SECTION_KEYS.indexOf(a.sectionKey) - SECTION_KEYS.indexOf(b.sectionKey) || b.total - a.total);
  }, [live]);

  const byMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of live) {
      const k = r.date.slice(0, 7);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    // "Sep 2026" — short enough that a 9-month axis never collides
    return [...m.entries()].toSorted(([a], [b]) => a.localeCompare(b)).map(([month, n]) => ({ month: monthLabel(month).replace(/^(\w{3})\w+ /, '$1 '), n }));
  }, [live]);

  if (!live.length) return <EmptyState message="No endorsements for this tool yet." />;

  const usedSeries = SECTION_SERIES.filter((s) => byCategory.some((c) => (c[s.name] ?? 0) > 0));
  const barHeight = Math.max(220, byCategory.length * 34 + 60);

  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
      <Card className={classes.chartCard}>
        <div className={classes.chartTitle}>Endorsements per category</div>
        <div className={classes.chartSub}>Coloured by board section · {live.length} rows</div>
        <BarChart
          h={barHeight}
          data={byCategory}
          dataKey="category"
          orientation="vertical"
          type="stacked"
          series={usedSeries}
          withLegend={usedSeries.length > 1}
          legendProps={{ verticalAlign: 'bottom' }}
          maxBarWidth={22}
          gridAxis="x"
          tickLine="none"
          yAxisProps={isMobile ? { width: 100, tickFormatter: shortLabel, fontSize: 10, interval: 0 } : { width: 150 }}
          valueFormatter={(v) => String(v)}
          barProps={{ radius: [0, 4, 4, 0] }}
        />
      </Card>
      <Card className={classes.chartCard}>
        <div className={classes.chartTitle}>Endorsements per month</div>
        <div className={classes.chartSub}>Count of non-NONE rows by month</div>
        <LineChart
          h={isMobile ? 220 : barHeight}
          data={byMonth}
          dataKey="month"
          series={[{ name: 'n', label: 'Endorsements', color: 'brand.6' }]}
          curveType="monotone"
          strokeWidth={2}
          dotProps={{ r: 4 }}
          activeDotProps={{ r: 6 }}
          gridAxis="y"
          tickLine="none"
          yAxisProps={{ allowDecimals: false, ...(isMobile ? { width: 28 } : {}) }}
          xAxisProps={isMobile ? { fontSize: 10, interval: 'preserveStartEnd' } : undefined}
          withLegend={false}
        />
      </Card>
    </SimpleGrid>
  );
}
