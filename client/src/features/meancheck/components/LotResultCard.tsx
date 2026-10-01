import { Accordion, Alert, Group, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { lazy, memo, Suspense, useMemo, type ReactNode } from 'react';

import { Hero } from '@/components/ui/SectionCard';
import { VerdictPill } from '@/components/ui/StatusPill';
import type { EvaluateResponse, LotDetail } from '@/lib/api/types';

import { headRows, toLotView, type LotView } from '../model';
import { CheckAuditList } from './CheckAuditList';
import { FixtureDeltaTable } from './FixtureDeltaTable';
import { LotInfoBlock } from './LotInfoBlock';
import { LotChartsSkeleton } from './LotResultSkeleton';
import { MeansSigmaTable } from './MeansSigmaTable';
import classes from './meancheck.module.css';
import { MonitoredItemsTable } from './MonitoredItemsTable';
import { PerHeadTable } from './PerHeadTable';

/** Charts pull in recharts (~380 KB) — load them only when a result card actually renders them. */
const LotCharts = lazy(() => import('./LotCharts').then((m) => ({ default: m.LotCharts })));

export interface LotResultCardProps {
  /** Either a persisted lot or a dry-run evaluation; both normalise to the same view. */
  source: LotDetail | EvaluateResponse;
  /** Buttons rendered in the hero's right slot (print, export, delete…). */
  actions?: ReactNode;
  /** Hide the charts (e.g. in the wizard review step to keep it quick). */
  withCharts?: boolean;
}

/** The Excel "Summary" sheet as a card: info + judgment, fixture delta, monitored items, means, charts, per-head, audit. */
export const LotResultCard = memo(function LotResultCard({ source, actions, withCharts = true }: LotResultCardProps) {
  const view: LotView = useMemo(() => toLotView(source), [source]);
  const rows = useMemo(() => headRows(view), [view]);
  return (
    <div className={classes.card}>
      <Hero
        title={
          <>
            Meancheck <span className="saa-gradient-text">Verdict</span>
          </>
        }
        sub={
          <>
            {view.lotNo} · {view.toolCode} · {view.modelCode}
            {view.headType ? ` ${view.headType}` : ''} · {view.mcDate}
            {view.shift ? ` ${view.shift}` : ''}
          </>
        }
        right={
          <Group gap="xs" wrap="wrap">
            <VerdictPill verdict={view.verdict} size="lg" />
            {actions}
          </Group>
        }
      />
      <div className={classes.body}>
        {view.warnings.length > 0 && (
          <Alert color="yellow" icon={<IconAlertTriangle size={16} />} title="Warnings" variant="light">
            {view.warnings.map((w) => (
              <Text key={w} size="xs">
                {w}
              </Text>
            ))}
          </Alert>
        )}
        <LotInfoBlock view={view} />
        <FixtureDeltaTable view={view} />
        <MonitoredItemsTable view={view} />
        <MeansSigmaTable view={view} />
        {withCharts && (
          <Suspense fallback={<LotChartsSkeleton />}>
            <LotCharts view={view} />
          </Suspense>
        )}
        <Accordion variant="separated" multiple radius="md">
          <Accordion.Item value="heads">
            <Accordion.Control>
              <Text size="sm" fw={800}>
                Per-head readings ({rows.length})
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <PerHeadTable view={view} rows={rows} />
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="audit">
            <Accordion.Control>
              <Text size="sm" fw={800}>
                Check audit ({view.checks.length})
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <CheckAuditList view={view} />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  );
});
