import { Badge, Card, Group, Text } from '@mantine/core';
import { Link } from '@tanstack/react-router';

import { VerdictPill } from '@/components/ui/StatusPill';
import type { Endorsement, Tool, ToolStatusItem } from '@/lib/api/types';

import classes from '../endorsement.module.css';

export interface ToolHeaderProps {
  tool: Tool | undefined;
  toolId: number;
  status: ToolStatusItem | undefined;
  rows: Endorsement[] | undefined;
  total: number | undefined;
}

export function ToolHeader({ tool, toolId, status, rows, total }: ToolHeaderProps) {
  const live = rows?.filter((r) => !r.isNone) ?? [];
  const count = (p: Endorsement['progress']) => live.filter((r) => r.progress === p).length;
  const latest = status?.latest ?? null;

  return (
    <Card mb="md">
      <div className={classes.toolHead}>
        <Group gap="md" align="center">
          <div>
            <div className={classes.toolCode}>{tool?.code ?? `Tool #${toolId}`}</div>
            <Group gap={6} mt={6}>
              {tool?.region && (
                <Badge variant="light" color="brand" size="sm">
                  {tool.region.name}
                </Badge>
              )}
              {tool?.toolType && (
                <Badge variant="outline" color="gray" size="sm">
                  {tool.toolType}
                </Badge>
              )}
              {tool && !tool.isActive && (
                <Badge color="gray" size="sm">
                  Inactive
                </Badge>
              )}
            </Group>
          </div>
        </Group>
        <div className={classes.toolFacts}>
          <Fact label="EE" value={tool?.ee?.name ?? '—'} />
          <div className={classes.fact}>
            <span className={classes.factLabel}>Latest meancheck</span>
            <Group gap={6} align="center">
              <VerdictPill verdict={latest?.verdict ?? null} />
              {latest && (
                <Text size="xs" c="dimmed">
                  <Link to="/meancheck/$lotId" params={{ lotId: String(latest.lotId) }} className={classes.codeLink}>
                    {latest.lotNo}
                  </Link>{' '}
                  · {latest.mcDate} · {latest.model}
                  {latest.headType ? ` ${latest.headType}` : ''}
                </Text>
              )}
            </Group>
          </div>
          <Fact label="Endorsements" value={total ?? '—'} />
          <Fact label="Done" value={rows ? count('done') : '—'} />
          <Fact label="Ongoing" value={rows ? count('ongoing') : '—'} />
          <Fact label="Open" value={rows ? count('open') : '—'} />
        </div>
      </div>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={classes.fact}>
      <span className={classes.factLabel}>{label}</span>
      <span className={classes.factValue}>{value}</span>
    </div>
  );
}
