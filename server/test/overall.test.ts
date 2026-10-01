import { describe, expect, it } from 'vitest';

import { computeOverall, emptyCells } from '../src/modules/meancheck-daily/overall.js';
import type { McCellStatus } from '../src/shared/domain.js';

const all = (v: McCellStatus | null) => Object.fromEntries(Object.keys(emptyCells()).map((k) => [k, v]));

describe('computeOverall (daily grid)', () => {
  it('blank row is pending, not failed (fixes the Excel bug)', () => {
    expect(computeOverall(emptyCells())).toBe('pending');
  });
  it('all P → passed; any F → failed', () => {
    expect(computeOverall(all('P_AUTO'))).toBe('passed');
    expect(computeOverall({ ...all('P_MAN'), vsTgtRsaR: 'F_MAN' })).toBe('failed');
    expect(computeOverall({ ...all(null), vsSatPsaL: 'F_AUTO' })).toBe('failed');
  });
  it('partial P without F is pending', () => {
    expect(computeOverall({ ...all(null), vsSatPsaL: 'P_AUTO', vsSatPsaR: 'P_AUTO' })).toBe('pending');
  });
  it('IDLE / MB pass through', () => {
    expect(computeOverall(all('IDLE'))).toBe('idle');
    expect(computeOverall(all('MB'))).toBe('mb');
    expect(computeOverall({ ...all(null), vsSatPsaL: 'IDLE' })).toBe('idle');
    expect(computeOverall({ ...all('IDLE'), vsSatPsaL: 'MB' })).toBe('mb');
  });
});
