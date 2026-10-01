import type { MantineColorsTuple } from '@mantine/core';

/** Brand blue — shade 6 is the HTML's #2168FD. */
export const brand: MantineColorsTuple = ['#e9f0ff', '#d1e0ff', '#a3c1ff', '#72a0ff', '#4a84fe', '#2f72fd', '#2168FD', '#1a57d6', '#1447ad', '#0d3585'];
/** Aqua end of the brand gradient — shade 5 is #3AE4C9. */
export const aqua: MantineColorsTuple = ['#e6fbf8', '#c6f6ee', '#9deee0', '#72e8d3', '#52e6cd', '#3AE4C9', '#2fc9b1', '#25a892', '#1c8674', '#146557'];
/** Header navy. */
export const navy: MantineColorsTuple = ['#e8eefb', '#c8d6f2', '#9fb5e6', '#7593d9', '#4f74cc', '#2b5abf', '#0057c2', '#003a8c', '#002a66', '#001f4d'];

export const BRAND_GRADIENT = 'linear-gradient(90deg,#2168FD 0%,#1E71FA 22%,#37B1D3 55%,#39D6CB 78%,#3AE4C9 100%)';
export const HEADER_GRADIENT_LIGHT = 'linear-gradient(135deg,#001f4d 0%,#003a8c 55%,#0057c2 100%)';
export const HEADER_GRADIENT_DARK = 'linear-gradient(135deg,#030610 0%,#091428 55%,#0c1f44 100%)';

export interface SectionPalette {
  base: string;
  textLight: string;
  textDark: string;
  bgLight: string;
  bgDark: string;
  bar: string;
  mantine: string;
}

/** The six board sections, exactly as the original dashboard styled them. */
export const SECTIONS: Record<'s1' | 's2' | 's3' | 's4' | 's5' | 's6', SectionPalette> = {
  s1: { base: '#2e7d32', textLight: '#1b5e20', textDark: '#81c784', bgLight: '#e8f5e9', bgDark: 'rgba(46,125,50,.12)', bar: 'linear-gradient(135deg,#2e7d32,#43a047,#66bb6a)', mantine: 'green' },
  s2: { base: '#e65100', textLight: '#bf360c', textDark: '#ffb380', bgLight: '#fff3e0', bgDark: 'rgba(230,81,0,.12)', bar: 'linear-gradient(135deg,#e65100,#f4511e,#ff8a50)', mantine: 'orange' },
  s3: { base: '#1565c0', textLight: '#0d47a1', textDark: '#90caf9', bgLight: '#e3f2fd', bgDark: 'rgba(21,101,192,.12)', bar: 'linear-gradient(135deg,#1565c0,#1976d2,#42a5f5)', mantine: 'blue' },
  s4: { base: '#6a1b9a', textLight: '#4a148c', textDark: '#ce93d8', bgLight: '#f3e5f5', bgDark: 'rgba(106,27,154,.12)', bar: 'linear-gradient(135deg,#6a1b9a,#8e24aa,#ba68c8)', mantine: 'grape' },
  s5: { base: '#c62828', textLight: '#b71c1c', textDark: '#ef9a9a', bgLight: '#fce4ec', bgDark: 'rgba(198,40,40,.12)', bar: 'linear-gradient(135deg,#c62828,#e53935,#ef9a9a)', mantine: 'red' },
  s6: { base: '#00695c', textLight: '#004d40', textDark: '#80deea', bgLight: '#e0f7fa', bgDark: 'rgba(0,105,92,.12)', bar: 'linear-gradient(135deg,#00695c,#00897b,#4db6ac)', mantine: 'teal' },
};

export const SHIFT_COLORS = {
  DS: { dot: '#38bdf8', text: '#7dd3fc', bg: 'rgba(56,189,248,.18)', border: 'rgba(56,189,248,.35)', gradient: 'linear-gradient(135deg,#1565c0,#1976d2)' },
  NS: { dot: '#a78bfa', text: '#c4b5fd', bg: 'rgba(167,139,250,.18)', border: 'rgba(167,139,250,.35)', gradient: 'linear-gradient(135deg,#4a148c,#6a1b9a)' },
} as const;

/** 1st-meancheck daily grid cell colours. */
export const CELL_COLORS = {
  P_AUTO: { bg: '#2e7d32', fg: '#ffffff', label: 'P (Auto)' },
  F_AUTO: { bg: '#c62828', fg: '#ffffff', label: 'F (Auto)' },
  P_MAN: { bg: '#a5d6a7', fg: '#1b5e20', label: 'P (Man)' },
  F_MAN: { bg: '#ef6c00', fg: '#ffffff', label: 'F (Man)' },
  IDLE: { bg: '#9e9e9e', fg: '#ffffff', label: 'IDLE' },
  MB: { bg: '#263238', fg: '#ffffff', label: 'MB' },
} as const;

export const OVERALL_COLORS = {
  passed: { bg: '#2e7d32', fg: '#fff', label: 'Passed' },
  failed: { bg: '#c62828', fg: '#fff', label: 'Failed' },
  idle: { bg: '#9e9e9e', fg: '#fff', label: 'IDLE' },
  mb: { bg: '#263238', fg: '#fff', label: 'MB' },
  pending: { bg: '#e2e8f0', fg: '#475569', label: 'Pending' },
} as const;
