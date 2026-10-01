import { create } from 'zustand';

export type SlotKey = 'mcds' | 'remeasure' | 'sat';
export type FileKind = SlotKey | 'unknown';

export interface SlotFile {
  file: File;
  /** What the first line looks like (client-side sniff), independent of the filename. */
  sniff: FileKind;
  firstLine: string;
}

export const SLOT_META: Record<SlotKey, { title: string; pattern: string; hint: string }> = {
  mcds: { title: 'AfterAdjust (MC-DS)', pattern: '<Lot>-MC-DS.csv', hint: 'Two header blocks; per-head Before/After PSA & RSA' },
  remeasure: { title: 'AfterManual (Re-Measure)', pattern: '<Lot>.csv', hint: 'DATE,TIME,SITE,TESTER,HGA,FIX,PSA,RSA,…' },
  sat: { title: 'SAT', pattern: '<Lot>_<tool>_<seq>_<timestamp>.csv', hint: 'Headerless SAT tester export' },
};

export const SLOT_ORDER: SlotKey[] = ['mcds', 'remeasure', 'sat'];

const RE_MCDS = /-MC-DS\.csv$/i;
const RE_SAT = /^[A-Z0-9]{10,20}_[A-Z0-9]+_\d{3}_\d{14}\.csv$/i;
const RE_LOT = /^[A-Z0-9]{10,20}\.csv$/i;

export function kindFromName(name: string): FileKind {
  if (RE_MCDS.test(name)) return 'mcds';
  if (RE_SAT.test(name)) return 'sat';
  if (RE_LOT.test(name)) return 'remeasure';
  return 'unknown';
}

export function kindFromFirstLine(line: string): FileKind {
  if (line.startsWith('ProgramId,')) return 'mcds';
  if (line.startsWith('DATE,TIME,')) return 'remeasure';
  if (line.startsWith('SPR ')) return 'sat';
  return 'unknown';
}

async function sniff(file: File): Promise<{ sniff: FileKind; firstLine: string }> {
  try {
    const head = await file.slice(0, 512).text();
    const firstLine = (head.split(/\r?\n/)[0] ?? '').trim();
    return { sniff: kindFromFirstLine(firstLine), firstLine };
  } catch {
    return { sniff: 'unknown', firstLine: '' };
  }
}

interface UploadState {
  slots: Record<SlotKey, SlotFile | null>;
  stage: number;
  /** Files whose slot could not be determined and every slot was taken. */
  rejected: string[];
  setStage: (stage: number) => void;
  addFiles: (files: File[]) => Promise<void>;
  setSlot: (key: SlotKey, file: File | null) => Promise<void>;
  reset: () => void;
}

const emptySlots = (): Record<SlotKey, SlotFile | null> => ({ mcds: null, remeasure: null, sat: null });

/** Client-only draft of the three lot CSVs for the upload wizard. */
export const useUploadStore = create<UploadState>((set, get) => ({
  slots: emptySlots(),
  stage: 0,
  rejected: [],
  setStage: (stage) => set({ stage }),
  addFiles: async (files) => {
    const slots = { ...get().slots };
    const rejected: string[] = [];
    for (const file of files) {
      const s = await sniff(file);
      const byName = kindFromName(file.name);
      let key: SlotKey | null = byName !== 'unknown' ? byName : s.sniff !== 'unknown' ? s.sniff : null;
      if (!key) key = SLOT_ORDER.find((k) => slots[k] === null) ?? null;
      if (!key) {
        rejected.push(file.name);
        continue;
      }
      slots[key] = { file, ...s };
    }
    set({ slots, rejected });
  },
  setSlot: async (key, file) => {
    if (!file) {
      set({ slots: { ...get().slots, [key]: null } });
      return;
    }
    const s = await sniff(file);
    set({ slots: { ...get().slots, [key]: { file, ...s } } });
  },
  reset: () => set({ slots: emptySlots(), stage: 0, rejected: [] }),
}));

export const selectFiles = (s: UploadState): File[] => SLOT_ORDER.map((k) => s.slots[k]?.file).filter((f): f is File => !!f);
export const selectComplete = (s: UploadState): boolean => SLOT_ORDER.every((k) => s.slots[k] !== null);
