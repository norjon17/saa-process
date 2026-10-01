import { ScatterChart, type ScatterChartSeries } from '@mantine/charts';
import { Text } from '@mantine/core';
import { memo } from 'react';

import { useIsMobile } from '@/lib/useIsMobile';

export interface BeforeAfterPoint {
  before: number;
  after: number;
  position: number;
}

export interface BeforeAfterScatterProps {
  title?: string;
  left: BeforeAfterPoint[];
  right: BeforeAfterPoint[];
  /** Horizontal target line (e.g. the model's pitch target). */
  target?: number;
  xLabel?: string;
  yLabel?: string;
  h?: number;
  digits?: number;
}

/**
 * Thin wrapper over `@mantine/charts` ScatterChart: Before (x) vs After (y) per head, one
 * series per fixture, with an optional target reference line. Colours are fixed per fixture
 * (Left = brand blue, Right = orange) so identity never depends on series order.
 */
export const BeforeAfterScatter = memo(function BeforeAfterScatter({ title, left, right, target, xLabel = 'Before adjust', yLabel = 'After adjust', h = 240, digits = 3 }: BeforeAfterScatterProps) {
  const fmt = (v: number) => v.toFixed(digits);
  const isMobile = useIsMobile();
  const data: ScatterChartSeries[] = [
    { name: 'Left fixture', color: 'brand.6', data: left.map((p) => ({ before: p.before, after: p.after, position: p.position })) },
    { name: 'Right fixture', color: 'orange.7', data: right.map((p) => ({ before: p.before, after: p.after, position: p.position })) },
  ];
  return (
    <div>
      {title && (
        <Text size="xs" fw={800} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }} mb={4}>
          {title}
        </Text>
      )}
      <ScatterChart
        h={h}
        data={data}
        dataKey={{ x: 'before', y: 'after' }}
        labels={{ x: xLabel, y: yLabel }}
        xAxisLabel={xLabel}
        yAxisLabel={yLabel}
        valueFormatter={{ x: fmt, y: fmt }}
        withLegend
        legendProps={{ verticalAlign: 'top', height: 26 }}
        gridAxis="xy"
        tickLine="none"
        xAxisProps={{ domain: ['auto', 'auto'], fontSize: isMobile ? 9 : 10 }}
        yAxisProps={{ domain: ['auto', 'auto'], width: isMobile ? 44 : 48, fontSize: isMobile ? 9 : 10 }}
        referenceLines={target === undefined ? [] : [{ y: target, label: `Target ${fmt(target)}`, labelPosition: 'insideTopRight', color: 'gray.6', strokeDasharray: '4 4', strokeWidth: 1 }]}
      />
    </div>
  );
});
