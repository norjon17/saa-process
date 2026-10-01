import { Button, Card, SimpleGrid, Tabs } from '@mantine/core';
import { IconChartBar, IconClipboardList, IconFlask, IconHistory } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { lazyChart } from '@/components/charts/lazyChart';
import { DataTable } from '@/components/table/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ChartSkeleton } from '@/components/ui/Skeletons';
import { listQuery, toolStatusQuery } from '@/features/endorsement/api';
import { buildEndorsementColumns, TABLE_MIN_WIDTH, type ColumnRefs } from '@/features/endorsement/columns';
import { ToolHeader } from '@/features/endorsement/components/ToolHeader';
import { ToolLots } from '@/features/endorsement/components/ToolLots';
import { useCategories, useTools, useUsers } from '@/features/ref/api';
import classes from '@/features/endorsement/endorsement.module.css';
import type { Endorsement } from '@/lib/api/types';
import { useIsMobile } from '@/lib/useIsMobile';

// recharts only downloads when the Charts tab is opened.
const ToolCharts = lazyChart(() => import('@/features/endorsement/components/ToolCharts').then((m) => m.ToolCharts), 300);

export const Route = createFileRoute('/_authed/endorsement/tools/$toolId')({
  component: ToolPage,
});

const PAGE_SIZE = 100;
const noneRowProps = (r: Endorsement) => (r.isNone ? { 'data-none-row': '' } : undefined);
/** Phone cards: NONE rows show only their black "NONE" heading. */
const isNoneRow = (r: Endorsement) => r.isNone;
const rowId = (r: Endorsement) => String(r.id);

function ToolPage() {
  const { toolId } = Route.useParams();
  const navigate = useNavigate();
  const id = Number(toolId);
  const valid = Number.isInteger(id) && id > 0;

  const tools = useTools(true);
  const users = useUsers();
  const categories = useCategories();
  const status = useQuery(toolStatusQuery);
  const [page, setPage] = useState(1);
  const paged = useQuery({ ...listQuery({ toolId: id, page, pageSize: PAGE_SIZE, sort: 'date:desc' }), enabled: valid });
  const all = useQuery({ ...listQuery({ toolId: id, page: 1, pageSize: 500, sort: 'date:desc', includeNone: false }), enabled: valid });

  const tool = tools.data?.find((t) => t.id === id);
  const refs = useMemo<ColumnRefs>(() => ({ users: users.data ?? [], tools: tools.data ?? [], categories: categories.data ?? [] }), [users.data, tools.data, categories.data]);
  const isMobile = useIsMobile();
  const columns = useMemo(() => buildEndorsementColumns({ mode: 'tool', refs, mobile: isMobile }), [refs, isMobile]);

  if (!valid) return <EmptyState message="Invalid tool id." />;

  return (
    <>
      <PageHeader
        title={tool ? `Tool ${tool.code}` : 'Tool'}
        subtitle="Endorsement and meancheck history for one SAA tool"
        actions={
          <>
            <Button component={Link} to="/endorsement" size="compact-sm" variant="default" leftSection={<IconClipboardList size={13} />}>
              Shift board
            </Button>
            <Button size="compact-sm" variant="default" leftSection={<IconHistory size={13} />} onClick={() => void navigate({ to: '/endorsement/history', search: { toolId: id } })}>
              History for this tool
            </Button>
          </>
        }
      />
      <ToolHeader tool={tool} toolId={id} status={status.data?.find((s) => s.tool.id === id)} rows={all.data?.items} total={all.data?.total} />
      <Tabs defaultValue="endorsements" keepMounted={false}>
        <Tabs.List mb="sm" grow={isMobile}>
          <Tabs.Tab value="endorsements" leftSection={<IconClipboardList size={14} />}>
            Endorsements
          </Tabs.Tab>
          <Tabs.Tab value="charts" leftSection={<IconChartBar size={14} />}>
            Charts
          </Tabs.Tab>
          <Tabs.Tab value="lots" leftSection={<IconFlask size={14} />}>
            {isMobile ? 'Lots' : 'Meancheck lots'}
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="endorsements">
          <Card padding="xs" className={classes.tableCard}>
            <DataTable<Endorsement>
              columns={columns}
              data={paged.data?.items ?? []}
              getRowId={rowId}
              page={page}
              pageSize={PAGE_SIZE}
              total={paged.data?.total ?? 0}
              onPageChange={setPage}
              loading={paged.isFetching}
              rowProps={noneRowProps}
          mobileCollapsed={isNoneRow}
              minWidth={TABLE_MIN_WIDTH - 70}
              stickyHeader
              emptyMessage="No endorsements for this tool."
            />
          </Card>
        </Tabs.Panel>
        <Tabs.Panel value="charts">
          {all.isPending ? (
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
              <ChartSkeleton h={300} />
              <ChartSkeleton h={300} />
            </SimpleGrid>
          ) : (
            <ToolCharts rows={all.data?.items ?? []} />
          )}
        </Tabs.Panel>
        <Tabs.Panel value="lots">
          <Card padding="xs" className={classes.tableCard}>
            <ToolLots toolId={id} />
          </Card>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
