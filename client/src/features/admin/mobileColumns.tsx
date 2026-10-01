import { Switch } from '@mantine/core';

import type { AppColumn } from '@/components/table/types';
import mc from '@/components/ui/mobileCards.module.css';

/**
 * Phone-card helpers for the admin tables. On phones the admin pages swap their column list:
 * a read-only heading (identity fields are edited on desktop / in a drawer), a touch-sized Active
 * switch instead of the 16px checkbox editor, and no timestamps.
 */

/** Read-only card heading: monospace code chip + optional name / muted suffix. */
export function CardTitle({ code, text, muted }: { code?: string; text?: string; muted?: string | null }) {
  return (
    <span className={mc.title}>
      {code && <span className={mc.titleCode}>{code}</span>}
      {text && <span className={mc.titleText}>{text}</span>}
      {muted && <span className={mc.titleMuted}>{muted}</span>}
    </span>
  );
}

/** Active flag as a switch (saves on toggle, like the desktop checkbox editor). */
export function activeSwitchColumn<T extends { isActive: boolean }>(name: (row: T) => string, onChange: (row: T, active: boolean) => void): AppColumn<T> {
  return {
    id: 'isActive',
    header: 'Active',
    accessor: (r) => r.isActive,
    sortable: false,
    render: (r) => <Switch size="md" checked={r.isActive} onChange={(e) => onChange(r, e.currentTarget.checked)} aria-label={`${name(r)} active`} />,
  };
}
