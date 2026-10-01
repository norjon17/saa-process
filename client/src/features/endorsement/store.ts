import { create } from 'zustand';

import type { SaveState } from '@/components/ui/SaveIndicator';

interface EndorsementSaveState {
  pending: number;
  state: SaveState;
  at: number | null;
  begin: () => void;
  end: (ok: boolean) => void;
}

/** Client-only "Saving… / ✔ Auto-saved" indicator shared by every endorsement mutation. */
export const useSaveStore = create<EndorsementSaveState>((set) => ({
  pending: 0,
  state: 'idle',
  at: null,
  begin: () => set((s) => ({ pending: s.pending + 1, state: 'saving' })),
  end: (ok) =>
    set((s) => {
      const pending = Math.max(0, s.pending - 1);
      if (!ok) return { pending, state: 'error' };
      return pending === 0 ? { pending, state: 'saved', at: Date.now() } : { pending };
    }),
}));
