import { fileURLToPath, URL } from 'node:url';

import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/** npm package name of a module id ("@scope/name" or "name"; POSIX or Windows paths), or null for app code. */
function packageOf(id: string): string | null {
  const parts = id.split(/[\\/]/);
  const i = parts.lastIndexOf('node_modules');
  if (i < 0) return null;
  const first = parts[i + 1] ?? '';
  return first.startsWith('@') ? `${first}/${parts[i + 2] ?? ''}` : first;
}

/**
 * `codeSplitting` group test: a JS module of a package whose full name matches `pattern`. Stylesheets are left out
 * on purpose — `main.tsx` imports `@mantine/charts/styles.css`, which would otherwise make the entry import the charts chunk.
 */
const packages = (pattern: RegExp) => (id: string) => {
  if (/\.css($|\?)/.test(id)) return false;
  const pkg = packageOf(id);
  return pkg !== null && pattern.test(pkg);
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('..', import.meta.url)), '');
  const apiTarget = env['VITE_API_PROXY_TARGET'] ?? 'http://localhost:3000';
  return {
    plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true, routesDirectory: './src/routes', generatedRouteTree: './src/routeTree.gen.ts' }), react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('../server/src/shared', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: false },
      },
    },
    build: {
      target: 'es2023',
      sourcemap: true,
      rolldownOptions: {
        output: {
          // Stable vendor chunks: an app deploy doesn't invalidate the large, rarely changing library code in browser
          // caches. Higher-priority groups claim modules first, so deps shared with the eager groups stay out of the
          // charts chunk — recharts is only fetched by the lazily loaded chart components.
          codeSplitting: {
            groups: [
              { name: 'react', test: packages(/^(react|react-dom|scheduler|react-is|use-sync-external-store)$/), priority: 50 },
              { name: 'mantine', test: packages(/^(@mantine\/(core|hooks|store)|@floating-ui\/.+|clsx)$/), priority: 40 },
              { name: 'tanstack', test: packages(/^@tanstack\/(react-router|router-core|history|react-query|query-core|react-store|store)$/), priority: 30 },
              { name: 'tanstack-table', test: packages(/^@tanstack\/(react-table|table-core|react-virtual|virtual-core)$/), priority: 25 },
              { name: 'zod', test: packages(/^zod$/), priority: 20 },
              {
                name: 'charts',
                test: packages(/^(@mantine\/charts|recharts|victory-vendor|d3-.+|internmap|decimal\.js-light|@reduxjs\/toolkit|react-redux|redux|redux-thunk|immer|reselect|es-toolkit|eventemitter3|tiny-invariant)$/),
                priority: 10,
              },
            ],
          },
        },
      },
    },
  };
});
