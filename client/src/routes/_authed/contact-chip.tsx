import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { contactChipMonthQuery } from '@/features/minor/contact-chip/api';
import { ContactChipPage } from '@/features/minor/contact-chip/ContactChipPage';
import { regionsQuery } from '@/features/ref/api';
import { currentMonth } from '@/lib/time';

const searchSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional().catch(undefined),
  regionId: z.coerce.number().int().positive().optional().catch(undefined),
});

export const Route = createFileRoute('/_authed/contact-chip')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ month: search.month, regionId: search.regionId }),
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(regionsQuery);
    return context.queryClient.ensureQueryData(contactChipMonthQuery(deps.month ?? currentMonth(), deps.regionId));
  },
  component: ContactChipRoute,
});

function ContactChipRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const month = search.month ?? currentMonth();
  return (
    <ContactChipPage
      month={month}
      regionId={search.regionId}
      onMonthChange={(m) => void navigate({ search: (prev) => ({ ...prev, month: m }), replace: true })}
      onRegionChange={(id) => void navigate({ search: (prev) => ({ ...prev, regionId: id }), replace: true })}
    />
  );
}
