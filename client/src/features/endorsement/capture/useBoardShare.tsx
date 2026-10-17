import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import type { Shift } from '@shared/domain';

import type { BoardResponse } from '@/lib/api/types';
import { notify } from '@/lib/notify';
import { useCurrentUser } from '@/stores/session.store';

import { captureBoardPng, captureFileName } from './captureBoard';
import { copyPng, downloadBlob, imageClipboardSupport } from './clipboard';
import { CaptureModal } from './CaptureModal';
import { EmailModal } from './EmailModal';
import type { CopyState, PictureState } from './types';

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const IDLE = { status: 'idle' } as const;

interface Options {
  date: string;
  shift: Shift;
  /**
   * The board query's data. TanStack Query keeps the same object across refetches that return identical rows
   * (structural sharing), so the cached picture survives a focus refetch and is redrawn only when rows change.
   */
  board: BoardResponse | undefined;
}

/** A state value tagged with the board object it belongs to; anything for another board reads as idle. */
interface Tagged<T> {
  board: BoardResponse;
  state: T;
}

/**
 * Capture + Email for the Shift Board. Returns the two header-button handlers and the modals to render.
 * The picture is cached per board data object, so Capture → Email… → Copy reuse one render.
 */
export function useBoardShare({ date, shift, board }: Options): { openCapture: () => void; openEmail: () => void; ready: boolean; modals: ReactNode } {
  const userName = useCurrentUser()?.name ?? null;
  const [open, setOpen] = useState<'capture' | 'email' | null>(null);
  const [pictureEntry, setPictureEntry] = useState<Tagged<PictureState> | null>(null);
  const [copyEntry, setCopyEntry] = useState<Tagged<CopyState> | null>(null);
  const job = useRef<{ board: BoardResponse; promise: Promise<Blob> } | null>(null);

  // A new shift or changed rows make the old picture/copy status stale without any reset effect.
  const picture: PictureState = pictureEntry && pictureEntry.board === board ? pictureEntry.state : IDLE;
  const copy: CopyState = copyEntry && copyEntry.board === board ? copyEntry.state : IDLE;

  // Free the preview's object URL when the picture is replaced or the page unmounts.
  useEffect(() => {
    const s = pictureEntry?.state;
    if (s?.status !== 'ready') return;
    return () => URL.revokeObjectURL(s.url);
  }, [pictureEntry]);

  /** The current board's PNG — cached, in flight, or drawn now. */
  const ensurePicture = useCallback((): Promise<Blob> => {
    if (!board) return Promise.reject(new Error('The board is still loading.'));
    if (job.current?.board === board) return job.current.promise;
    const promise = captureBoardPng({ date: board.date, shift: board.shift, items: board.items, kpi: board.kpi, capturedAt: new Date(), capturedBy: userName });
    job.current = { board, promise };
    setPictureEntry({ board, state: { status: 'capturing' } });
    promise.then(
      (blob) => setPictureEntry({ board, state: { status: 'ready', blob, url: URL.createObjectURL(blob) } }),
      (e: unknown) => {
        if (job.current?.promise === promise) job.current = null; // allow a retry
        setPictureEntry({ board, state: { status: 'error', message: errorText(e) } });
      },
    );
    return promise;
  }, [board, userName]);

  /** Must be called straight from a click: the clipboard write starts now and resolves when the picture is drawn. */
  const copyPicture = useCallback(() => {
    if (!board || !imageClipboardSupport().ok) return;
    setCopyEntry({ board, state: { status: 'copying' } });
    copyPng(ensurePicture()).then(
      () => setCopyEntry({ board, state: { status: 'copied' } }),
      (e: unknown) => setCopyEntry({ board, state: { status: 'error', message: errorText(e) } }),
    );
  }, [board, ensurePicture]);

  const downloadPicture = useCallback(() => {
    ensurePicture().then(
      (blob) => downloadBlob(captureFileName(date, shift), blob),
      (e: unknown) => notify.error(e, 'Could not create the picture'),
    );
  }, [ensurePicture, date, shift]);

  const retry = useCallback(() => {
    job.current = null;
    ensurePicture().catch(() => undefined);
  }, [ensurePicture]);

  const openCapture = useCallback(() => {
    setOpen('capture');
    ensurePicture().catch(() => undefined);
  }, [ensurePicture]);

  const openEmail = useCallback(() => {
    setOpen('email');
    if (imageClipboardSupport().ok) copyPicture();
    else ensurePicture().catch(() => undefined);
  }, [copyPicture, ensurePicture]);

  // Rows changed while a modal is open (someone edited the board) → redraw so the preview stays current.
  const stale = open !== null && !!board && picture.status === 'idle';
  useEffect(() => {
    if (stale) ensurePicture().catch(() => undefined);
  }, [stale, ensurePicture]);

  const close = useCallback(() => setOpen(null), []);

  const modals = (
    <>
      <CaptureModal
        opened={open === 'capture'}
        onClose={close}
        picture={picture}
        copy={copy}
        fileName={captureFileName(date, shift)}
        onCopy={copyPicture}
        onDownload={downloadPicture}
        onEmail={openEmail}
        onRetry={retry}
      />
      {board && (
        <EmailModal
          opened={open === 'email'}
          onClose={close}
          date={date}
          shift={shift}
          board={board}
          picture={picture}
          copy={copy}
          onCopy={copyPicture}
          onDownload={downloadPicture}
          onRetry={retry}
        />
      )}
    </>
  );

  return { openCapture, openEmail, ready: !!board, modals };
}
