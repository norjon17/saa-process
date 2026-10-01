import { Badge, Loader, Text } from '@mantine/core';
import { Link } from '@tanstack/react-router';

import type { EndorsementSummary } from '@/lib/api/types';
import { fmtPct } from '@/lib/format';

import classes from '../endorsement.module.css';

export function SummaryStrip({ summary, loading }: { summary: EndorsementSummary | undefined; loading?: boolean }) {
  const done = summary?.byProgress.find((p) => p.progress === 'done')?.n ?? 0;
  const ongoing = summary?.byProgress.find((p) => p.progress === 'ongoing')?.n ?? 0;
  const ds = summary?.byShift.find((s) => s.shift === 'DS')?.n ?? 0;
  const ns = summary?.byShift.find((s) => s.shift === 'NS')?.n ?? 0;
  const total = summary?.total ?? 0;
  const topTools = summary?.byTool.slice(0, 5) ?? [];

  return (
    <div className={classes.summaryStrip}>
      <div className={classes.summaryStats}>
        <Stat label="Endorsements" value={summary ? total : '—'} />
        <Stat label="Done" value={summary ? fmtPct(total ? done / total : null) : '—'} sub={summary ? `${done} of ${total}` : undefined} />
        <Stat label="Ongoing" value={summary ? ongoing : '—'} />
        <Stat label="DS / NS" value={summary ? `${ds} / ${ns}` : '—'} />
      </div>
      <div className={classes.summaryTools}>
        <span className={classes.summaryLabel}>Top tools</span>
        {topTools.length === 0 && summary && (
          <Text size="xs" c="dimmed">
            none
          </Text>
        )}
        {topTools.map((t) => (
          <Link key={t.id} to="/endorsement/tools/$toolId" params={{ toolId: String(t.id) }} style={{ textDecoration: 'none' }}>
            <Badge variant="light" color="brand" size="sm" style={{ cursor: 'pointer' }}>
              {t.code} · {t.n}
            </Badge>
          </Link>
        ))}
      </div>
      {loading && <Loader size={14} className={classes.summaryLoader} />}
      <Text size="xs" c="dimmed" className={classes.summaryNote}>
        Date range and shift only — NONE rows excluded
      </Text>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className={classes.summaryStat}>
      <span className={classes.summaryLabel}>{label}</span>
      <span className={classes.summaryValue}>{value}</span>
      {sub && (
        <Text size="xs" c="dimmed" style={{ fontSize: '0.58rem' }}>
          {sub}
        </Text>
      )}
    </div>
  );
}
