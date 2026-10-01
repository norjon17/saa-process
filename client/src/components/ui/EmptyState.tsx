import { Button, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

export function EmptyState({ message, action, onAction, icon }: { message: ReactNode; action?: string; onAction?: () => void; icon?: ReactNode }) {
  return (
    <Stack align="center" gap={6} py="lg">
      {icon}
      <Text size="sm" c="dimmed" ta="center">
        {message}
      </Text>
      {action && onAction && (
        <Button size="compact-sm" variant="light" onClick={onAction}>
          {action}
        </Button>
      )}
    </Stack>
  );
}
