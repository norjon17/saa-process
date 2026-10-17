import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { constants as zlibConstants } from 'node:zlib';

import compress from '@fastify/compress';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';

import { env } from './config/env.js';
import { uploadDir } from './config/paths.js';
import type { Db } from './db/index.js';
import auditLogsRoutes from './modules/audit-logs/routes.js';
import authRoutes from './modules/auth/routes.js';
import categoriesRoutes from './modules/categories/routes.js';
import contactChipRoutes from './modules/contact-chip/routes.js';
import endorsementsRoutes from './modules/endorsements/routes.js';
import healthRoutes from './modules/health/routes.js';
import meancheckDailyRoutes from './modules/meancheck-daily/routes.js';
import meancheckRoutes from './modules/meancheck/routes.js';
import modelsRoutes from './modules/models/routes.js';
import pmStatusRoutes from './modules/pm-status/routes.js';
import toolsRoutes from './modules/tools/routes.js';
import usersRoutes from './modules/users/routes.js';
import authPlugin from './plugins/auth.js';
import dbPlugin from './plugins/db.js';
import errorsPlugin from './plugins/errors.js';

export interface BuildAppOptions {
  db?: Db;
  logger?: boolean;
}

export { uploadDir };

export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger === false ? false : { level: env.LOG_LEVEL },
    trustProxy: true,
    bodyLimit: 5 * 1024 * 1024,
  }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(sensible);
  // Compress every compressible reply ≥ 1 KB (JSON, CSV, JS/CSS); brotli at a moderate level so dynamic responses stay fast.
  await app.register(compress, {
    global: true,
    threshold: 1024,
    encodings: ['br', 'gzip'],
    brotliOptions: { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 } },
    globalDecompression: false,
  });
  await app.register(cors, { origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()), credentials: true });
  await app.register(rateLimit, { global: false });
  await app.register(multipart, { limits: { files: 12, fileSize: 15 * 1024 * 1024 } });
  await app.register(dbPlugin, opts.db ? { db: opts.db } : {});
  await app.register(authPlugin);
  await app.register(errorsPlugin);

  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  await app.register(fastifyStatic, { root: uploadDir, prefix: '/api/files/', decorateReply: false, index: false });

  await app.register(healthRoutes, { prefix: '/api/health' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(toolsRoutes, { prefix: '/api' });
  await app.register(modelsRoutes, { prefix: '/api/models' });
  await app.register(categoriesRoutes, { prefix: '/api/endorsement-categories' });
  await app.register(auditLogsRoutes, { prefix: '/api/audit-logs' });
  await app.register(endorsementsRoutes, { prefix: '/api/endorsements' });
  await app.register(meancheckRoutes, { prefix: '/api/meancheck' });
  await app.register(meancheckDailyRoutes, { prefix: '/api/meancheck/daily' });
  await app.register(pmStatusRoutes, { prefix: '/api/pm-status' });
  await app.register(contactChipRoutes, { prefix: '/api/contact-chip' });

  // Serve the built client (same origin → simple cookies) when it exists; SPA fallback for non-API GETs.
  const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
  const hasClient = existsSync(clientDist);
  if (hasClient) {
    await app.register(fastifyStatic, {
      root: clientDist,
      prefix: '/',
      decorateReply: true,
      // wildcard (default): files are resolved on each request, so a rebuild of client/dist is picked up without a
      // restart. With wildcard:false the file list is snapshotted at startup and new hashed assets 404 → index.html.
      wildcard: true,
      // Vite emits content-hashed files under /assets → cache forever; index.html must always revalidate.
      setHeaders: (reply, filePath) => {
        const rel = path.relative(clientDist, filePath).split(path.sep).join('/');
        if (rel.startsWith('assets/')) reply.header('cache-control', 'public, max-age=31536000, immutable');
        else if (rel === 'index.html') reply.header('cache-control', 'no-cache');
      },
    });
  }
  app.setNotFoundHandler((request, reply) => {
    // Missing hashed assets must 404 (serving index.html for a .js URL breaks module loading with a MIME error).
    const isAsset = request.url.startsWith('/assets/');
    if (hasClient && request.method === 'GET' && !request.url.startsWith('/api/') && !isAsset) return reply.sendFile('index.html');
    return reply.status(404).send({ error: 'NOT_FOUND', message: `route ${request.method} ${request.url} not found` });
  });

  return app;
}
