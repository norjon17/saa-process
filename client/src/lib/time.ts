export { addDays, currentShift, currentShiftInfo, isIsoDate, monthRange, plantClock, shiftDate, PLANT_TZ } from '@shared/time';

import type { Shift } from '@shared/domain';
import { addDays } from '@shared/time';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** "September 25, 2026" from an ISO date (no timezone shifting). */
export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function weekdayOf(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]!;
}

export function monthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number) as [number, number];
  return `${MONTHS[m - 1]} ${y}`;
}

export function shiftMonth(yyyymm: string, delta: number): string {
  const [y, m] = yyyymm.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

export function currentMonth(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).formatToParts(now);
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  return `${y}-${m}`;
}

/** DS → NS on the same date; NS → DS on the next date. */
export function nextShift(date: string, shift: Shift): { date: string; shift: Shift } {
  return shift === 'DS' ? { date, shift: 'NS' } : { date: addDays(date, 1), shift: 'DS' };
}
export function prevShift(date: string, shift: Shift): { date: string; shift: Shift } {
  return shift === 'NS' ? { date, shift: 'DS' } : { date: addDays(date, -1), shift: 'NS' };
}

export function daysInMonth(yyyymm: string): string[] {
  const [y, m] = yyyymm.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: last }, (_, i) => `${yyyymm}-${pad2(i + 1)}`);
}

export function isWeekend(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 || wd === 6;
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

export function timeAgo(value: string | Date): string {
  const t = typeof value === 'string' ? new Date(value).getTime() : value.getTime();
  const diff = Math.max(0, Date.now() - t);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} d ago`;
}
