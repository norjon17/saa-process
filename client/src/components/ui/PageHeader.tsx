import { Badge, Button, Collapse, Group, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAdjustmentsHorizontal, IconChevronDown } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import { useIsMobile } from '@/lib/useIsMobile';

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  filters?: ReactNode;
  /** Phones: hide `filters` behind a "Filters" toggle (use for long filter forms, not for date/month navigation). */
  collapsibleFilters?: boolean;
  /** Number of non-default filters, shown as a badge on the phone "Filters" toggle. */
  activeFilterCount?: number;
}

export function PageHeader({ title, subtitle, actions, filters, collapsibleFilters = false, activeFilterCount = 0 }: PageHeaderProps) {
  const isMobile = useIsMobile();
  const [open, { toggle }] = useDisclosure(false);
  const collapse = collapsibleFilters && isMobile;

  const filterGroup = filters && (
    <Group gap="sm" wrap="wrap" className="saa-no-print">
      {filters}
    </Group>
  );

  return (
    <Stack gap="sm" mb="md">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
        <div style={{ minWidth: 0 }}>
          <Title order={2} fz={{ base: 22, sm: 28 }} style={{ letterSpacing: '-0.5px' }}>
            {title}
          </Title>
          {subtitle && (
            <Text size="sm" c="dimmed" fz={{ base: 'xs', sm: 'sm' }}>
              {subtitle}
            </Text>
          )}
        </div>
        {actions && (
          <Group gap="xs" wrap="wrap" className="saa-no-print">
            {actions}
          </Group>
        )}
      </Group>
      {filters && collapse && (
        <>
          <Button
            variant="default"
            size="xs"
            className="saa-no-print"
            leftSection={<IconAdjustmentsHorizontal size={14} />}
            rightSection={<IconChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }} />}
            onClick={toggle}
            aria-expanded={open}
            style={{ alignSelf: 'flex-start' }}
          >
            Filters
            {activeFilterCount > 0 && (
              <Badge size="xs" circle ml={6}>
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          <Collapse expanded={open}>{filterGroup}</Collapse>
        </>
      )}
      {filters && !collapse && filterGroup}
    </Stack>
  );
}
