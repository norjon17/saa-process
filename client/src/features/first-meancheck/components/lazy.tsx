import { lazy } from 'react';

import { lazyChart } from '@/components/charts/lazyChart';

/** Pass-rate bar chart: recharts is fetched only when the chart renders (skeleton meanwhile). */
export const DailyPassChartLazy = lazyChart(() => import('./DailyPassChart').then((m) => m.DailyPassChart), 246);

/** Notes modal: rarely opened, so it's its own chunk. Mount it on first open inside a `Suspense`. */
export const NotesModalLazy = lazy(() => import('./NotesModal').then((m) => ({ default: m.NotesModal })));
