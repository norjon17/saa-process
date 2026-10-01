import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { DataTable } from '@/components/table/DataTable';
import type { AppColumn } from '@/components/table/types';
import { ShiftPill, VerdictPill } from '@/components/ui/StatusPill';
import type { LotSummary } from '@/lib/api/types';
import { formatDateTime } from '@/lib/time';

import { toolLotsQuery } from '../api';
import classes from '../endorsement.module.css';

const PAGE_SIZE = 50;
const rowId = (l: LotSummary) => String(l.id);

export function ToolLots({ toolId }: { toolId: number }) {
  const [page, setPage] = useState(1);
  const lots = useQuery(toolLotsQuery(toolId, page, PAGE_SIZE));

  const columns = useMemo<AppColumn<LotSummary>[]>(
    () => [
      {
        id: 'lotNo',
        header: 'Lot',
        accessor: (l) => l.lotNo,
        render: (l) => (
          <Link to="/meancheck/$lotId" params={{ lotId: String(l.id) }} className={classes.codeLink}>
            {l.lotNo}
          </Link>
        ),
        width: 170,
        align: 'left',
        mobile: 'title',
      },
      { id: 'mcDate', header: 'MC date', accessor: (l) => l.mcDate, width: 100 },
      { id: 'shift', header: 'Shift', accessor: (l) => l.shift, render: (l) => (l.shift ? <ShiftPill shift={l.shift} /> : '—'), width: 60 },
      { id: 'model', header: 'Model', accessor: (l) => l.modelCode, width: 70 },
      { id: 'headType', header: 'Head', accessor: (l) => l.headType, render: (l) => l.headType ?? '—', width: 60 },
      { id: 'suspension', header: 'Suspension', accessor: (l) => l.suspension, render: (l) => l.suspension ?? '—', width: 110 },
      { id: 'satTester', header: 'SAT', accessor: (l) => l.satTester, render: (l) => l.satTester ?? '—', width: 80 },
      { id: 'verdict', header: 'Verdict', accessor: (l) => l.verdict, render: (l) => <VerdictPill verdict={l.verdict} />, width: 90, mobile: 'title' },
      { id: 'failCount', header: 'Fails', accessor: (l) => l.failCount, width: 60 },
      { id: 'operatorId', header: 'Operator', accessor: (l) => l.operatorId, render: (l) => l.operatorId ?? '—', width: 90 },
      { id: 'createdAt', header: 'Uploaded', accessor: (l) => l.createdAt, render: (l) => formatDateTime(l.createdAt), width: 150, mobile: 'full' },
    ],
    [],
  );

  return (
    <DataTable<LotSummary>
      columns={columns}
      data={lots.data?.items ?? []}
      getRowId={rowId}
      page={page}
      pageSize={PAGE_SIZE}
      total={lots.data?.total ?? 0}
      onPageChange={setPage}
      minWidth={900}
      loading={lots.isFetching}
      emptyMessage="No meancheck lots recorded for this tool."
    />
  );
}
