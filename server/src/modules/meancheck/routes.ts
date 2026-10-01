import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';

import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { uploadDir } from '../../config/paths.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { dateRange, idParam, pagination } from '../../lib/zod.js';
import type { InputFile } from '../../shared/meancheck/index.js';
import * as svc from './service.js';

async function readUploadedFiles(request: FastifyRequest): Promise<InputFile[]> {
  const files: InputFile[] = [];
  for await (const part of request.parts()) {
    if (part.type === 'file') {
      const buf = await part.toBuffer();
      files.push({ filename: part.filename || 'file.csv', text: buf.toString('latin1') });
    }
  }
  if (!files.length) throw badRequest('upload the three lot CSV files');
  return files;
}

const listQuery = pagination.merge(dateRange).extend({
  toolId: z.coerce.number().int().optional(),
  regionId: z.coerce.number().int().optional(),
  verdict: z.enum(['passed', 'failed']).optional(),
  model: z.string().max(3).optional(),
  q: z.string().trim().max(40).optional(),
});

const routes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.post('/evaluate', async (request) => {
    const files = await readUploadedFiles(request);
    const run = await svc.evaluate(app.db, files);
    return { ...run, files: files.map((f) => f.filename) };
  });

  app.post('/lots', { schema: { querystring: z.object({ replace: z.enum(['true', 'false']).default('false') }) } }, async (request, reply) => {
    const files = await readUploadedFiles(request);
    const run = await svc.evaluate(app.db, files);
    const replace = request.query.replace === 'true';
    const lot = await svc.persist(app.db, run, files, { uploadDir, uploadedBy: request.user!.id, replace });
    return reply.status(201).send(lot);
  });

  app.get('/lots', { schema: { querystring: listQuery } }, async (request) => svc.listLots(app.db, request.query));

  app.get('/tool-status', async () => svc.toolStatus(app.db));

  app.get('/lots/:id', { schema: { params: idParam } }, async (request) => svc.getLot(app.db, request.params.id));

  app.get('/lots/:id/files/:name', { schema: { params: idParam.extend({ name: z.string().max(200) }) } }, async (request, reply) => {
    const lot = await svc.getLot(app.db, request.params.id);
    const stored = (lot.files as { stored?: Record<string, string> }).stored ?? {};
    const rel = stored[request.params.name];
    if (!rel) throw notFound('file');
    const abs = path.join(uploadDir, rel);
    if (!existsSync(abs)) throw notFound('file on disk');
    reply.header('content-type', 'text/csv');
    reply.header('content-disposition', `attachment; filename="${request.params.name}"`);
    return reply.send(createReadStream(abs));
  });

  app.delete('/lots/:id', { preHandler: app.requireRole('admin', 'ee'), schema: { params: idParam } }, async (request) =>
    svc.removeLot(app.db, request.params.id),
  );
};

export default routes;
