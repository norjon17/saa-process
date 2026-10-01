import type { Shift } from './domain.js';

export const PLANT_TZ = 'Asia/Manila';

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: PLANT_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export interface PlantClock {
  date: string; // YYYY-MM-DD in Asia/Manila
  hour: number;
  minute: number;
  second: number;
}

export function plantClock(at: Date = new Date()): PlantClock {
  const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]));
  return {
    date: `${parts['year']}-${parts['month']}-${parts['day']}`,
    hour: Number(parts['hour']),
    minute: Number(parts['minute']),
    second: Number(parts['second']),
  };
}

/** DS = 06:00–17:59, NS = 18:00–05:59 (Asia/Manila). */
export function currentShift(at: Date = new Date()): Shift {
  const { hour } = plantClock(at);
  return hour >= 6 && hour < 18 ? 'DS' : 'NS';
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const t = Date.UTC(y, m - 1, d + days);
  return new Date(t).toISOString().slice(0, 10);
}

/** The business date of the shift running at `at`: NS hours 00:00–05:59 belong to the previous calendar day. */
export function shiftDate(at: Date = new Date()): string {
  const { date, hour } = plantClock(at);
  return hour < 6 ? addDays(date, -1) : date;
}

export function currentShiftInfo(at: Date = new Date()): { date: string; shift: Shift } {
  return { date: shiftDate(at), shift: currentShift(at) };
}

export const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function monthRange(yyyymm: string): { from: string; to: string } {
  const [y, m] = yyyymm.split('-').map(Number) as [number, number];
  const from = `${yyyymm}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from, to: `${yyyymm}-${String(lastDay).padStart(2, '0')}` };
}
