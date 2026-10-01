import type { HeadType, Shift } from '../domain.js';
import { LEFT_POSITIONS, RIGHT_POSITIONS } from '../domain.js';
import { normalizeSatCode, normalizeToolCode } from '../normalize.js';
import { ENGINE_VERSION, evaluateLot } from './engine.js';
import { detectKind, ParseError, parseMcDs, parseRemeasure, parseSat, type FileKind } from './parsers.js';
import type { LotIdentity, McDsFile, MeancheckRun, ModelSpec, Reading, RemeasureFile, SatFile } from './types.js';

export * from './engine.js';
export * from './parsers.js';
export * from './types.js';

export interface InputFile {
  filename: string;
  text: string;
}

export class MeancheckInputError extends Error {
  override readonly name = 'MeancheckInputError';
  readonly problems: string[];
  constructor(problems: string[]) {
    super(problems.join('; '));
    this.problems = problems;
  }
}

const baseName = (f: string) => f.replace(/\\/g, '/').split('/').pop()!.replace(/\.csv$/i, '');

/** Sort the uploaded files into their roles by content, then parse them. */
export function classifyFiles(files: InputFile[]): { mcds: McDsFile; remeasure: RemeasureFile; sat: SatFile; names: Record<FileKind, string> } {
  const problems: string[] = [];
  const found: Partial<Record<FileKind, InputFile>> = {};
  for (const f of files) {
    const kind = detectKind(f.text);
    if (!kind) {
      problems.push(`${f.filename}: not recognised as MC-DS, Re-Measure or SAT file`);
      continue;
    }
    if (found[kind]) problems.push(`${f.filename}: duplicate ${kind} file (already have ${found[kind]!.filename})`);
    found[kind] = f;
  }
  for (const k of ['mcds', 'remeasure', 'sat'] as const) if (!found[k]) problems.push(`missing ${k} file`);
  if (problems.length) throw new MeancheckInputError(problems);

  try {
    return {
      mcds: parseMcDs(found.mcds!.text, found.mcds!.filename),
      remeasure: parseRemeasure(found.remeasure!.text, found.remeasure!.filename),
      sat: parseSat(found.sat!.text, found.sat!.filename),
      names: { mcds: found.mcds!.filename, remeasure: found.remeasure!.filename, sat: found.sat!.filename },
    };
  } catch (e) {
    if (e instanceof ParseError) throw new MeancheckInputError([`${e.file ?? 'file'}: ${e.message}`]);
    throw e;
  }
}

const asmDateToIso = (yymmdd: string): string | null => {
  const m = /^(\d{2})(\d{2})(\d{2})$/.exec(yymmdd.trim());
  return m ? `20${m[1]}-${m[2]}-${m[3]}` : null;
};

const slashDateToIso = (d: string): string | null => {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})/.exec(d.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

/** Build the identity, cross-check the three files, merge readings and run the engine. */
export function runMeancheck(files: InputFile[], getSpec: (modelCode: string) => ModelSpec | undefined): MeancheckRun {
  const { mcds, remeasure, sat, names } = classifyFiles(files);
  const problems: string[] = [];
  const warnings: string[] = [];

  const lotNo = mcds.meta.penNo.trim();
  if (!lotNo) problems.push('MC-DS file has no PenNo (lot number)');
  const remeasureBase = baseName(names.remeasure);
  if (lotNo && remeasureBase.toUpperCase() !== lotNo.toUpperCase()) {
    warnings.push(`Re-Measure filename "${remeasureBase}" does not match lot ${lotNo}`);
  }
  const satBase = baseName(names.sat);
  if (lotNo && !satBase.toUpperCase().startsWith(lotNo.toUpperCase() + '_')) {
    warnings.push(`SAT filename "${satBase}" does not start with lot ${lotNo}`);
  }

  const toolCode = normalizeToolCode(mcds.meta.testerId) ?? normalizeToolCode(remeasure.tester);
  if (!toolCode) problems.push(`cannot determine SAA tool from TesterId "${mcds.meta.testerId}" / TESTER "${remeasure.tester}"`);
  const rmTool = normalizeToolCode(remeasure.tester);
  if (toolCode && rmTool && rmTool !== toolCode) problems.push(`MC-DS tool ${toolCode} differs from Re-Measure tool ${rmTool}`);

  const modelCode = (mcds.meta.product || lotNo.slice(0, 3)).toUpperCase();
  const spec = getSpec(modelCode);
  if (!spec) problems.push(`unknown model "${modelCode}" — add it under Admin › Model specs`);

  const positions = [...LEFT_POSITIONS, ...RIGHT_POSITIONS];
  const missing = positions.filter((p) => !mcds.heads.has(p) || !remeasure.heads.has(p) || !sat.heads.has(p));
  if (missing.length) problems.push(`missing tray positions: ${missing.join(', ')}`);

  if (problems.length) throw new MeancheckInputError(problems);

  const readings: Reading[] = positions.map((p) => {
    const a = mcds.heads.get(p)!;
    const r = remeasure.heads.get(p)!;
    const s = sat.heads.get(p)!;
    return {
      position: p,
      fixture: a.fixture,
      psaBefore: a.psaBefore,
      rsaBefore: a.rsaBefore,
      psaAfter: a.psaAfter,
      rsaAfter: a.rsaAfter,
      psaRemeasure: r.psa,
      rsaRemeasure: r.rsa,
      psaSat: s.psa,
      rsaSat: s.rsa,
      resultState: a.resultState || null,
    };
  });

  const upDown = mcds.meta.upDown.toUpperCase();
  const headType: HeadType | null = upDown === 'U' ? 'UP' : upDown === 'D' ? 'DN' : null;
  const team = mcds.meta.asmTeam.toUpperCase();
  const shift: Shift | null = team === 'DS' || team === 'NS' ? team : null;
  const suspension = mcds.meta.productName.split(/[_ ]/).pop() ?? null;

  const identity: LotIdentity = {
    lotNo,
    programLotName: mcds.meta.lotName,
    toolCode: toolCode!,
    satTester: normalizeSatCode(sat.tester) ?? sat.tester ?? null,
    modelCode,
    headType,
    suspension: suspension && /^[A-Z]{3}$/.test(suspension) ? suspension : null,
    mcDate: asmDateToIso(mcds.meta.asmDate) ?? slashDateToIso(remeasure.date) ?? new Date().toISOString().slice(0, 10),
    shift,
    asmLine: mcds.meta.asmLine || null,
    asmCell: mcds.meta.asmCell || null,
    operatorId: mcds.meta.operatorId || null,
  };

  return { identity, spec: spec!, readings, result: evaluateLot(spec!, readings), warnings, engineVersion: ENGINE_VERSION };
}
