/**
 * Copying a picture needs the async Clipboard API, which browsers only expose on secure origins
 * (https, or http://localhost). Over plain http on the plant LAN the user gets Download PNG instead.
 */
export type ClipboardSupport = { ok: true } | { ok: false; reason: string };

export function imageClipboardSupport(): ClipboardSupport {
  if (typeof window === 'undefined') return { ok: false, reason: 'No browser window.' };
  if (!window.isSecureContext) {
    return {
      ok: false,
      reason: `Copying pictures only works on a secure (https) address — this page is on ${window.location.origin}. Download the PNG and attach or drag it into the email instead.`,
    };
  }
  if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function' || typeof ClipboardItem === 'undefined') {
    return { ok: false, reason: 'This browser cannot copy pictures to the clipboard. Download the PNG and attach it instead.' };
  }
  return { ok: true };
}

/**
 * Writes a PNG to the clipboard. Accepts a promise so the call can start inside the click handler (keeping the user
 * activation Safari/Chrome require) while the picture is still being drawn.
 */
export async function copyPng(png: Blob | Promise<Blob>): Promise<void> {
  const support = imageClipboardSupport();
  if (!support.ok) throw new Error(support.reason);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
