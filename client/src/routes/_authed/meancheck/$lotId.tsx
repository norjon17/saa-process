import { Button, Card, Group, Menu, Text } from '@mantine/core';
import { IconArrowLeft, IconDownload, IconFileTypeCsv, IconPrinter, IconTrash } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';

import { useBreadcrumb } from '@/app/shell/Breadcrumbs';
import { EmptyState } from '@/components/ui/EmptyState';
import { lotQuery, useDeleteLot } from '@/features/meancheck/api';
import { confirmDeleteLot } from '@/features/meancheck/components/LotTable';
import { LotResultCard } from '@/features/meancheck/components/LotResultCard';
import { LotResultSkeleton } from '@/features/meancheck/components/LotResultSkeleton';
import { HEAD_CSV_HEADERS, headCsvRows, headRows, lotFileUrl, toLotView } from '@/features/meancheck/model';
import { downloadText, downloadUrl, toCsv } from '@/lib/export/csv';
import { notify } from '@/lib/notify';
import { useCan } from '@/stores/session.store';

export const Route = createFileRoute('/_authed/meancheck/$lotId')({
  loader: ({ context, params }) => {
    const id = Number(params.lotId);
    return Number.isInteger(id) && id > 0 ? context.queryClient.ensureQueryData(lotQuery(id)).catch(() => null) : null;
  },
  component: LotPage,
});

function LotPage() {
  const { lotId } = Route.useParams();
  const id = Number(lotId);
  const navigate = useNavigate();
  const canDelete = useCan('deleteLots');
  const del = useDeleteLot();
  const lot = useQuery({ ...lotQuery(id), enabled: Number.isInteger(id) && id > 0 });
  const view = useMemo(() => (lot.data ? toLotView(lot.data) : null), [lot.data]);
  useBreadcrumb(lot.data?.lotNo);

  const exportCsv = () => {
    if (!view) return;
    downloadText(`${view.lotNo}-heads.csv`, toCsv(HEAD_CSV_HEADERS, headCsvRows(headRows(view))));
  };

  if (lot.isPending) return <LotResultSkeleton />;
  if (lot.isError || !lot.data || !view) {
    return (
      <Card>
        <EmptyState message={`Lot #${lotId} was not found.`} action="Back to lots" onAction={() => void navigate({ to: '/meancheck' })} />
      </Card>
    );
  }

  const actions = (
    <Group gap={6} wrap="wrap" className="saa-no-print">
      <Button component={Link} to="/meancheck" size="compact-xs" variant="white" color="navy.8" leftSection={<IconArrowLeft size={12} />}>
        Lots
      </Button>
      <Button size="compact-xs" variant="white" color="navy.8" leftSection={<IconPrinter size={12} />} onClick={() => window.print()}>
        Print
      </Button>
      <Button size="compact-xs" variant="white" color="navy.8" leftSection={<IconFileTypeCsv size={12} />} onClick={exportCsv}>
        Export CSV
      </Button>
      {view.fileNames.length > 0 && (
        <Menu shadow="md" withinPortal position="bottom-end">
          <Menu.Target>
            <Button size="compact-xs" variant="white" color="navy.8" leftSection={<IconDownload size={12} />}>
              Files
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Original uploads</Menu.Label>
            {view.fileNames.map((name) => (
              <Menu.Item key={name} leftSection={<IconFileTypeCsv size={14} />} onClick={() => downloadUrl(lotFileUrl(lot.data.id, name))}>
                <Text size="xs">{name}</Text>
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      )}
      {canDelete && (
        <Button
          size="compact-xs"
          color="red"
          leftSection={<IconTrash size={12} />}
          loading={del.isPending}
          onClick={() =>
            confirmDeleteLot(lot.data, () =>
              del.mutate(lot.data.id, {
                onSuccess: () => {
                  notify.success(`Deleted ${lot.data.lotNo}`);
                  void navigate({ to: '/meancheck' });
                },
              }),
            )
          }
        >
          Delete
        </Button>
      )}
    </Group>
  );

  return <LotResultCard source={lot.data} actions={actions} />;
}
