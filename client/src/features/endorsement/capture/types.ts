export type PictureState = { status: 'idle' } | { status: 'capturing' } | { status: 'ready'; blob: Blob; url: string } | { status: 'error'; message: string };
export type CopyState = { status: 'idle' } | { status: 'copying' } | { status: 'copied' } | { status: 'error'; message: string };
