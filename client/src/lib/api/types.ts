import type {
  ContactChipValue,
  EndorsementProgress,
  HeadType,
  McCellStatus,
  McDailyOverall,
  McVerdict,
  SectionKey,
  Shift,
  ToolType,
  UserRole,
} from '@shared/domain';
import type { CheckResult, HeadDelta, LotResult, ModelSpec, Reading } from '@shared/meancheck/types';

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SessionUser {
  id: number;
  idNo: string;
  name: string;
  role: UserRole;
}

export interface MeResponse {
  user: SessionUser | null;
  shift: { date: string; shift: Shift };
}

export interface User {
  id: number;
  idNo: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Region {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Tool {
  id: number;
  code: string;
  regionId: number | null;
  toolType: ToolType | null;
  eeUserId: number | null;
  isActive: boolean;
  sortOrder: number;
  notes: string | null;
  region?: Region | null;
  ee?: { id: number; idNo: string; name: string } | null;
}

export interface Category {
  id: number;
  name: string;
  sectionKey: SectionKey;
  sortOrder: number;
  isActive: boolean;
}

export type Model = ModelSpec & { isActive: boolean };

export interface Person {
  id: number;
  idNo: string;
  name: string;
}

export interface Endorsement {
  id: number;
  seqNo: number | null;
  date: string;
  shift: Shift;
  category: { id: number; name: string; sectionKey: string } | null;
  sectionKey: SectionKey | string;
  tool: { id: number; code: string } | null;
  issue: string;
  actionStatus: string;
  progress: EndorsementProgress;
  isNone: boolean;
  endorseBy: Person[];
  endorseTo: Person[];
  endorseByRaw: string | null;
  endorseToRaw: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EndorsementInput {
  date: string;
  shift: Shift;
  categoryId?: number | null;
  sectionKey?: SectionKey;
  toolId?: number | null;
  issue?: string;
  actionStatus?: string;
  progress?: EndorsementProgress;
  isNone?: boolean;
  endorseBy?: number[];
  endorseTo?: number[];
}

export interface BoardKpi {
  total: number;
  done: number;
  ongoing: number;
  open: number;
}

export interface BoardResponse {
  date: string;
  shift: Shift;
  items: Endorsement[];
  kpi: Record<SectionKey, BoardKpi>;
}

export interface EndorsementSummary {
  total: number;
  byCategory: { id: number | null; name: string | null; sectionKey: string | null; n: number }[];
  byProgress: { progress: EndorsementProgress; n: number }[];
  byShift: { shift: Shift; n: number }[];
  byTool: { id: number; code: string; n: number }[];
  byMonth: { month: string; n: number }[];
  byPerson: { id: number; idNo: string; name: string; kind: 'by' | 'to'; n: number }[];
}

export interface Attachment {
  id: number;
  date: string;
  shift: Shift;
  sectionKey: SectionKey;
  fileName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: number | null;
  createdAt: string;
  url: string;
}

export interface LotSummary {
  id: number;
  lotNo: string;
  programLotName: string | null;
  toolId: number;
  modelCode: string;
  headType: HeadType | null;
  suspension: string | null;
  satTester: string | null;
  mcDate: string;
  shift: Shift | null;
  operatorId: string | null;
  verdict: McVerdict;
  failCount: number;
  engineVersion: string;
  createdAt: string;
  uploadedBy: number | null;
  tool: { id: number; code: string; regionId: number | null; region: Region | null };
}

export interface LotDetail extends LotSummary {
  specSnapshot: ModelSpec;
  headDelta: HeadDelta;
  stats: LotResult['stats'];
  files: { stored: Record<string, string>; warnings: string[] };
  readings: (Reading & { lotId: number })[];
  checks: (CheckResult & { lotId: number })[];
}

export interface EvaluateResponse {
  identity: {
    lotNo: string;
    programLotName: string;
    toolCode: string;
    satTester: string | null;
    modelCode: string;
    headType: HeadType | null;
    suspension: string | null;
    mcDate: string;
    shift: Shift | null;
    operatorId: string | null;
  };
  spec: ModelSpec;
  readings: Reading[];
  result: LotResult;
  warnings: string[];
  engineVersion: string;
  files: string[];
}

export interface ToolStatusItem {
  tool: { id: number; code: string; region: string | null; toolType: ToolType | null };
  latest: { lotId: number; lotNo: string; verdict: McVerdict; mcDate: string; createdAt: string; model: string; headType: string | null } | null;
}

export interface DailyRow {
  id: number;
  toolId: number;
  date: string;
  vsSatPsaL: McCellStatus | null;
  vsSatPsaR: McCellStatus | null;
  vsSatRsaL: McCellStatus | null;
  vsSatRsaR: McCellStatus | null;
  vsTgtPsaL: McCellStatus | null;
  vsTgtPsaR: McCellStatus | null;
  vsTgtRsaL: McCellStatus | null;
  vsTgtRsaR: McCellStatus | null;
  overall: McDailyOverall;
  lotId: number | null;
  note: string | null;
  updatedBy: number | null;
  updatedAt: string;
}

export interface GridTool {
  id: number;
  code: string;
  region: string | null;
  toolType: ToolType | null;
}

export interface DailyMonthResponse {
  month: string;
  from: string;
  to: string;
  tools: GridTool[];
  rows: DailyRow[];
}

export interface DailySummary {
  items: { date: string; passed: number; failed: number; idle: number; mb: number; pending: number; passRate: number | null }[];
  monthly: { month: string; overall: McDailyOverall; n: number }[];
}

export interface PmRow {
  id: number;
  toolId: number;
  period: string;
  area: string | null;
  toolType: ToolType | null;
  eeUserId: number | null;
  eeRaw: string | null;
  actualDate: string | null;
  fixVacLWith: number | null;
  fixVacLWithout: number | null;
  fixVacRWith: number | null;
  fixVacRWithout: number | null;
  pickVacLWith: number | null;
  pickVacLWithout: number | null;
  pickVacRWith: number | null;
  pickVacRWithout: number | null;
  clampLClamp: number | null;
  clampLUnclamp: number | null;
  clampRClamp: number | null;
  clampRUnclamp: number | null;
  fixtureSpring: number | null;
  speedMotor: number | null;
  zOffLPickup: number | null;
  zOffLRelease: number | null;
  zOffRPickup: number | null;
  zOffRRelease: number | null;
  optGrr: boolean | null;
  optCorrelation: boolean | null;
  optLaserRecipe: boolean | null;
  optAdditionalArea: boolean | null;
  optScanPatternDir: boolean | null;
  fixtureLeft: string | null;
  fixtureRight: string | null;
  scanPattern: string | null;
  remarks: string | null;
  extra: Record<string, unknown> | null;
  updatedAt: string;
  ee?: Person | null;
  derived: Record<string, number | null>;
}

export interface PmMonthResponse {
  month: string;
  items: { tool: GridTool & { ee: { id: number; name: string } | null }; row: PmRow | null }[];
}

export interface ContactChipRow {
  id: number;
  toolId: number;
  date: string;
  value: ContactChipValue;
  note: string | null;
}

export interface ContactChipMonthResponse {
  month: string;
  from: string;
  to: string;
  tools: GridTool[];
  rows: ContactChipRow[];
}

/* ---- Admin change logs (GET /api/audit-logs) ---- */
export type AuditEntity = 'user' | 'user_alias' | 'tool' | 'region' | 'model' | 'category';
export type AuditAction = 'create' | 'update' | 'activate' | 'deactivate' | 'delete';

export interface AuditLog {
  id: number;
  entity: AuditEntity;
  entityId: string;
  entityLabel: string | null;
  action: AuditAction;
  /** `{ field: { from, to } }`; for `create` every field with `from: null`. */
  changes: Record<string, { from: unknown; to: unknown }>;
  actorId: number | null;
  actorName: string | null;
  createdAt: string;
}

export interface AuditLogPage {
  items: AuditLog[];
  nextCursor: string | null;
}
