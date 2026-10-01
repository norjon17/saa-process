import { memo, useState } from 'react';

import { Lightbox } from '@/components/ui/Lightbox';
import type { Attachment } from '@/lib/api/types';

import classes from '../endorsement.module.css';

export interface AttachmentStripProps {
  items: Attachment[];
  onDelete?: (attachment: Attachment) => void;
}

/** "Attached Images" area under a section: full-width images, ✕ on hover, click to open the lightbox. */
export const AttachmentStrip = memo(function AttachmentStrip({ items, onDelete }: AttachmentStripProps) {
  const [index, setIndex] = useState<number | null>(null);
  if (!items.length) return null;
  return (
    <div className={classes.attachArea}>
      <div className={classes.attachTitle}>Attached Images</div>
      <div className={classes.attachStrip}>
        {items.map((a, i) => (
          <div key={a.id} className={classes.imgBlock}>
            <button type="button" className={classes.imgWrap} onClick={() => setIndex(i)} aria-label={`Open ${a.fileName}`}>
              <img src={a.url} alt={a.fileName} loading="lazy" decoding="async" />
            </button>
            {onDelete && (
              <button type="button" className={`${classes.imgDel} saa-no-print`} aria-label={`Delete ${a.fileName}`} title="Delete image" onClick={() => onDelete(a)}>
                ✕
              </button>
            )}
            <div className={classes.imgCaption}>{a.fileName}</div>
          </div>
        ))}
      </div>
      {index !== null && <Lightbox images={items.map((a) => a.url)} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />}
    </div>
  );
});
