import type { ModelSpec } from './types.js';

/** Seed values from the Excel template (Summary!L80:T95). The database `models` table is the runtime source. */
export const DEFAULT_SPECS: ModelSpec[] = (
  [
    ['J1B', 1.8, 0.4],
    ['J1R', 1.8, 0.4],
    ['JGO', 1.8, 0.4],
    ['JGB', 1.8, 0.4],
    ['MPK', 2.0, 0.4],
    ['SF4', 1.9, 0.4],
    ['CEP', 1.7, 0.65],
    ['A8S', 2.0, 0.4],
    ['APS', 2.0, 0.4],
    ['PCM', 1.9, 0.4],
    ['PDQ', 1.9, 0.4],
    ['LDS', 1.9, 0.4],
    ['SEW', 1.9, 0.4],
    ['LD3', 1.9, 0.4],
    ['KCF', 1.75, 0.25],
  ] as const
).map(([code, pitchTarget, tolerance]) => ({
  code,
  pitchTarget,
  rollTarget: 0,
  tolerance,
  deltaSatLimit: 0.05,
  deltaTargetLimit: 0.05,
  sigmaLimit: 0.08,
  cpkMin: 1.33,
}));

export const specByCode = (code: string): ModelSpec | undefined => DEFAULT_SPECS.find((s) => s.code === code.toUpperCase());
