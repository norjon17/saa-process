import { describe, expect, it } from 'vitest';

import { normalizeProgress, normalizeSatCode, normalizeShift, normalizeToolCode, splitPeople } from '../src/shared/normalize.js';

describe('normalizeToolCode', () => {
  it.each([
    ['SAA54H', 'SAA54H'],
    ['saa54h', 'SAA54H'],
    ['SAA 54H', 'SAA54H'],
    ['SAA05H ', 'SAA05H'],
    ['SAA05', 'SAA05H'],
    ['SAA5H', 'SAA05H'],
    ['SAA4H', 'SAA04H'],
    ['SAA73', 'SAA73H'],
    ['SAA76 ', 'SAA76H'],
    ['SA53H', 'SAA53H'],
    ['SA72H ', 'SAA72H'],
    ['SASA33', 'SAA33H'],
    ['SAA677H', 'SAA77H'],
    ['68h', null],
    ['', null],
    [null, null],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeToolCode(raw)).toBe(expected);
  });
});

describe('normalizeSatCode', () => {
  it('pads and upper-cases', () => {
    expect(normalizeSatCode('SAT04H')).toBe('SAT04H');
    expect(normalizeSatCode('sat4h')).toBe('SAT04H');
    expect(normalizeSatCode('68h')).toBeNull();
  });
});

describe('splitPeople', () => {
  it('splits on separators and cleans tokens', () => {
    expect(splitPeople('Coleen/Sam ')).toEqual(['coleen', 'sam']);
    expect(splitPeople('Kc / Eva')).toEqual(['kc', 'eva']);
    expect(splitPeople('Dea & Glenn')).toEqual(['dea', 'glenn']);
    expect(splitPeople('Sam\\Fil')).toEqual(['sam', 'fil']);
    expect(splitPeople('Glenn Rubis Jr.')).toEqual(['glenn rubis jr']);
    expect(splitPeople(null)).toEqual([]);
  });
});

describe('shift / progress', () => {
  it('normalises', () => {
    expect(normalizeShift(' ds')).toBe('DS');
    expect(normalizeShift('Night')).toBeNull();
    expect(normalizeProgress('DONE')).toBe('done');
    expect(normalizeProgress('Done')).toBe('done');
    expect(normalizeProgress('ongoing')).toBe('ongoing');
    expect(normalizeProgress('')).toBe('open');
  });
});
