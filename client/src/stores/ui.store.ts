import type { ReactNode } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  navCollapsed: boolean;
  mobileNavOpen: boolean;
  density: 'compact' | 'comfortable';
  lastIdNo: string | null;
  headerActions: ReactNode | null;
  toggleNav: () => void;
  setMobileNav: (open: boolean) => void;
  setDensity: (d: UiState['density']) => void;
  setLastIdNo: (id: string | null) => void;
  setHeaderActions: (node: ReactNode | null) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      navCollapsed: false,
      mobileNavOpen: false,
      density: 'compact',
      lastIdNo: null,
      headerActions: null,
      toggleNav: () => set((s) => ({ navCollapsed: !s.navCollapsed })),
      setMobileNav: (open) => set({ mobileNavOpen: open }),
      setDensity: (density) => set({ density }),
      setLastIdNo: (lastIdNo) => set({ lastIdNo }),
      setHeaderActions: (headerActions) => set({ headerActions }),
    }),
    {
      name: 'saa-ui',
      partialize: (s) => ({ navCollapsed: s.navCollapsed, density: s.density, lastIdNo: s.lastIdNo }),
    },
  ),
);
