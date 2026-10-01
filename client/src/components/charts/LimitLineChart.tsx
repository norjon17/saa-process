import { LineChart, type LineChartSeries } from '@mantine/charts';
import { Text } from '@mantine/core';
import { memo } from 'react';

import { useIsMobile } from '@/lib/useIsMobile';

export interface LimitLine {
  y: number;
  label: string;
  /** Label used on phones (defaults to `label`, without the value). */
  shortLabel?: string;
  /** Mantine colour key, e.g. 'red.6'. Defaults to a recessive gray. */
  color?: string;
  dashed?: boolean;
}

export interface LimitLineChartProps {
  title?: string;
  data: Record<string, unknown>[];
  dataKey: string;
  series: LineChartSeries[];
  limits?: LimitLine[];
  h?: number;
  digits?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  /** Number of x ticks to keep readable on 40-point charts. */
  tickInterval?: number;
}

/**
 * Thin wrapper over `@mantine/charts` LineChart: a small titled line chart with horizontal
 * limit/reference lines (target, ±limits). One y-axis only; legend always on for ≥2 series.
 */
const NO_LIMITS: LimitLine[] = [];

export const LimitLineChart = memo(function LimitLineChart({ title, data, dataKey, series, limits = NO_LIMITS, h = 220, digits = 3, xAxisLabel, yAxisLabel, tickInterval = 3 }: LimitLineChartProps) {
  const fmt = (v: number) => v.toFixed(digits);
  // Phones: fewer x ticks, a narrower y axis and value-less limit labels so the labels do not pile up.
  const isMobile = useIsMobile();
  return (
    <div>
      {title && (
        <Text size="xs" fw={800} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }} mb={4}>
          {title}
        </Text>
      )}
      <LineChart
        h={h}
        data={data}
        dataKey={dataKey}
        series={series}
        curveType="linear"
        strokeWidth={2}
        withDots
        dotProps={{ r: 2.5, strokeWidth: 1 }}
        activeDotProps={{ r: 5 }}
        withLegend={series.length > 1}
        legendProps={{ verticalAlign: 'top', height: 26 }}
        gridAxis="xy"
        tickLine="none"
        valueFormatter={fmt}
        xAxisProps={{ interval: isMobile ? Math.max(tickInterval, 6) : tickInterval, fontSize: isMobile ? 9 : 10 }}
        yAxisProps={{ domain: ['auto', 'auto'], width: isMobile ? 40 : 48, fontSize: isMobile ? 9 : 10 }}
        referenceLines={limits.map((l) => ({
          y: l.y,
          label: isMobile ? (l.shortLabel ?? l.label) : `${l.label} ${fmt(l.y)}`,
          labelPosition: 'insideTopRight',
          color: l.color ?? 'gray.6',
          strokeDasharray: l.dashed === false ? undefined : '4 4',
          strokeWidth: 1,
        }))}
        {...(xAxisLabel ? { xAxisLabel } : {})}
        {...(yAxisLabel ? { yAxisLabel } : {})}
      />
    </div>
  );
});
