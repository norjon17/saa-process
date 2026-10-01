export const fmtNum = (v: number | null | undefined, digits = 3): string => (v === null || v === undefined || Number.isNaN(v) ? '—' : v.toFixed(digits));

export const fmtPct = (v: number | null | undefined, digits = 0): string => (v === null || v === undefined || Number.isNaN(v) ? '—' : `${(v * 100).toFixed(digits)}%`);

export const fmtSigned = (v: number | null | undefined, digits = 3): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}`;
};

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

export const peopleLabel = (people: { name: string }[]): string => people.map((p) => p.name).join(' / ');
