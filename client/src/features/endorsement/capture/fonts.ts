/**
 * Manrope for the board picture. The DOM-to-image library draws through an SVG `<foreignObject>` image, which cannot
 * see the page's web fonts and cannot read the cross-origin Google Fonts stylesheet (the `<link>` has no CORS mode),
 * so we fetch that stylesheet ourselves, keep only the latin subsets and inline the font files as data URLs.
 * The result is cached for the session; on any failure the picture falls back to Segoe UI / Arial.
 */
const FALLBACK_CSS_URL = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap';
const SUBSETS = new Set(['latin', 'latin-ext']);

let cached: Promise<string | null> | null = null;

/** Same stylesheet URL index.html loads (so the HTTP cache usually has it), or a fallback. */
function stylesheetUrl(): string {
  const link = document.querySelector<HTMLLinkElement>('link[rel="stylesheet"][href*="fonts.googleapis.com"][href*="Manrope"]');
  return link?.href ?? FALLBACK_CSS_URL;
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Could not read font file')));
    reader.readAsDataURL(blob);
  });

/** `@font-face` blocks of the wanted subsets from a Google Fonts css2 response (each block follows a `/* subset *\/` comment). */
export function pickSubsets(css: string, subsets: ReadonlySet<string> = SUBSETS): string[] {
  const blocks: string[] = [];
  const re = /\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g;
  for (const m of css.matchAll(re)) if (subsets.has(m[1]!)) blocks.push(m[2]!);
  return blocks;
}

async function load(): Promise<string | null> {
  const res = await fetch(stylesheetUrl(), { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Google Fonts CSS: HTTP ${res.status}`);
  const blocks = pickSubsets(await res.text());
  if (!blocks.length) return null;
  const urls = new Set<string>();
  for (const b of blocks) for (const m of b.matchAll(/url\((['"]?)(https:[^'")]+)\1\)/g)) urls.add(m[2]!);
  const dataUrls = new Map<string, string>();
  await Promise.all(
    [...urls].map(async (u) => {
      const r = await fetch(u, { cache: 'force-cache' });
      if (!r.ok) throw new Error(`Font file: HTTP ${r.status}`);
      dataUrls.set(u, await blobToDataUrl(await r.blob()));
    }),
  );
  return blocks.map((b) => b.replace(/url\((['"]?)(https:[^'")]+)\1\)/g, (_all, _q, u: string) => `url(${dataUrls.get(u) ?? u})`)).join('\n');
}

/** Embeddable `@font-face` CSS for Manrope, or null when the fonts cannot be fetched (offline, blocked). */
export function manropeFontCss(): Promise<string | null> {
  cached ??= load().catch((err: unknown) => {
    console.warn('[capture] Manrope could not be embedded; using system fonts', err);
    cached = null;
    return null;
  });
  return cached;
}
