import { Group, Pagination, Select, Text } from '@mantine/core';
import type { ReactNode } from 'react';

import { useIsMobile } from '@/lib/useIsMobile';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export interface TablePagerProps {
  /** 1-based current page. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: readonly number[];
  unit?: string;
  extra?: ReactNode;
}

/** Footer used by every paginated table/grid: "21–40 of 132 rows · [20 / page] · pager". */
export function TablePager({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions = PAGE_SIZE_OPTIONS, unit = 'rows', extra }: TablePagerProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const isMobile = useIsMobile();
  return (
    <Group justify="space-between" mt="xs" gap="xs" wrap="wrap" className="saa-no-print">
      <Group gap="xs" wrap="nowrap">
        <Text size="xs" c="dimmed">
          {from}–{to} of {total} {unit}
        </Text>
        {onPageSizeChange && (
          <Select
            size="xs"
            w={92}
            aria-label="Rows per page"
            allowDeselect={false}
            data={pageSizeOptions.map((n) => ({ value: String(n), label: `${n} / page` }))}
            value={String(pageSize)}
            onChange={(v) => v && onPageSizeChange(Number(v))}
            comboboxProps={{ withinPortal: true }}
          />
        )}
      </Group>
      {extra}
      {/* Phones: fewer page buttons so the pager fits one line at 360px. */}
      <Pagination
        size={isMobile ? 'xs' : 'sm'}
        siblings={isMobile ? 0 : 1}
        boundaries={1}
        value={Math.min(page, pages)}
        total={pages}
        onChange={onPageChange}
        withEdges={!isMobile && pages > 7}
      />
    </Group>
  );
}
