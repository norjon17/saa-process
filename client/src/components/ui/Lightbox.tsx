import { useEffect, useRef, type PointerEvent } from 'react';

import classes from './ui.module.css';

export interface LightboxProps {
  images: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}

/** Horizontal travel (px) that counts as a swipe to the previous / next image. */
const SWIPE_PX = 50;

/**
 * Full-screen image viewer: Esc / ← / → on keyboards, swipe left/right on touch screens, tap the backdrop to close.
 * On phones the prev/next buttons sit in a bottom bar.
 */
export function Lightbox({ images, index, onIndex, onClose }: LightboxProps) {
  const count = images.length;
  const prev = () => onIndex((index - 1 + count) % count);
  const next = () => onIndex((index + 1) % count);
  const start = useRef<{ x: number; y: number } | null>(null);
  // A swipe ends with a click on whatever is under the finger — it must not close the viewer.
  const swiped = useRef(false);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onIndex((index - 1 + count) % count);
      if (e.key === 'ArrowRight') onIndex((index + 1) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, index, onClose, onIndex]);

  // Keep the page behind from scrolling while the viewer is open; focus the close button for keyboard users.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!count) return null;

  const onPointerDown = (e: PointerEvent) => {
    swiped.current = false;
    start.current = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || count < 2) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    swiped.current = true;
    if (dx < 0) next();
    else prev();
  };

  return (
    <div
      className={classes.lightbox}
      onClick={() => {
        if (swiped.current) swiped.current = false;
        else onClose();
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (start.current = null)}
      role="dialog"
      aria-modal="true"
      aria-label={count > 1 ? `Image ${index + 1} of ${count}` : 'Image'}
    >
      <img className={classes.lightboxImg} src={images[index]} alt={`Attachment ${index + 1}`} draggable={false} onClick={(e) => e.stopPropagation()} />
      <button ref={closeBtn} type="button" className={`${classes.lightboxBtn} ${classes.lightboxClose}`} onClick={onClose} aria-label="Close">
        ✕
      </button>
      {count > 1 && (
        <>
          <button
            type="button"
            className={`${classes.lightboxBtn} ${classes.lightboxPrev}`}
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Previous"
          >
            ←
          </button>
          <button
            type="button"
            className={`${classes.lightboxBtn} ${classes.lightboxNext}`}
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Next"
          >
            →
          </button>
          <div className={classes.lightboxCounter}>
            {index + 1} / {count}
          </div>
        </>
      )}
    </div>
  );
}
