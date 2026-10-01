import type { Fixture, HeadType, McAxis, McCheck, McGroup, McVerdict, Shift } from '../domain.js';

export interface ModelSpec {
  code: string;
  pitchTarget: number;
  rollTarget: number;
  tolerance: number;
  deltaSatLimit: number;
  deltaTargetLimit: number;
  sigmaLimit: number;
  cpkMin: number;
}

export interface McDsMeta {
  programId: string;
  product: string;
  upDown: string;
  asmLine: string;
  asmCell: string;
  asmDate: string;
  asmShift: string;
  asmTeam: string;
  lotName: string;
  penNo: string;
  testerId: string;
  operatorId: string;
  productName: string;
}

export interface McDsHead {
  position: number;
  fixture: Fixture;
  psaBefore: number;
  rsaBefore: number;
  psaAfter: number;
  rsaAfter: number;
  resultState: string;
}

export interface RemeasureHead {
  position: number;
  fixture: Fixture | null;
  psa: number;
  rsa: number;
}

export interface RemeasureFile {
  tester: string;
  date: string;
  heads: Map<number, RemeasureHead>;
  tray: string | null;
}

export interface SatFile {
  tester: string;
  date: string;
  time: string;
  heads: Map<number, { position: number; psa: number; rsa: number }>;
}

export interface McDsFile {
  meta: McDsMeta;
  heads: Map<number, McDsHead>;
}

/** One tray position with every reading the three files provide. */
export interface Reading {
  position: number;
  fixture: Fixture;
  psaBefore: number | null;
  rsaBefore: number | null;
  psaAfter: number | null;
  rsaAfter: number | null;
  psaRemeasure: number;
  rsaRemeasure: number;
  psaSat: number;
  rsaSat: number;
  resultState: string | null;
}

export interface CheckResult {
  group: McGroup;
  axis: McAxis;
  check: McCheck;
  value: number;
  limit: number;
  passed: boolean;
}

export interface AxisStats {
  mean: number;
  sigma: number;
}

export interface GroupStats {
  pitch: { before: AxisStats; after: AxisStats; remeasure: AxisStats; sat: AxisStats };
  roll: { before: AxisStats; after: AxisStats; remeasure: AxisStats; sat: AxisStats };
}

export interface HeadDeltaEntry {
  min: number;
  max: number;
  passed: boolean;
}

export type HeadDelta = Record<McGroup, Record<McAxis, HeadDeltaEntry>>;

export interface LotResult {
  verdict: McVerdict;
  failCount: number;
  checks: CheckResult[];
  headDelta: HeadDelta;
  stats: Record<McGroup, GroupStats> & {
    leftVsRight: { pitch: { mean: number; sigma: number }; roll: { mean: number; sigma: number } };
  };
  perHeadDelta: { position: number; fixture: Fixture; pitch: number; roll: number }[];
}

export interface LotIdentity {
  lotNo: string;
  programLotName: string;
  toolCode: string;
  satTester: string | null;
  modelCode: string;
  headType: HeadType | null;
  suspension: string | null;
  mcDate: string;
  shift: Shift | null;
  asmLine: string | null;
  asmCell: string | null;
  operatorId: string | null;
}

export interface MeancheckRun {
  identity: LotIdentity;
  spec: ModelSpec;
  readings: Reading[];
  result: LotResult;
  warnings: string[];
  engineVersion: string;
}
