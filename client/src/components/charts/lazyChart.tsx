import { lazy, Suspense, type ComponentType } from 'react';

import { ChartSkeleton } from '@/components/ui/Skeletons';

/**
 * Wrap a chart component so recharts (via `@mantine/charts`, ~380 KB) is only downloaded when the
 * chart actually renders. The returned component suspends behind a `ChartSkeleton` of `height`.
 *
 * Usage: `export const MyChart = lazyChart(() => import('./MyChart').then((m) => m.MyChart), 220);`
 */
export function lazyChart<P extends object>(load: () => Promise<ComponentType<P>>, height = 260): ComponentType<P> {
  const Lazy = lazy(async () => ({ default: await load() }));
  function LazyChart(props: P) {
    return (
      <Suspense fallback={<ChartSkeleton h={height} />}>
        <Lazy {...props} />
      </Suspense>
    );
  }
  return LazyChart;
}

/** Lazy variants of the shared chart wrappers (title row + chart height). */
export const LimitLineChartLazy = lazyChart(() => import('./LimitLineChart').then((m) => m.LimitLineChart), 246);
export const BeforeAfterScatterLazy = lazyChart(() => import('./BeforeAfterScatter').then((m) => m.BeforeAfterScatter), 266);
