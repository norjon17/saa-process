import { Card, Text, Title } from '@mantine/core';

export function PagePlaceholder({ title, note }: { title: string; note?: string }) {
  return (
    <Card>
      <Title order={3}>{title}</Title>
      <Text c="dimmed" size="sm">
        {note ?? 'This page is being built.'}
      </Text>
    </Card>
  );
}
