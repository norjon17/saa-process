import { useMediaQuery } from '@mantine/hooks';

/** Phone layout: below Mantine's `sm` breakpoint (48em = 768px), the same point where the navbar becomes a drawer. */
export const MOBILE_QUERY = '(max-width: 47.99em)';

/** Read synchronously on first render so a phone never flashes the desktop table layout first. */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY, false, { getInitialValueInEffect: false });
}
