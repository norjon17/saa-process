import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import { endorsementProgressEnum, peopleKindEnum, shiftEnum } from './enums.js';
import { tools } from './tools.js';
import { users } from './users.js';

export const endorsementCategories = pgTable('endorsement_categories', {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  sectionKey: varchar({ length: 2 }).notNull().default('s6'),
  sortOrder: integer().notNull().default(0),
  isActive: boolean().notNull().default(true),
});

export const endorsements = pgTable(
  'endorsements',
  {
    id: serial().primaryKey(),
    seqNo: integer(),
    date: date().notNull(),
    shift: shiftEnum().notNull(),
    categoryId: integer().references(() => endorsementCategories.id),
    toolId: integer().references(() => tools.id),
    issue: text().notNull().default(''),
    actionStatus: text().notNull().default(''),
    progress: endorsementProgressEnum().notNull().default('open'),
    isNone: boolean().notNull().default(false),
    /** Section (s1..s6) for NONE rows and rows without category. */
    sectionKey: varchar({ length: 2 }),
    endorseByRaw: text(),
    endorseToRaw: text(),
    createdBy: integer().references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedBy: integer().references(() => users.id),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    sourceRef: text().unique(),
  },
  (t) => [
    index('endorsements_date_idx').on(t.date, t.id),
    index('endorsements_tool_date_idx').on(t.toolId, t.date),
    index('endorsements_category_idx').on(t.categoryId),
    index('endorsements_progress_idx').on(t.progress),
  ],
);

export const endorsementPeople = pgTable(
  'endorsement_people',
  {
    endorsementId: integer()
      .notNull()
      .references(() => endorsements.id, { onDelete: 'cascade' }),
    userId: integer()
      .notNull()
      .references(() => users.id),
    kind: peopleKindEnum().notNull(),
  },
  (t) => [primaryKey({ columns: [t.endorsementId, t.userId, t.kind] }), index('endorsement_people_user_idx').on(t.userId)],
);

export const endorsementAttachments = pgTable(
  'endorsement_attachments',
  {
    id: serial().primaryKey(),
    date: date().notNull(),
    shift: shiftEnum().notNull(),
    sectionKey: varchar({ length: 2 }).notNull(),
    fileName: text().notNull(),
    storedPath: text().notNull(),
    mimeType: text().notNull(),
    sizeBytes: integer().notNull(),
    uploadedBy: integer().references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('endorsement_attachments_shift_idx').on(t.date, t.shift, t.sectionKey)],
);
