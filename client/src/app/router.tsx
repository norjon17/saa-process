import { createRouter } from '@tanstack/react-router';

import { PageSkeleton } from '@/components/ui/Skeletons';
import { setUnauthorizedHandler } from '@/lib/api/client';
import { useSessionStore } from '@/stores/session.store';

import { queryClient } from './query-client';
import { RouteProgress } from './shell/RouteProgress';
import { routeTree } from '../routeTree.gen';

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  // Loading UI while a route's code chunk or loader is pending.
  defaultPendingComponent: PageSkeleton,
  defaultPendingMs: 150,
  defaultPendingMinMs: 250,
  InnerWrap: ({ children }) => (
    <>
      <RouteProgress />
      {children}
    </>
  ),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

setUnauthorizedHandler(() => {
  useSessionStore.getState().clear();
  queryClient.removeQueries({ queryKey: ['auth'] });
  const here = window.location.pathname + window.location.search;
  if (!here.startsWith('/login')) {
    void router.navigate({ to: '/login', search: { redirect: here } });
  }
});
