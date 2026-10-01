import { Button, Card } from '@mantine/core';
import { IconUpload } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import { z } from 'zod';

import { MC_VERDICTS } from '@shared/domain';

import { PageHeader } from '@/components/ui/PageHeader';
import { LOT_PAGE_SIZE, lotsQuery, type LotListParams, type LotListPatch } from '@/features/meancheck/api';
import { countLotFilters, LotFilters } from '@/features/meancheck/components/LotFilters';
import { LotTable } from '@/features/meancheck/components/LotTable';
import { MeancheckHero } from '@/features/meancheck/components/MeancheckHero';
import { modelsQuery, regionsQuery, toolsQuery } from '@/features/ref/api';

const searchSchema = z.object({
  regionId: z.number().int().positive().optional(),
  verdict: z.enum(MC_VERDICTS).optional(),
  toolId: z.number().int().positive().optional(),
  model: z.string().max(3).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().min(1).max(200).optional().catch(undefined),
});

type LotSearch = z.infer<typeof searchSchema>;

/** Search params → list params; shared by the loader and the component so both hit the same cache entry. */
const toParams = (search: LotSearch): LotListParams => ({ ...search, page: search.page ?? 1, pageSize: search.pageSize ?? LOT_PAGE_SIZE });

export const Route = createFileRoute('/_authed/meancheck/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    // Filter selects: warm but don't block.
    void context.queryClient.prefetchQuery(regionsQuery);
    void context.queryClient.prefetchQuery(toolsQuery());
    void context.queryClient.prefetchQuery(modelsQuery);
    return context.queryClient.ensureQueryData(lotsQuery(toParams(deps)));
  },
  component: LotListPage,
});

/** Drop undefined keys so the URL stays clean. */
const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

function LotListPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const params = useMemo(() => toParams(search), [search]);
  const lots = useQuery(lotsQuery(params));

  const patch = useCallback((p: LotListPatch) => void navigate({ search: (prev) => clean({ ...prev, ...p, page: undefined }) }), [navigate]);
  const setPage = useCallback((next: number) => void navigate({ search: (prev) => clean({ ...prev, page: next === 1 ? undefined : next }) }), [navigate]);
  const setPageSize = useCallback(
    (size: number) => void navigate({ search: (prev) => clean({ ...prev, page: undefined, pageSize: size === LOT_PAGE_SIZE ? undefined : size }) }),
    [navigate],
  );

  return (
    <div>
      <MeancheckHero
        right={
          <Button component={Link} to="/meancheck/new" leftSection={<IconUpload size={14} />} variant="white" color="navy.8" size="xs">
            New Verdict
          </Button>
        }
      />
      <PageHeader
        title="Meancheck lots"
        subtitle={lots.data ? `${lots.data.total} verdict${lots.data.total === 1 ? '' : 's'}` : 'Loading…'}
        actions={
          <Button component={Link} to="/meancheck/new" leftSection={<IconUpload size={14} />} size="xs">
            New Verdict
          </Button>
        }
        filters={<LotFilters value={params} onChange={patch} />}
        collapsibleFilters
        activeFilterCount={countLotFilters(params)}
      />
      <Card padding="xs">
        <LotTable
          items={lots.data?.items ?? EMPTY}
          total={lots.data?.total ?? 0}
          page={params.page ?? 1}
          pageSize={params.pageSize ?? LOT_PAGE_SIZE}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          loading={lots.isFetching}
        />
      </Card>
    </div>
  );
}

const EMPTY: never[] = [];
