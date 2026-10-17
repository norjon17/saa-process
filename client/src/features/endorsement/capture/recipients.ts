/** Last used To/CC of the board email — a per-browser convenience, so plain localStorage (may be blocked → ignored). */
const KEY = 'saa-endorsement-email-recipients';

export interface Recipients {
  to: string;
  cc: string;
}

export function loadRecipients(): Recipients {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { to: '', cc: '' };
    const v = JSON.parse(raw) as Partial<Recipients> | null;
    return { to: typeof v?.to === 'string' ? v.to : '', cc: typeof v?.cc === 'string' ? v.cc : '' };
  } catch {
    return { to: '', cc: '' };
  }
}

export function saveRecipients(r: Recipients) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ to: r.to.trim(), cc: r.cc.trim() }));
  } catch {
    /* private mode / storage disabled — nothing to remember */
  }
}
