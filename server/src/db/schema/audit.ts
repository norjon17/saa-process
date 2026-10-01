import { sql } from 'drizzle-orm';
import { bigserial, index, integer, jsonb, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const AUDIT_ENTITIES = ['user', 'user_alias', 'tool', 'region', 'model', 'category'] as const;
export type AuditEntity = (typeof AUDIT_ENTITIES)[number];

export const AUDIT_ACTIONS = ['create', 'update', 'activate', 'deactivate', 'delete'] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** `{ field: { from, to } }` — for `create` every field with `from: null`. */
export type AuditChanges = Record<string, { from: unknown; to: unknown }>;

export const auditActionEnum = pgEnum('audit_action', AUDIT_ACTIONS);

/** Append-only change history of the admin reference data (users, aliases, tools, regions, models, categories). */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    entity: text().$type<AuditEntity>().notNull(),
    entityId: text().notNull(),
    entityLabel: text(),
    action: auditActionEnum().notNull(),
    changes: jsonb().$type<AuditChanges>().notNull(),
    actorId: integer().references(() => users.id, { onDelete: 'set null' }),
    actorName: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_entity_created_idx').on(t.entity, sql`${t.createdAt} desc`, sql`${t.id} desc`),
    index('audit_logs_entity_entity_id_idx').on(t.entity, t.entityId, sql`${t.id} desc`),
    index('audit_logs_actor_idx').on(t.actorId),
  ],
);
