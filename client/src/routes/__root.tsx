import { Button, Center, Stack, Text, Title } from '@mantine/core';
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet, type ErrorComponentProps } from '@tanstack/react-router';

interface RouterContext {
  queryClient: QueryClient;
}

function NotFound() {
  return (
    <Center h="70vh">
      <Stack align="center" gap="xs">
        <Title order={2}>Page not found</Title>
        <Text c="dimmed">The page you are looking for does not exist.</Text>
        <Button component={Link} to="/endorsement" variant="light">
          Go to the shift board
        </Button>
      </Stack>
    </Center>
  );
}

function ErrorPage({ error }: ErrorComponentProps) {
  return (
    <Center h="70vh">
      <Stack align="center" gap="xs">
        <Title order={3}>Something went wrong</Title>
        <Text c="red" size="sm">
          {error instanceof Error ? error.message : String(error)}
        </Text>
        <Button onClick={() => window.location.reload()} variant="light">
          Reload
        </Button>
      </Stack>
    </Center>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
  notFoundComponent: NotFound,
  errorComponent: ErrorPage,
});
