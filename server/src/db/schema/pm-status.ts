import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { toolTypeEnum } from './enums.js';
import { tools } from './tools.js';
import { users } from './users.js';

/** Monthly PM checklist per tool (one wide row per tool per month, period = first day of month). */
export const pmStatus = pgTable(
  'pm_status',
  {
    id: serial().primaryKey(),
    toolId: integer()
      .notNull()
      .references(() => tools.id),
    period: date().notNull(),
    area: text(),
    toolType: toolTypeEnum(),
    eeUserId: integer().references(() => users.id),
    eeRaw: text(),
    actualDate: date(),
    fixVacLWith: doublePrecision(),
    fixVacLWithout: doublePrecision(),
    fixVacRWith: doublePrecision(),
    fixVacRWithout: doublePrecision(),
    pickVacLWith: doublePrecision(),
    pickVacLWithout: doublePrecision(),
    pickVacRWith: doublePrecision(),
    pickVacRWithout: doublePrecision(),
    clampLClamp: doublePrecision(),
    clampLUnclamp: doublePrecision(),
    clampRClamp: doublePrecision(),
    clampRUnclamp: doublePrecision(),
    fixtureSpring: doublePrecision(),
    speedMotor: doublePrecision(),
    zOffLPickup: doublePrecision(),
    zOffLRelease: doublePrecision(),
    zOffRPickup: doublePrecision(),
    zOffRRelease: doublePrecision(),
    optGrr: boolean(),
    optCorrelation: boolean(),
    optLaserRecipe: boolean(),
    optAdditionalArea: boolean(),
    optScanPatternDir: boolean(),
    fixtureLeft: text(),
    fixtureRight: text(),
    scanPattern: text(),
    remarks: text(),
    extra: jsonb(),
    updatedBy: integer().references(() => users.id),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    sourceRef: text().unique(),
  },
  (t) => [uniqueIndex('pm_status_tool_period_uq').on(t.toolId, t.period), index('pm_status_period_idx').on(t.period)],
);
