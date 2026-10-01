import { notifications } from '@mantine/notifications';

import { ApiError } from './api/client';

let lastAutosave = 0;

export const notify = {
  success: (message: string, title?: string) => notifications.show({ color: 'teal', title, message, autoClose: 2500 }),
  info: (message: string, title?: string) => notifications.show({ color: 'brand', title, message, autoClose: 3000 }),
  error: (error: unknown, title = 'Something went wrong') => {
    const message =
      error instanceof ApiError
        ? error.problems?.length
          ? error.problems.join('\n')
          : error.message
        : error instanceof Error
          ? error.message
          : String(error);
    notifications.show({ color: 'red', title, message, autoClose: 6000 });
  },
  /** Throttled "✔ Auto-saved" toast (the original dashboard's behaviour). */
  autosaved: () => {
    const now = Date.now();
    if (now - lastAutosave < 3000) return;
    lastAutosave = now;
    notifications.show({ id: 'autosave', message: '✔ Auto-saved', color: 'teal', autoClose: 1800, withCloseButton: false });
  },
};
