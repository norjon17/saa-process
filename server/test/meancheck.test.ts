import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { detectKind, MeancheckInputError, parseMcDs, parseRemeasure, runMeancheck, type InputFile } from '../src/shared/meancheck/index.js';
import { specByCode } from '../src/shared/meancheck/specs.js';

const samples = fileURLToPath(new URL('../../database/samples/meancheck', import.meta.url));

function loadLot(dir: 'passed' | 'failed'): InputFile[] {
  const folder = join(samples, dir);
  return readdirSync(folder)
    .filter((f) => f.toLowerCase().endsWith('.csv'))
    .map((f) => ({ filename: f, text: readFileSync(join(folder, f), 'latin1') }));
}

const key = (c: { group: string; axis: string; check: string }) => `${c.group}/${c.axis}/${c.check}`;

describe('meancheck engine against the Excel template', () => {
  it('passes lot SF4UP17A260924BB23 with all 24 checks', () => {
    const run = runMeancheck(loadLot('passed'), specByCode);
    expect(run.identity).toMatchObject({
      lotNo: 'SF4UP17A260924BB23',
      toolCode: 'SAA68H',
      satTester: 'SAT04H',
      modelCode: 'SF4',
      headType: 'UP',
      suspension: 'NHK',
      mcDate: '2026-09-25',
      shift: 'DS',
    });
    expect(run.result.verdict).toBe('passed');
    expect(run.result.failCount).toBe(0);
    expect(run.result.checks).toHaveLength(24);

    const v = Object.fromEntries(run.result.checks.map((c) => [key(c), c.value]));
    // Values from Summary!T13:X24 of SAA68H_SF4_UP_NHK_0925_p.xls
    expect(v['left/pitch/delta_sat']).toBeCloseTo(0.02355, 5);
    expect(v['left/roll/delta_sat']).toBeCloseTo(0.0491, 5);
    expect(v['right/pitch/delta_sat']).toBeCloseTo(0.0125, 5);
    expect(v['overall/pitch/delta_sat']).toBeCloseTo(0.018025, 5);
    expect(v['left/pitch/delta_target']).toBeCloseTo(0.04535, 5);
    expect(v['overall/roll/delta_target']).toBeCloseTo(-0.0001, 5);
    expect(v['left/pitch/sigma']).toBeCloseTo(0.031933, 5);
    expect(v['left/roll/sigma']).toBeCloseTo(0.074532, 5);
    expect(v['left/pitch/cpk']).toBeCloseTo(3.70203, 4);
    expect(v['left/roll/cpk']).toBeCloseTo(1.72879, 4);
    expect(v['right/pitch/cpk']).toBeCloseTo(2.54801, 4);
    expect(v['right/roll/cpk']).toBeCloseTo(2.30224, 4);
    expect(v['overall/pitch/cpk']).toBeCloseTo(2.82003, 4);
    expect(v['overall/roll/cpk']).toBeCloseTo(2.00578, 4);

    // Fixture delta table (Summary!R6:W8)
    expect(run.result.headDelta.left.pitch.min).toBeCloseTo(-0.04, 6);
    expect(run.result.headDelta.left.pitch.max).toBeCloseTo(0.069, 6);
    expect(run.result.headDelta.right.roll.min).toBeCloseTo(-0.093, 6);
    expect(run.result.headDelta.overall.roll.max).toBeCloseTo(0.128, 6);
    expect(run.result.headDelta.overall.pitch.passed).toBe(true);

    // Means table (Summary!N30:U32)
    expect(run.result.stats.left.pitch.before.mean).toBeCloseTo(2.20505, 5);
    expect(run.result.stats.right.pitch.after.mean).toBeCloseTo(1.93605, 5);
    expect(run.result.stats.overall.pitch.remeasure.mean).toBeCloseTo(1.950025, 5);
    expect(run.result.stats.overall.roll.sat.mean).toBeCloseTo(-0.0001, 5);
  });

  it('fails lot SEWDP54A260414BA04 on exactly the six checks the template flags', () => {
    const run = runMeancheck(loadLot('failed'), specByCode);
    expect(run.identity).toMatchObject({ lotNo: 'SEWDP54A260414BA04', toolCode: 'SAA73H', modelCode: 'SEW', headType: 'DN', mcDate: '2026-04-15' });
    expect(run.result.verdict).toBe('failed');
    const failing = run.result.checks.filter((c) => !c.passed).map(key).sort();
    expect(failing).toEqual(
      ['left/roll/sigma', 'overall/pitch/sigma', 'right/pitch/cpk', 'right/pitch/delta_sat', 'right/pitch/delta_target', 'right/pitch/sigma'].sort(),
    );
    const v = Object.fromEntries(run.result.checks.map((c) => [key(c), c.value]));
    expect(v['left/roll/sigma']).toBeCloseTo(0.0839, 4);
    expect(v['overall/pitch/sigma']).toBeCloseTo(0.0806, 4);
    expect(v['right/pitch/delta_sat']).toBeCloseTo(-0.0551, 4);
    expect(v['right/pitch/cpk']).toBeCloseTo(1.2224, 4);
    expect(run.result.headDelta.right.roll.min).toBeCloseTo(-0.48, 6);
    expect(run.result.headDelta.overall.pitch.passed).toBe(false);
  });

  it('classifies files by content even when they are renamed', () => {
    const files = loadLot('passed').map((f, i) => ({ ...f, filename: `renamed-${i}.csv` }));
    const run = runMeancheck(files, specByCode);
    expect(run.result.verdict).toBe('passed');
    expect(run.warnings.length).toBeGreaterThan(0); // filename mismatch is only a warning
  });

  it('rejects an incomplete or duplicated set of files', () => {
    const files = loadLot('passed');
    expect(() => runMeancheck(files.slice(0, 2), specByCode)).toThrow(MeancheckInputError);
    expect(() => runMeancheck([...files, files[0]!], specByCode)).toThrow(/duplicate/);
    expect(() => runMeancheck(files, () => undefined)).toThrow(/unknown model/);
  });

  it('parses both MC-DS layouts (April vs September) by header name', () => {
    const passed = loadLot('passed').find((f) => f.filename.includes('MC-DS'))!;
    const failed = loadLot('failed').find((f) => f.filename.includes('MC-DS'))!;
    const a = parseMcDs(passed.text);
    const b = parseMcDs(failed.text);
    expect(a.meta.testerId).toBe('SAA68H');
    expect(a.heads.get(1)?.resultState).toBe('SKIP');
    expect(a.heads.get(11)?.resultState).toBe('PASS');
    expect(b.meta.testerId).toBe('SAA73H');
    expect(b.meta.operatorId).toBe('1000277739');
    expect(b.heads.get(11)?.resultState).toBe('SKIP');
    expect(b.heads.size).toBe(40);
  });

  it('parses Re-Measure files with and without TRAY_BARCODE', () => {
    const withBarcode = loadLot('passed').find((f) => /^SF4UP17A260924BB23\.csv$/i.test(f.filename))!;
    const without = loadLot('failed').find((f) => /^SEWDP54A260414BA04\.csv$/i.test(f.filename))!;
    expect(detectKind(withBarcode.text)).toBe('remeasure');
    expect(parseRemeasure(withBarcode.text).heads.get(1)).toMatchObject({ psa: 2.042, rsa: -0.119, fixture: 'L' });
    expect(parseRemeasure(without.text).heads.get(17)).toMatchObject({ psa: 1.922, rsa: -0.404, fixture: 'R' });
  });
});
