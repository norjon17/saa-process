import { describe, expect, it } from 'vitest';

import type { SectionKey } from '@shared/domain';
import { SECTION_KEYS } from '@shared/domain';

import type { BoardKpi, Endorsement } from '@/lib/api/types';

import { buildMailto, composeEmail, defaultSubject, invalidAddresses, parseAddresses } from './emailSummary';
import { pickSubsets } from './fonts';

const row = (id: number, over: Partial<Endorsement> = {}): Endorsement => ({
  id,
  seqNo: id,
  date: '2026-09-24',
  shift: 'DS',
  category: null,
  sectionKey: 's1',
  tool: { id: 1, code: 'SAA05H' },
  issue: `Issue number ${id} with a fairly long description of what happened on the tool during the shift`,
  actionStatus: 'Checked',
  progress: 'open',
  isNone: false,
  endorseBy: [],
  endorseTo: [],
  endorseByRaw: null,
  endorseToRaw: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});

const kpiOf = (items: Endorsement[]) =>
  Object.fromEntries(
    SECTION_KEYS.map((k) => {
      const rs = items.filter((r) => r.sectionKey === k);
      return [k, { total: rs.length, done: rs.filter((r) => r.progress === 'done').length, ongoing: rs.filter((r) => r.progress === 'ongoing').length, open: rs.filter((r) => r.progress === 'open').length }];
    }),
  ) as Record<SectionKey, BoardKpi>;

const base = { to: 'a@wdc.com, b@wdc.com', cc: '', subject: defaultSubject('2026-09-24', 'DS'), message: 'Hi', date: '2026-09-24', shift: 'DS' as const };

describe('composeEmail', () => {
  it('lists per-section counts and open/ongoing issues, ongoing first, skipping done and NONE rows', () => {
    const items = [row(1), row(2, { progress: 'ongoing', sectionKey: 's3', tool: { id: 2, code: 'SAA12H' } }), row(3, { progress: 'done' }), row(4, { isNone: true, sectionKey: 's6' })];
    const c = composeEmail({ ...base, items, kpi: kpiOf(items) });
    expect(c.summary).toContain('- PIS Parametric: 2 / 1 / 0');
    expect(c.summary).toContain('- Conversion: 1 / 0 / 1');
    const lines = c.summary.split('\n');
    const ongoing = lines.findIndex((l) => l.startsWith('- [Ongoing] SAA12H (Conversion)'));
    const open = lines.findIndex((l) => l.startsWith('- [Open] SAA05H (PIS Parametric)'));
    expect(ongoing).toBeGreaterThan(0);
    expect(open).toBeGreaterThan(ongoing);
    expect(c.totalIssues).toBe(2);
    expect(c.shownIssues).toBe(2);
    expect(c.body.startsWith('Hi\n\n')).toBe(true);
  });

  it('drops issues from the end so the mailto URL stays under the limit', () => {
    const items = Array.from({ length: 60 }, (_, i) => row(i + 1));
    const c = composeEmail({ ...base, items, kpi: kpiOf(items), link: 'http://localhost:5173/endorsement?date=2026-09-24&shift=DS' });
    expect(c.url.length).toBeLessThanOrEqual(1800);
    expect(c.overLimit).toBe(false);
    expect(c.shownIssues).toBeLessThan(60);
    expect(c.summary).toContain(`... and ${60 - c.shownIssues} more`);
    expect(c.summary).toContain('Board: http://localhost:5173/endorsement');
  });

  it('flags a message that is too long on its own', () => {
    const c = composeEmail({ ...base, message: 'x'.repeat(2000), items: [], kpi: kpiOf([]) });
    expect(c.overLimit).toBe(true);
  });
});

describe('buildMailto', () => {
  it('encodes subject/body with CRLF line breaks and keeps addresses readable', () => {
    const url = buildMailto('a@wdc.com; b@wdc.com', 'c@wdc.com', 'SAA — Sept 24 DS', 'line 1\nline 2 & more');
    expect(url).toBe('mailto:a@wdc.com,b@wdc.com?cc=c@wdc.com&subject=SAA%20%E2%80%94%20Sept%2024%20DS&body=line%201%0D%0Aline%202%20%26%20more');
  });
});

describe('addresses', () => {
  it('splits on commas and semicolons and reports invalid entries', () => {
    expect(parseAddresses(' a@x.com ,b@y.org; ')).toEqual(['a@x.com', 'b@y.org']);
    expect(invalidAddresses('a@x.com, nope, c@d')).toEqual(['nope', 'c@d']);
  });
});

describe('pickSubsets', () => {
  it('keeps only latin @font-face blocks of a Google Fonts css2 response', () => {
    const css = `/* cyrillic */\n@font-face {\n  font-family: 'Manrope';\n  src: url(https://f/cyr.woff2) format('woff2');\n}\n/* latin-ext */\n@font-face {\n  font-family: 'Manrope';\n  src: url(https://f/ext.woff2) format('woff2');\n}\n/* latin */\n@font-face {\n  font-family: 'Manrope';\n  src: url(https://f/lat.woff2) format('woff2');\n}`;
    const blocks = pickSubsets(css);
    expect(blocks).toHaveLength(2);
    expect(blocks.join('')).not.toContain('cyr.woff2');
    expect(blocks[1]).toContain('lat.woff2');
  });
});
