import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { pmMonthQuery } from '@/features/pm-status/api';
import { PmStatusPage } from '@/features/pm-status/PmStatusPage';
import { usersQuery } from '@/features/ref/api';
import { currentMonth } from '@/lib/time';

const searchSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional().catch(undefined),
});

export const Route = createFileRoute('/_authed/pm-status')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(usersQuery());
    return context.queryClient.ensureQueryData(pmMonthQuery(deps.month ?? currentMonth()));
  },
  component: PmStatusRoute,
});

function PmStatusRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const month = search.month ?? currentMonth();
  return <PmStatusPage month={month} onMonthChange={(m) => void navigate({ search: (prev) => ({ ...prev, month: m }), replace: true })} />;
}
