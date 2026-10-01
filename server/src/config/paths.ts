import path from 'node:path';

import { env } from './env.js';

/** Absolute directory for uploaded files (attachments, meancheck CSVs). Kept out of app.ts to avoid import cycles. */
export const uploadDir = path.resolve(env.UPLOAD_DIR);
