import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { BoardSnapshot, SNAPSHOT_WIDTH, type SnapshotData } from './BoardSnapshot';
import { manropeFontCss } from './fonts';

export const captureFileName = (date: string, shift: string) => `SAA_Endorsement_${date}_${shift}.png`;

/**
 * Renders `BoardSnapshot` into an off-screen container and turns it into a PNG. The DOM-to-image library
 * (modern-screenshot) is loaded on first use, so it stays out of the entry chunk.
 *
 * Pixel ratio follows the screen (1–2×), like a native screenshot: mail apps show a pasted picture at
 * `pixels / devicePixelRatio`, so the board keeps its ~1100px width in the message on scaled displays too.
 */
export async function captureBoardPng(data: SnapshotData): Promise<Blob> {
  const [{ domToBlob }, fontCss] = await Promise.all([import('modern-screenshot'), manropeFontCss()]);

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  // Off-screen but laid out (display:none / visibility:hidden would give it no size or hide it in the copy).
  Object.assign(host.style, { position: 'fixed', left: '-20000px', top: '0', width: `${SNAPSHOT_WIDTH}px`, pointerEvents: 'none', zIndex: '-1' });
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<BoardSnapshot data={data} />));
    const node = host.firstElementChild as HTMLElement | null;
    if (!node) throw new Error('Board snapshot did not render');
    await document.fonts.ready;
    const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const blob = await domToBlob(node, {
      type: 'image/png',
      scale,
      width: SNAPSHOT_WIDTH,
      backgroundColor: '#ffffff',
      font: fontCss ? { cssText: fontCss } : false,
      timeout: 15_000,
    });
    if (!blob || blob.size === 0) throw new Error('The picture came out empty');
    return blob;
  } finally {
    root.unmount();
    host.remove();
  }
}
