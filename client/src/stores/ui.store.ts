import type { ReactNode } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  navCollapsed: boolean;
  mobileNavOpen: boolean;
  density: 'compact' | 'comfortable';
  lastIdNo: string | null;
  headerActions: ReactNode | null;
  /** Navbar groups the user opened/closed (persisted); groups not listed follow the active route. */
  navGroupsOpen: Record<string, boolean>;
  /** Last breadcrumb segment of detail pages (lot number, tool code); set via `useBreadcrumb`. */
  crumbDetail: string | null;
  toggleNav: () => void;
  setMobileNav: (open: boolean) => void;
  setDensity: (d: UiState['density']) => void;
  setLastIdNo: (id: string | null) => void;
  setHeaderActions: (node: ReactNode | null) => void;
  setNavGroupOpen: (group: string, open: boolean) => void;
  setCrumbDetail: (label: string | null) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      navCollapsed: false,
      mobileNavOpen: false,
      density: 'compact',
      lastIdNo: null,
      headerActions: null,
      navGroupsOpen: {},
      crumbDetail: null,
      toggleNav: () => set((s) => ({ navCollapsed: !s.navCollapsed })),
      setMobileNav: (open) => set({ mobileNavOpen: open }),
      setDensity: (density) => set({ density }),
      setLastIdNo: (lastIdNo) => set({ lastIdNo }),
      setHeaderActions: (headerActions) => set({ headerActions }),
      setNavGroupOpen: (group, open) => set((s) => ({ navGroupsOpen: { ...s.navGroupsOpen, [group]: open } })),
      setCrumbDetail: (crumbDetail) => set({ crumbDetail }),
    }),
    {
      name: 'saa-ui',
      partialize: (s) => ({ navCollapsed: s.navCollapsed, density: s.density, lastIdNo: s.lastIdNo, navGroupsOpen: s.navGroupsOpen }),
    },
  ),
);
