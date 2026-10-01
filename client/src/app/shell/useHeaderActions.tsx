import { useEffect, type ReactNode } from 'react';

import { useUiStore } from '@/stores/ui.store';

/** Lets a page inject buttons (Excel / Save / Email style) into the header's action slot. */
export function useHeaderActions(node: ReactNode, deps: unknown[] = []) {
  const set = useUiStore((s) => s.setHeaderActions);
  useEffect(() => {
    set(node);
    return () => set(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
