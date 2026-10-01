import { pgEnum } from 'drizzle-orm/pg-core';

import {
  CONTACT_CHIP_VALUES,
  ENDORSEMENT_PROGRESS,
  FIXTURES,
  HEAD_TYPES,
  MC_AXES,
  MC_CELL_STATUSES,
  MC_CHECKS,
  MC_DAILY_OVERALLS,
  MC_GROUPS,
  MC_VERDICTS,
  PEOPLE_KINDS,
  SHIFTS,
  TOOL_TYPES,
  USER_ROLES,
} from '../../shared/domain.js';

export const userRoleEnum = pgEnum('user_role', USER_ROLES);
export const shiftEnum = pgEnum('shift', SHIFTS);
export const endorsementProgressEnum = pgEnum('endorsement_progress', ENDORSEMENT_PROGRESS);
export const peopleKindEnum = pgEnum('people_kind', PEOPLE_KINDS);
export const toolTypeEnum = pgEnum('tool_type', TOOL_TYPES);
export const headTypeEnum = pgEnum('head_type', HEAD_TYPES);
export const fixtureEnum = pgEnum('fixture', FIXTURES);
export const mcVerdictEnum = pgEnum('mc_verdict', MC_VERDICTS);
export const mcGroupEnum = pgEnum('mc_group', MC_GROUPS);
export const mcAxisEnum = pgEnum('mc_axis', MC_AXES);
export const mcCheckEnum = pgEnum('mc_check', MC_CHECKS);
export const mcCellStatusEnum = pgEnum('mc_cell_status', MC_CELL_STATUSES);
export const mcDailyOverallEnum = pgEnum('mc_daily_overall', MC_DAILY_OVERALLS);
export const contactChipValueEnum = pgEnum('contact_chip_value', CONTACT_CHIP_VALUES);
