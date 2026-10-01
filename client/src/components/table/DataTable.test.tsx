import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTable } from './DataTable';
import type { AppColumn } from './types';

interface Row {
  id: number;
  name: string;
}
const columns: AppColumn<Row>[] = [
  { id: 'id', header: 'ID', accessor: (r) => r.id },
  { id: 'name', header: 'Name', accessor: (r) => r.name },
];
const data: Row[] = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `row-${i + 1}` }));

const renderTable = (props: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) =>
  render(
    <MantineProvider>
      <DataTable<Row> columns={columns} data={data} getRowId={(r) => String(r.id)} {...props} />
    </MantineProvider>,
  );

describe('DataTable pagination & loading', () => {
  it('paginates client-side by default (20 per page)', () => {
    renderTable();
    expect(screen.getByText('row-20')).toBeInTheDocument();
    expect(screen.queryByText('row-21')).not.toBeInTheDocument();
    expect(screen.getByText('1–20 of 25 rows')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByText('row-25')).toBeInTheDocument();
    expect(screen.queryByText('row-1')).not.toBeInTheDocument();
  });

  it('can be unpaginated for fixed report blocks', () => {
    renderTable({ paginate: false });
    expect(screen.getByText('row-25')).toBeInTheDocument();
    expect(screen.queryByText(/of 25 rows/)).not.toBeInTheDocument();
  });

  it('shows skeleton rows on first load instead of the empty message', () => {
    renderTable({ data: [], loading: true, emptyMessage: 'Nothing here' });
    expect(screen.queryByText('Nothing here')).not.toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('uses server paging when total is given', () => {
    renderTable({ data: data.slice(0, 10), total: 95, page: 3, pageSize: 10 });
    expect(screen.getByText('21–30 of 95 rows')).toBeInTheDocument();
    expect(screen.getByText('row-10')).toBeInTheDocument();
  });
});

describe('DataTable phone card layout', () => {
  const setPhone = (phone: boolean) => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ ...original(query), matches: phone && query.includes('max-width: 47.99em') })) as typeof window.matchMedia;
    return () => {
      window.matchMedia = original;
    };
  };

  it('renders cards (no <table>) below 768px, with column labels and paging', () => {
    const restore = setPhone(true);
    try {
      const { container } = renderTable({ columns: [columns[0]!, { ...columns[1]!, mobileLabel: 'Full name' }] });
      expect(container.querySelector('table')).toBeNull();
      expect(screen.getByText('row-20')).toBeInTheDocument();
      expect(screen.queryByText('row-21')).not.toBeInTheDocument();
      expect(screen.getAllByText('Full name')).toHaveLength(20);
      expect(screen.getByText('1–20 of 25 rows')).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it('keeps the scrolling table with mobileLayout="scroll" and hides mobile:hidden columns in cards', () => {
    const restore = setPhone(true);
    try {
      const scroll = renderTable({ mobileLayout: 'scroll' });
      expect(scroll.container.querySelector('table')).not.toBeNull();
      scroll.unmount();
      renderTable({ columns: [columns[0]!, { ...columns[1]!, mobile: 'hidden' }] });
      expect(screen.queryByText('row-1')).not.toBeInTheDocument();
    } finally {
      restore();
    }
  });
});
