import { relations } from 'drizzle-orm';

import { endorsementCategories, endorsementPeople, endorsements } from './endorsements.js';
import { meancheckChecks, meancheckDaily, meancheckLots, meancheckReadings } from './meancheck.js';
import { pmStatus } from './pm-status.js';
import { regions, tools } from './tools.js';
import { users } from './users.js';

export const usersRelations = relations(users, ({ many }) => ({
  endorsementPeople: many(endorsementPeople),
}));

export const regionsRelations = relations(regions, ({ many }) => ({
  tools: many(tools),
}));

export const toolsRelations = relations(tools, ({ one, many }) => ({
  region: one(regions, { fields: [tools.regionId], references: [regions.id] }),
  ee: one(users, { fields: [tools.eeUserId], references: [users.id] }),
  endorsements: many(endorsements),
  lots: many(meancheckLots),
}));

export const endorsementsRelations = relations(endorsements, ({ one, many }) => ({
  tool: one(tools, { fields: [endorsements.toolId], references: [tools.id] }),
  category: one(endorsementCategories, { fields: [endorsements.categoryId], references: [endorsementCategories.id] }),
  people: many(endorsementPeople),
}));

export const endorsementPeopleRelations = relations(endorsementPeople, ({ one }) => ({
  endorsement: one(endorsements, { fields: [endorsementPeople.endorsementId], references: [endorsements.id] }),
  user: one(users, { fields: [endorsementPeople.userId], references: [users.id] }),
}));

export const meancheckLotsRelations = relations(meancheckLots, ({ one, many }) => ({
  tool: one(tools, { fields: [meancheckLots.toolId], references: [tools.id] }),
  readings: many(meancheckReadings),
  checks: many(meancheckChecks),
}));

export const meancheckReadingsRelations = relations(meancheckReadings, ({ one }) => ({
  lot: one(meancheckLots, { fields: [meancheckReadings.lotId], references: [meancheckLots.id] }),
}));

export const meancheckChecksRelations = relations(meancheckChecks, ({ one }) => ({
  lot: one(meancheckLots, { fields: [meancheckChecks.lotId], references: [meancheckLots.id] }),
}));

export const meancheckDailyRelations = relations(meancheckDaily, ({ one }) => ({
  tool: one(tools, { fields: [meancheckDaily.toolId], references: [tools.id] }),
}));

export const pmStatusRelations = relations(pmStatus, ({ one }) => ({
  tool: one(tools, { fields: [pmStatus.toolId], references: [tools.id] }),
  ee: one(users, { fields: [pmStatus.eeUserId], references: [users.id] }),
}));
