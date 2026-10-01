import type { EndorsementProgress, Shift } from './domain.js';
import { TOOL_CODE_RE } from './domain.js';

/**
 * Normalise a free-text tool id to the canonical `SAAnnH` form.
 * Handles "SAA 54H", "SAA05", "SAA5H", "SA53H", "SASA33", "SAA677H". Returns null when unresolvable.
 */
export function normalizeToolCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).toUpperCase().replace(/\s+/g, '');
  if (TOOL_CODE_RE.test(s)) return s;
  let m = /^SAA(\d{1,2})H?$/.exec(s);
  if (m) return `SAA${m[1]!.padStart(2, '0')}H`;
  m = /^SA(\d{2})H$/.exec(s);
  if (m) return `SAA${m[1]}H`;
  m = /^SASA(\d{2})H?$/.exec(s);
  if (m) return `SAA${m[1]}H`;
  m = /^SAA(\d)\1?(\d{2})H$/.exec(s); // SAA677H → SAA77H (doubled digit typo)
  if (m) return `SAA${m[2]}H`;
  return null;
}

/** Normalise a SAT tester id ("SAT04H", "sat4h", "68h" → null). */
export function normalizeSatCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).toUpperCase().replace(/\s+/g, '');
  const m = /^SAT(\d{1,2})H?$/.exec(s);
  return m ? `SAT${m[1]!.padStart(2, '0')}H` : null;
}

/** Split "Coleen/Sam", "Kc / Eva", "Dea & Glenn" into cleaned, lower-cased tokens. */
export function splitPeople(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return String(raw)
    .split(/[/\\,&+]| and /i)
    .map((t) => t.trim().replace(/\.+$/, '').replace(/\s+/g, ' ').toLowerCase())
    .filter((t) => t.length > 0);
}

export function normalizeShift(raw: string | null | undefined): Shift | null {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase();
  return s === 'DS' || s === 'NS' ? s : null;
}

export function normalizeProgress(raw: string | null | undefined): EndorsementProgress {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (s === 'done') return 'done';
  if (s === 'ongoing') return 'ongoing';
  return 'open';
}
