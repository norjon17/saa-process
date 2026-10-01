import { BarChart } from '@mantine/charts';
import { Card, Text } from '@mantine/core';
import { memo, useMemo } from 'react';

import type { DailySummary } from '@/lib/api/types';

import { PASS_TARGET_PCT } from '../model';

/** Daily pass % (passed / (passed + failed)) for the month, with the 80 % target line. */
export const DailyPassChart = memo(function DailyPassChart({ items, days }: { items: DailySummary['items'] | undefined; days: string[] }) {
  const data = useMemo(() => {
    const byDate = new Map((items ?? []).map((i) => [i.date, i]));
    return days.map((d) => {
      const i = byDate.get(d);
      return { day: String(Number(d.slice(8, 10))), passRate: i && i.passRate !== null ? Math.round(i.passRate * 100) : null, judged: i ? i.passed + i.failed : 0 };
    });
  }, [items, days]);
  return (
    <Card padding="sm">
      <Text size="xs" fw={800} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }} mb={4}>
        Daily pass % · target {PASS_TARGET_PCT}%
      </Text>
      <BarChart
        h={200}
        data={data}
        dataKey="day"
        series={[{ name: 'passRate', label: 'Pass %', color: 'brand.6' }]}
        yAxisProps={{ domain: [0, 100], width: 40, fontSize: 10 }}
        xAxisProps={{ fontSize: 10 }}
        gridAxis="y"
        tickLine="none"
        maxBarWidth={22}
        barProps={{ radius: [4, 4, 0, 0] }}
        referenceLines={[{ y: PASS_TARGET_PCT, label: `${PASS_TARGET_PCT}% target`, labelPosition: 'insideTopRight', color: 'red.6', strokeDasharray: '4 4', strokeWidth: 1 }]}
        valueFormatter={(v) => `${v}%`}
      />
    </Card>
  );
});
