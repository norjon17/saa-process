import {
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { contactChipValueEnum, shiftEnum } from './enums.js';
import { models } from './models.js';
import { tools } from './tools.js';
import { users } from './users.js';

/** Fresh column builders per table — a shared object would make Drizzle reuse one constraint name for every table. */
const audit = () => ({
  createdBy: integer().references(() => users.id),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedBy: integer().references(() => users.id),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  sourceRef: text().unique(),
});

export const contactChip = pgTable(
  'contact_chip',
  {
    id: serial().primaryKey(),
    toolId: integer()
      .notNull()
      .references(() => tools.id),
    date: date().notNull(),
    value: contactChipValueEnum().notNull(),
    note: text(),
    updatedBy: integer().references(() => users.id),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    sourceRef: text().unique(),
  },
  (t) => [uniqueIndex('contact_chip_tool_date_uq').on(t.toolId, t.date), index('contact_chip_date_idx').on(t.date)],
);

export const lowCpk = pgTable(
  'low_cpk',
  {
    id: serial().primaryKey(),
    seqNo: integer(),
    date: date(),
    shift: shiftEnum(),
    toolId: integer().references(() => tools.id),
    modelHt: text(),
    modelCode: varchar({ length: 3 }).references(() => models.code),
    lotNo: text(),
    mean: doublePrecision(),
    sigma: doublePrecision(),
    cpk: doublePrecision(),
    remarks: text(),
    ...audit(),
  },
  (t) => [index('low_cpk_date_idx').on(t.date)],
);

export const circuitBurn = pgTable(
  'circuit_burn',
  {
    id: serial().primaryKey(),
    seqNo: integer(),
    date: date(),
    shift: shiftEnum(),
    toolId: integer().references(() => tools.id),
    modelHt: text(),
    lotNo: text(),
    brickQty: integer(),
    defectQty: integer(),
    remarks: text(),
    ...audit(),
  },
  (t) => [index('circuit_burn_date_idx').on(t.date)],
);

export const fitOcap = pgTable(
  'fit_ocap',
  {
    id: serial().primaryKey(),
    seqNo: integer(),
    date: date(),
    shift: shiftEnum(),
    toolId: integer().references(() => tools.id),
    toolRaw: text(),
    model: text(),
    fitDetection: text(),
    defectName: text(),
    brickQty: integer(),
    defectQty: integer(),
    fitConfirmation: text(),
    beforeAction: text(),
    afterAction: text(),
    remarks: text(),
    extra: jsonb(),
    ...audit(),
  },
  (t) => [index('fit_ocap_date_idx').on(t.date)],
);

export const weeklyOoc = pgTable(
  'weekly_ooc',
  {
    id: serial().primaryKey(),
    seqNo: integer(),
    ww: smallint(),
    wwYear: smallint(),
    toolId: integer().references(() => tools.id),
    toolRaw: text(),
    model: text(),
    headType: text(),
    suspension: text(),
    issue: text(),
    endorseBy: text(),
    endorseTo: text(),
    remarksAfterAction: text(),
    ...audit(),
  },
  (t) => [index('weekly_ooc_ww_idx').on(t.wwYear, t.ww)],
);
