import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, serial, text, varchar } from 'drizzle-orm/pg-core';

import { toolTypeEnum } from './enums.js';
import { users } from './users.js';

export const regions = pgTable('regions', {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  sortOrder: integer().notNull().default(0),
  isActive: boolean().notNull().default(true),
});

export const tools = pgTable(
  'tools',
  {
    id: serial().primaryKey(),
    code: varchar({ length: 6 }).notNull().unique(),
    regionId: integer().references(() => regions.id),
    toolType: toolTypeEnum(),
    eeUserId: integer().references(() => users.id),
    isActive: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    notes: text(),
  },
  (t) => [check('tools_code_format', sql`${t.code} ~ '^SAA[0-9]{2}H$'`), index('tools_region_idx').on(t.regionId)],
);

/** Spellings the regex normaliser cannot resolve (e.g. "SASA33"). Alias stored upper-cased, whitespace removed. */
export const toolAliases = pgTable('tool_aliases', {
  alias: text().primaryKey(),
  toolId: integer()
    .notNull()
    .references(() => tools.id, { onDelete: 'cascade' }),
});
