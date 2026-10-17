import type { PmItem } from './api';

/**
 * PM state of one tool for one month (the planned PM is the month itself):
 * done = a PM done date (`actualDate`) is set; pending = row exists, current/future month, no date yet;
 * missed = row exists, the month is over and no date was entered; none = the tool has no PM row for the month.
 */
export type PmState = 'done' | 'pending' | 'missed' | 'none';

export const PM_STATES: readonly PmState[] = ['done', 'pending', 'missed', 'none'];

export const PM_STATE_META: Record<PmState, { label: string; short: string; color: string; swatch: string }> = {
  done: { label: 'PM done', short: 'Done', color: 'green', swatch: '#00c000' },
  pending: { label: 'Pending this month', short: 'Pending', color: 'yellow', swatch: '#ffff00' },
  missed: { label: 'Missed (month over, no date)', short: 'Missed', color: 'red', swatch: '#e53935' },
  none: { label: 'No PM row', short: 'No PM row', color: 'gray', swatch: '#cfd8dc' },
};

/** `month` and `currentMonth` are `YYYY-MM`; string comparison orders them correctly. */
export function pmState(item: PmItem, month: string, currentMonth: string): PmState {
  if (item.row?.actualDate) return 'done';
  if (!item.row) return 'none';
  return month < currentMonth ? 'missed' : 'pending';
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Oct 3" from `2026-10-03`; the year is added when it differs from `refYear` ("Jan 4, 2027"). No timezone shifting. */
export function shortDate(iso: string, refYear?: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  const base = `${SHORT_MONTHS[Number(m) - 1] ?? m} ${Number(d)}`;
  return refYear && y !== refYear ? `${base}, ${y}` : base;
}

/** Tool code search: case- and space-insensitive ("saa 05" matches SAA05H). */
export const normalizeQuery = (q: string) => q.toUpperCase().replace(/\s+/g, '');
