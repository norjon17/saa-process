/**
 * Domain constants shared by server and client. Pure TypeScript — no Node or DB imports.
 */
export const USER_ROLES = ['tech', 'ee', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SHIFTS = ['DS', 'NS'] as const;
export type Shift = (typeof SHIFTS)[number];

export const ENDORSEMENT_PROGRESS = ['open', 'ongoing', 'done'] as const;
export type EndorsementProgress = (typeof ENDORSEMENT_PROGRESS)[number];

export const PEOPLE_KINDS = ['by', 'to'] as const;
export type PeopleKind = (typeof PEOPLE_KINDS)[number];

export const TOOL_TYPES = ['SAAT05', 'SAAT07'] as const;
export type ToolType = (typeof TOOL_TYPES)[number];

export const HEAD_TYPES = ['UP', 'DN'] as const;
export type HeadType = (typeof HEAD_TYPES)[number];

export const FIXTURES = ['L', 'R'] as const;
export type Fixture = (typeof FIXTURES)[number];

export const MC_VERDICTS = ['passed', 'failed'] as const;
export type McVerdict = (typeof MC_VERDICTS)[number];

export const MC_GROUPS = ['left', 'right', 'overall'] as const;
export type McGroup = (typeof MC_GROUPS)[number];

export const MC_AXES = ['pitch', 'roll'] as const;
export type McAxis = (typeof MC_AXES)[number];

export const MC_CHECKS = ['delta_sat', 'delta_target', 'sigma', 'cpk'] as const;
export type McCheck = (typeof MC_CHECKS)[number];

export const MC_CELL_STATUSES = ['P_AUTO', 'F_AUTO', 'P_MAN', 'F_MAN', 'IDLE', 'MB'] as const;
export type McCellStatus = (typeof MC_CELL_STATUSES)[number];

export const MC_DAILY_OVERALLS = ['passed', 'failed', 'idle', 'mb', 'pending'] as const;
export type McDailyOverall = (typeof MC_DAILY_OVERALLS)[number];

export const MC_DAILY_CELLS = [
  'vsSatPsaL',
  'vsSatPsaR',
  'vsSatRsaL',
  'vsSatRsaR',
  'vsTgtPsaL',
  'vsTgtPsaR',
  'vsTgtRsaL',
  'vsTgtRsaR',
] as const;
export type McDailyCell = (typeof MC_DAILY_CELLS)[number];

export const CONTACT_CHIP_VALUES = ['L', 'R', 'LR', 'REPAIR', 'PM'] as const;
export type ContactChipValue = (typeof CONTACT_CHIP_VALUES)[number];

export const SECTION_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_META: Record<SectionKey, { name: string; meta: string }> = {
  s1: { name: 'PIS Parametric', meta: 'Parametric Inspection Station' },
  s2: { name: 'PIS Mechanical', meta: 'Mechanical Inspection Station' },
  s3: { name: 'Conversion', meta: 'Process Conversion Control' },
  s4: { name: 'Optimization', meta: 'Performance Optimization' },
  s5: { name: 'PM', meta: 'Preventive Maintenance' },
  s6: { name: 'Other Issues', meta: 'Miscellaneous Issue Tracking' },
};

export const TOOL_CODE_RE = /^SAA\d{2}H$/;
export const SAT_CODE_RE = /^SAT\d{2}H$/;
export const ID_NO_RE = /^\d{4}$/;

/** Meancheck fixture position groups (tray positions 1..40). */
export const LEFT_POSITIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] as const;
export const RIGHT_POSITIONS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40] as const;
export const HEAD_DELTA_LIMIT = 0.15;
