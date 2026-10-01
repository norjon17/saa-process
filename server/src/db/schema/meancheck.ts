import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import {
  fixtureEnum,
  headTypeEnum,
  mcAxisEnum,
  mcCellStatusEnum,
  mcCheckEnum,
  mcDailyOverallEnum,
  mcGroupEnum,
  mcVerdictEnum,
  shiftEnum,
} from './enums.js';
import { models } from './models.js';
import { tools } from './tools.js';
import { users } from './users.js';

export const meancheckLots = pgTable(
  'meancheck_lots',
  {
    id: serial().primaryKey(),
    lotNo: text().notNull().unique(),
    programLotName: text(),
    toolId: integer()
      .notNull()
      .references(() => tools.id),
    modelCode: varchar({ length: 3 })
      .notNull()
      .references(() => models.code),
    headType: headTypeEnum(),
    suspension: text(),
    satTester: text(),
    mcDate: date().notNull(),
    shift: shiftEnum(),
    asmLine: text(),
    asmCell: text(),
    operatorId: text(),
    verdict: mcVerdictEnum().notNull(),
    failCount: smallint().notNull().default(0),
    engineVersion: text().notNull(),
    specSnapshot: jsonb().notNull(),
    headDelta: jsonb().notNull(),
    stats: jsonb().notNull(),
    files: jsonb().notNull(),
    uploadedBy: integer().references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('meancheck_lots_tool_date_idx').on(t.toolId, t.mcDate),
    index('meancheck_lots_date_idx').on(t.mcDate),
    index('meancheck_lots_verdict_idx').on(t.verdict),
  ],
);

export const meancheckReadings = pgTable(
  'meancheck_readings',
  {
    lotId: integer()
      .notNull()
      .references(() => meancheckLots.id, { onDelete: 'cascade' }),
    position: smallint().notNull(),
    fixture: fixtureEnum().notNull(),
    psaBefore: doublePrecision(),
    rsaBefore: doublePrecision(),
    psaAfter: doublePrecision(),
    rsaAfter: doublePrecision(),
    psaRemeasure: doublePrecision(),
    rsaRemeasure: doublePrecision(),
    psaSat: doublePrecision(),
    rsaSat: doublePrecision(),
    resultState: text(),
  },
  (t) => [primaryKey({ columns: [t.lotId, t.position] })],
);

export const meancheckChecks = pgTable(
  'meancheck_checks',
  {
    lotId: integer()
      .notNull()
      .references(() => meancheckLots.id, { onDelete: 'cascade' }),
    group: mcGroupEnum().notNull(),
    axis: mcAxisEnum().notNull(),
    check: mcCheckEnum().notNull(),
    value: doublePrecision().notNull(),
    limit: doublePrecision().notNull(),
    passed: boolean().notNull(),
  },
  (t) => [primaryKey({ columns: [t.lotId, t.group, t.axis, t.check] })],
);

/** 1st Meancheck daily monitoring grid (one wide row per tool per day). */
export const meancheckDaily = pgTable(
  'meancheck_daily',
  {
    id: serial().primaryKey(),
    toolId: integer()
      .notNull()
      .references(() => tools.id),
    date: date().notNull(),
    vsSatPsaL: mcCellStatusEnum(),
    vsSatPsaR: mcCellStatusEnum(),
    vsSatRsaL: mcCellStatusEnum(),
    vsSatRsaR: mcCellStatusEnum(),
    vsTgtPsaL: mcCellStatusEnum(),
    vsTgtPsaR: mcCellStatusEnum(),
    vsTgtRsaL: mcCellStatusEnum(),
    vsTgtRsaR: mcCellStatusEnum(),
    overall: mcDailyOverallEnum().notNull().default('pending'),
    lotId: integer().references(() => meancheckLots.id, { onDelete: 'set null' }),
    note: text(),
    updatedBy: integer().references(() => users.id),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    sourceRef: text().unique(),
  },
  (t) => [uniqueIndex('meancheck_daily_tool_date_uq').on(t.toolId, t.date), index('meancheck_daily_date_idx').on(t.date)],
);
