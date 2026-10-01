import type { Fixture } from '../domain.js';
import type { McDsFile, McDsHead, McDsMeta, RemeasureFile, RemeasureHead, SatFile } from './types.js';

export class ParseError extends Error {
  override readonly name = 'ParseError';
  readonly file: string | undefined;
  constructor(message: string, file?: string) {
    super(message);
    this.file = file;
  }
}

const splitLines = (text: string): string[] =>
  text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

/** The SAA tool writes "value,<TAB>value" — split on commas then trim every cell. */
const splitCells = (line: string): string[] => line.split(',').map((c) => c.trim());

const num = (s: string | undefined, what: string, file?: string): number => {
  const v = Number(s);
  if (s === undefined || s === '' || Number.isNaN(v)) throw new ParseError(`invalid number for ${what}: "${s ?? ''}"`, file);
  return v;
};

const pos = (s: string | undefined, file?: string): number => {
  const v = Number.parseInt(s ?? '', 10);
  if (!Number.isInteger(v) || v < 1 || v > 40) throw new ParseError(`invalid tray position "${s ?? ''}"`, file);
  return v;
};

function indexOf(header: string[], names: string[], file: string): number {
  for (const n of names) {
    const i = header.indexOf(n);
    if (i >= 0) return i;
  }
  throw new ParseError(`missing column ${names[0]}`, file);
}

/** AfterAdjust file `<LotName>-MC-DS.csv`: two header blocks, then one row per tray position. */
export function parseMcDs(text: string, file = 'MC-DS'): McDsFile {
  const lines = splitLines(text);
  if (lines.length < 4) throw new ParseError('file too short', file);
  const metaHeader = splitCells(lines[0]!);
  const metaValues = splitCells(lines[1]!);
  const metaMap = new Map(metaHeader.map((h, i) => [h, metaValues[i] ?? '']));
  if (!metaMap.has('ProgramId') || !metaMap.has('PenNo')) throw new ParseError('not an MC-DS file (no ProgramId/PenNo)', file);

  const header = splitCells(lines[2]!);
  const col = {
    tester: indexOf(header, ['TesterId'], file),
    operator: indexOf(header, ['OperatorId'], file),
    position: indexOf(header, ['TrayPosition'], file),
    fixture: indexOf(header, ['FixtureNo'], file),
    psaB: indexOf(header, ['PSA_Before'], file),
    rsaB: indexOf(header, ['RSA_Before'], file),
    psaA: indexOf(header, ['PSA_After'], file),
    rsaA: indexOf(header, ['RSA_After'], file),
    state: header.indexOf('ResultState'),
    productName: header.indexOf('ProductName'),
  };

  const heads = new Map<number, McDsHead>();
  let testerId = '';
  let operatorId = '';
  let productName = '';
  for (const line of lines.slice(3)) {
    const c = splitCells(line);
    if (c.length < header.length - 2) continue;
    const position = pos(c[col.position], file);
    const fixture: Fixture = c[col.fixture] === '2' || c[col.fixture]?.toUpperCase() === 'R' ? 'R' : 'L';
    heads.set(position, {
      position,
      fixture,
      psaBefore: num(c[col.psaB], 'PSA_Before', file),
      rsaBefore: num(c[col.rsaB], 'RSA_Before', file),
      psaAfter: num(c[col.psaA], 'PSA_After', file),
      rsaAfter: num(c[col.rsaA], 'RSA_After', file),
      resultState: col.state >= 0 ? (c[col.state] ?? '') : '',
    });
    testerId ||= c[col.tester] ?? '';
    operatorId ||= c[col.operator] ?? '';
    if (col.productName >= 0) productName ||= c[col.productName] ?? '';
  }

  const g = (k: string) => metaMap.get(k) ?? '';
  const meta: McDsMeta = {
    programId: g('ProgramId'),
    product: g('Product'),
    upDown: g('UpDown'),
    asmLine: g('AsmLine'),
    asmCell: g('AsmCell'),
    asmDate: g('AsmDate'),
    asmShift: g('AsmShift'),
    asmTeam: g('AsmTeam'),
    lotName: g('LotName'),
    penNo: g('PenNo'),
    testerId,
    operatorId,
    productName,
  };
  return { meta, heads };
}

/** AfterManual (Re-Measure) file `<Lot>.csv`: DATE,TIME,SITE,TESTER,HGA,FIX,PSA,RSA,X,Y,TRAY[,TRAY_BARCODE]. */
export function parseRemeasure(text: string, file = 'remeasure'): RemeasureFile {
  const lines = splitLines(text);
  if (lines.length < 2) throw new ParseError('file too short', file);
  const header = splitCells(lines[0]!).map((h) => h.toUpperCase());
  const col = {
    date: indexOf(header, ['DATE'], file),
    tester: indexOf(header, ['TESTER'], file),
    hga: indexOf(header, ['HGA'], file),
    fix: header.indexOf('FIX'),
    psa: indexOf(header, ['PSA'], file),
    rsa: indexOf(header, ['RSA'], file),
    tray: header.indexOf('TRAY'),
  };
  const heads = new Map<number, RemeasureHead>();
  let tester = '';
  let date = '';
  let tray: string | null = null;
  for (const line of lines.slice(1)) {
    const c = splitCells(line);
    if (c.length < 8) continue;
    const position = pos(c[col.hga], file);
    const fix = c[col.fix]?.toUpperCase();
    heads.set(position, {
      position,
      fixture: fix === 'L' || fix === 'R' ? fix : null,
      psa: num(c[col.psa], 'PSA', file),
      rsa: num(c[col.rsa], 'RSA', file),
    });
    tester ||= c[col.tester] ?? '';
    date ||= c[col.date] ?? '';
    if (col.tray >= 0) tray ??= c[col.tray] ?? null;
  }
  return { tester, date, heads, tray };
}

/** SAT reference file `<Lot>_<tool>_<seq>_<timestamp>.csv`: headerless, "SPR Ver202,<pos>,,,<psa>,<rsa>,...,<tester>,<date>,<time>,...". */
export function parseSat(text: string, file = 'sat'): SatFile {
  const lines = splitLines(text);
  if (lines.length < 1) throw new ParseError('file too short', file);
  const heads = new Map<number, { position: number; psa: number; rsa: number }>();
  let tester = '';
  let date = '';
  let time = '';
  for (const line of lines) {
    const c = splitCells(line);
    if (!c[0]?.toUpperCase().startsWith('SPR')) throw new ParseError('not a SAT file (rows must start with "SPR")', file);
    if (c.length < 16) throw new ParseError('SAT row has too few columns', file);
    const position = pos(c[1], file);
    heads.set(position, { position, psa: num(c[4], 'PSA', file), rsa: num(c[5], 'RSA', file) });
    tester ||= c[13] ?? '';
    date ||= c[14] ?? '';
    time ||= c[15] ?? '';
  }
  return { tester, date, time, heads };
}

export type FileKind = 'mcds' | 'remeasure' | 'sat';

/** Detect which of the three lot files a text is, by content only (filenames are unreliable). */
export function detectKind(text: string): FileKind | null {
  const first = text.replace(/^﻿/, '').split(/\r?\n/, 1)[0]?.trim() ?? '';
  if (/^ProgramId\s*,/i.test(first)) return 'mcds';
  if (/^DATE\s*,\s*TIME\s*,/i.test(first)) return 'remeasure';
  if (/^SPR\b/i.test(first)) return 'sat';
  return null;
}
