import { sql } from 'drizzle-orm';
import { boolean, check, integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

import { userRoleEnum } from './enums.js';

export const users = pgTable(
  'users',
  {
    id: serial().primaryKey(),
    idNo: varchar({ length: 4 }).notNull().unique(),
    name: text().notNull(),
    role: userRoleEnum().notNull().default('tech'),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('users_id_no_digits', sql`${t.idNo} ~ '^[0-9]{4}$'`)],
);

/** Free-text spellings found in the Excel files → canonical user. Alias is stored lower-cased and trimmed. */
export const userAliases = pgTable('user_aliases', {
  alias: text().primaryKey(),
  userId: integer()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});
