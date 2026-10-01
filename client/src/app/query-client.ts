import { MutationCache, QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/client';
import { notify } from '@/lib/notify';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 1,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: 0 },
  },
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.options.meta?.['silent']) return;
      notify.error(error);
    },
  }),
});
