import { boolean, doublePrecision, pgTable, varchar } from 'drizzle-orm/pg-core';

/** Product specification table from the meancheck Excel template (Summary!L80:T95). */
export const models = pgTable('models', {
  code: varchar({ length: 3 }).primaryKey(),
  pitchTarget: doublePrecision().notNull(),
  rollTarget: doublePrecision().notNull().default(0),
  tolerance: doublePrecision().notNull(),
  deltaSatLimit: doublePrecision().notNull().default(0.05),
  deltaTargetLimit: doublePrecision().notNull().default(0.05),
  sigmaLimit: doublePrecision().notNull().default(0.08),
  cpkMin: doublePrecision().notNull().default(1.33),
  isActive: boolean().notNull().default(true),
});
