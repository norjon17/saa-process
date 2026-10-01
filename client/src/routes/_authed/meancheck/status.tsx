import { Button, Group, Text } from '@mantine/core';
import { IconList, IconUpload } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';

import { PageHeader } from '@/components/ui/PageHeader';
import { toolStatusQuery } from '@/features/meancheck/api';
import { ToolStatusBoard, ToolStatusLegend } from '@/features/meancheck/components/ToolStatusBoard';
import { formatLongDate, plantClock } from '@/lib/time';

export const Route = createFileRoute('/_authed/meancheck/status')({
  loader: ({ context }) => {
    // Warm the cache but render the skeleton board instead of blocking navigation.
    void context.queryClient.prefetchQuery(toolStatusQuery);
  },
  component: ToolStatusPage,
});

const EMPTY: never[] = [];

/** Mean Check Dashboard: every active tool coloured by its latest lot verdict, grouped by region. */
function ToolStatusPage() {
  const status = useQuery(toolStatusQuery);
  const today = plantClock().date;
  return (
    <div>
      <PageHeader
        title="Tool status"
        subtitle={`Latest meancheck verdict per tool · today ${formatLongDate(today)} · refreshes every minute`}
        actions={
          <>
            <Button component={Link} to="/meancheck" variant="default" size="xs" leftSection={<IconList size={14} />}>
              All lots
            </Button>
            <Button component={Link} to="/meancheck/new" size="xs" leftSection={<IconUpload size={14} />}>
              New Verdict
            </Button>
          </>
        }
      />
      <Group justify="space-between" gap="xs" mb="sm" wrap="wrap">
        <ToolStatusLegend />
        {status.isError && (
          <Text size="xs" c="red" fw={700}>
            Could not load the tool status.
          </Text>
        )}
      </Group>
      <ToolStatusBoard items={status.data ?? EMPTY} loading={status.isPending} />
    </div>
  );
}
