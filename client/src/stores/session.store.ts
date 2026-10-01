import { create } from 'zustand';

import type { SessionUser } from '@/lib/api/types';

interface SessionState {
  user: SessionUser | null;
  status: 'unknown' | 'authed' | 'anon';
  setUser: (user: SessionUser | null) => void;
  clear: () => void;
}

/** Synchronous mirror of GET /api/auth/me — the server is the source of truth. */
export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  status: 'unknown',
  setUser: (user) => set({ user, status: user ? 'authed' : 'anon' }),
  clear: () => set({ user: null, status: 'anon' }),
}));

export const useCurrentUser = () => useSessionStore((s) => s.user);

export type Ability = 'edit' | 'manageUsers' | 'manageTools' | 'deleteLots' | 'editSpecs';

export function can(user: SessionUser | null, ability: Ability): boolean {
  if (!user) return false;
  switch (ability) {
    case 'edit':
      return true;
    case 'manageUsers':
    case 'manageTools':
      return user.role === 'admin';
    case 'deleteLots':
    case 'editSpecs':
      return user.role === 'admin' || user.role === 'ee';
  }
}

export const useCan = (ability: Ability) => useSessionStore((s) => can(s.user, ability));
