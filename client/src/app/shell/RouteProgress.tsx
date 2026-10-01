import { NavigationProgress, nprogress } from '@mantine/nprogress';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';

/**
 * Thin top progress bar: runs while a route chunk / loader is pending or any query or mutation is in
 * flight. A short delay avoids flashing for instant cache hits.
 */
export function RouteProgress() {
  const routing = useRouterState({ select: (s) => s.status === 'pending' || s.isLoading });
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const busy = routing || fetching > 0 || mutating > 0;

  useEffect(() => {
    if (!busy) {
      nprogress.complete();
      return;
    }
    const t = setTimeout(() => nprogress.start(), 120);
    return () => clearTimeout(t);
  }, [busy]);

  return <NavigationProgress color="aqua" size={3} zIndex={1000} />;
}
