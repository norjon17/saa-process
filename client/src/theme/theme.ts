import { Badge, Button, Card, createTheme, Modal, Table, type CSSVariablesResolver } from '@mantine/core';

import { aqua, brand, BRAND_GRADIENT, HEADER_GRADIENT_DARK, HEADER_GRADIENT_LIGHT, navy, SECTIONS } from './colors';

export const theme = createTheme({
  fontFamily: "'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif",
  headings: { fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: '800' },
  primaryColor: 'brand',
  primaryShade: { light: 6, dark: 5 },
  colors: { brand, aqua, navy },
  defaultRadius: 'md',
  radius: { xs: '5px', sm: '7px', md: '10px', lg: '14px', xl: '20px' },
  shadows: {
    xs: '0 1px 2px rgba(0,0,0,.05)',
    sm: '0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.08)',
    md: '0 2px 8px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.10)',
    lg: '0 8px 32px rgba(0,0,0,.13),0 2px 8px rgba(0,0,0,.08)',
    xl: '0 20px 60px rgba(0,0,0,.35)',
  },
  fontSizes: { xs: '0.68rem', sm: '0.78rem', md: '0.86rem', lg: '0.98rem', xl: '1.15rem' },
  other: { headerHeight: 62, navbarWidth: 236 },
  components: {
    Card: Card.extend({ defaultProps: { radius: 'lg', withBorder: true, shadow: 'sm', padding: 'md' } }),
    Button: Button.extend({ defaultProps: { radius: 'sm', fw: 700 } }),
    Badge: Badge.extend({ defaultProps: { radius: 'sm', fw: 800 } }),
    Table: Table.extend({ defaultProps: { fz: 'sm', verticalSpacing: 4, horizontalSpacing: 6, highlightOnHover: true } }),
    Modal: Modal.extend({ defaultProps: { radius: 'lg', overlayProps: { blur: 3, backgroundOpacity: 0.55 }, centered: true } }),
  },
});

/** Maps the original dashboard's CSS custom properties onto both colour schemes. */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--saa-grad': BRAND_GRADIENT,
    ...Object.fromEntries(Object.entries(SECTIONS).map(([k, s]) => [`--saa-${k}-bar`, s.bar])),
    ...Object.fromEntries(Object.entries(SECTIONS).map(([k, s]) => [`--saa-${k}-base`, s.base])),
  },
  light: {
    '--mantine-color-body': '#eef2f7',
    '--saa-surface': '#ffffff',
    '--saa-surface2': '#f4f7fb',
    '--saa-border': '#dce4ef',
    '--saa-text2': '#4a5568',
    '--saa-text3': '#718096',
    '--saa-header-bg': HEADER_GRADIENT_LIGHT,
    '--saa-kpi-bg': '#f0f5fc',
    '--saa-kpi-border': '#c8d9f0',
    '--saa-none-row': '#0d0d0d',
    ...Object.fromEntries(Object.entries(SECTIONS).map(([k, s]) => [`--saa-${k}-text`, s.textLight])),
    ...Object.fromEntries(Object.entries(SECTIONS).map(([k, s]) => [`--saa-${k}-bg`, s.bgLight])),
  },
  dark: {
    '--mantine-color-body': '#080c14',
    '--saa-surface': '#0f1623',
    '--saa-surface2': '#141d2e',
    '--saa-border': '#1e2d45',
    '--saa-text2': '#9db4cc',
    '--saa-text3': '#607a96',
    '--saa-header-bg': HEADER_GRADIENT_DARK,
    '--saa-kpi-bg': 'rgba(33,104,253,.05)',
    '--saa-kpi-border': 'rgba(33,104,253,.15)',
    '--saa-none-row': '#000000',
    ...Object.fromEntries(Object.entries(SECTIONS).map(([k, s]) => [`--saa-${k}-text`, s.textDark])),
    ...Object.fromEntries(Object.entries(SECTIONS).map(([k, s]) => [`--saa-${k}-bg`, s.bgDark])),
  },
});
