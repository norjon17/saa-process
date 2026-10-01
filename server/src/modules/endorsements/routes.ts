import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { and, asc, eq } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { uploadDir } from '../../config/paths.js';
import { schema } from '../../db/index.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { toCsv } from '../../lib/csv.js';
import { idParam, isoDate, shift as shiftSchema } from '../../lib/zod.js';
import { SECTION_KEYS, SECTION_META } from '../../shared/domain.js';
import { boardQuery, createBody, listQuery, noneAllBody, patchBody, summaryQuery } from './schemas.js';
import * as svc from './service.js';

const EXPORT_HEADERS = ['Date', 'Shift', 'Section', 'Category', 'Tool', 'Issue', 'Status', 'Endorse By', 'Endorse To', 'Remarks'];
const exportRow = (e: svc.EndorsementDto) => [
  e.date,
  e.shift,
  SECTION_META[e.sectionKey as keyof typeof SECTION_META]?.name ?? e.sectionKey,
  e.isNone ? 'NONE' : (e.category?.name ?? ''),
  e.isNone ? 'NONE' : (e.tool?.code ?? ''),
  e.issue,
  e.actionStatus,
  e.isNone ? 'NONE' : e.endorseBy.map((p) => p.name).join('/'),
  e.isNone ? 'NONE' : e.endorseTo.map((p) => p.name).join('/'),
  e.isNone ? 'NONE' : e.progress === 'done' ? 'DONE' : e.progress === 'ongoing' ? 'Ongoing' : '-',
];

const SECTION_COLORS: Record<string, string> = { s1: '2E7D32', s2: 'E65100', s3: '1565C0', s4: '6A1B9A', s5: 'C62828', s6: '00695C' };

const routes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', { schema: { querystring: listQuery } }, async (request) => svc.list(app.db, request.query));

  app.get('/board', { schema: { querystring: boardQuery } }, async (request) => svc.board(app.db, request.query.date, request.query.shift));

  app.get('/summary', { schema: { querystring: summaryQuery } }, async (request) => svc.summary(app.db, request.query));

  app.get('/export.csv', { schema: { querystring: listQuery.omit({ page: true, pageSize: true }) } }, async (request, reply) => {
    const rows = await svc.listAll(app.db, request.query);
    reply.header('content-type', 'text/csv; charset=utf-8');
    reply.header('content-disposition', `attachment; filename="SAA_Endorsements_${request.query.from ?? 'all'}_${request.query.to ?? ''}.csv"`);
    return toCsv(EXPORT_HEADERS, rows.map(exportRow));
  });

  app.get('/export.xlsx', { schema: { querystring: listQuery.omit({ page: true, pageSize: true }) } }, async (request, reply) => {
    const rows = await svc.listAll(app.db, { ...request.query, sort: 'date:asc' });
    const wb = new ExcelJS.Workbook();
    wb.creator = 'SAA Process';
    const all = wb.addWorksheet('Endorsement');
    all.addRow(EXPORT_HEADERS).font = { bold: true };
    for (const r of rows) all.addRow(exportRow(r));
    all.columns.forEach((c, i) => (c.width = [12, 7, 16, 22, 9, 40, 60, 14, 14, 10][i] ?? 12));
    for (const key of SECTION_KEYS) {
      const ws = wb.addWorksheet(SECTION_META[key].name.slice(0, 30));
      const header = ws.addRow(EXPORT_HEADERS);
      header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${SECTION_COLORS[key]}` } };
      for (const r of rows.filter((x) => x.sectionKey === key)) ws.addRow(exportRow(r));
      ws.columns.forEach((c, i) => (c.width = [12, 7, 16, 22, 9, 40, 60, 14, 14, 10][i] ?? 12));
    }
    const buf = await wb.xlsx.writeBuffer();
    reply.header('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    reply.header('content-disposition', `attachment; filename="SAA_Endorsements_${request.query.from ?? 'all'}_${request.query.to ?? ''}.xlsx"`);
    return reply.send(Buffer.from(buf));
  });

  app.get('/:id', { schema: { params: idParam } }, async (request) => svc.getOne(app.db, request.params.id));

  app.post('/', { schema: { body: createBody } }, async (request, reply) => {
    const row = await svc.create(app.db, request.body, request.user!.id);
    return reply.status(201).send(row);
  });

  app.post('/none-all', { schema: { body: noneAllBody } }, async (request) =>
    svc.noneAll(app.db, request.body.date, request.body.shift, request.user!.id),
  );

  app.patch('/:id', { schema: { params: idParam, body: patchBody } }, async (request) =>
    svc.patch(app.db, request.params.id, request.body, request.user!.id),
  );

  app.delete('/:id', { schema: { params: idParam } }, async (request) => svc.remove(app.db, [request.params.id]));

  app.post('/delete', { schema: { body: z.object({ ids: z.array(z.number().int()).min(1).max(200) }) } }, async (request) =>
    svc.remove(app.db, request.body.ids),
  );

  // ---- image attachments per section + shift ----
  const attachmentQuery = z.object({ date: isoDate, shift: shiftSchema, sectionKey: z.enum(SECTION_KEYS).optional() });

  app.get('/attachments', { schema: { querystring: attachmentQuery } }, async (request) => {
    const { date, shift, sectionKey } = request.query;
    const rows = await app.db
      .select()
      .from(schema.endorsementAttachments)
      .where(
        and(
          eq(schema.endorsementAttachments.date, date),
          eq(schema.endorsementAttachments.shift, shift),
          sectionKey ? eq(schema.endorsementAttachments.sectionKey, sectionKey) : undefined,
        ),
      )
      .orderBy(asc(schema.endorsementAttachments.id));
    return { items: rows.map((r) => ({ ...r, url: `/api/files/${r.storedPath}` })) };
  });

  app.post('/attachments', async (request, reply) => {
    const fields: Record<string, string> = {};
    const saved: { fileName: string; storedPath: string; mimeType: string; sizeBytes: number }[] = [];
    for await (const part of request.parts()) {
      if (part.type === 'file') {
        const buf = await part.toBuffer();
        if (!part.mimetype.startsWith('image/')) throw badRequest(`${part.filename}: only images are accepted`);
        const ext = path.extname(part.filename || '').toLowerCase() || '.png';
        const date = fields['date'] ?? 'undated';
        const rel = path.posix.join('attachments', date, `${randomUUID()}${ext}`);
        await mkdir(path.join(uploadDir, path.dirname(rel)), { recursive: true });
        await writeFile(path.join(uploadDir, rel), buf);
        saved.push({ fileName: part.filename, storedPath: rel, mimeType: part.mimetype, sizeBytes: buf.length });
      } else {
        fields[part.fieldname] = String(part.value);
      }
    }
    const meta = attachmentQuery.required().parse(fields);
    if (!saved.length) throw badRequest('no image files in request');
    const rows = await app.db
      .insert(schema.endorsementAttachments)
      .values(saved.map((s) => ({ ...s, date: meta.date, shift: meta.shift, sectionKey: meta.sectionKey, uploadedBy: request.user!.id })))
      .returning();
    return reply.status(201).send({ items: rows.map((r) => ({ ...r, url: `/api/files/${r.storedPath}` })) });
  });

  app.delete('/attachments/:id', { schema: { params: idParam } }, async (request) => {
    const [row] = await app.db.select().from(schema.endorsementAttachments).where(eq(schema.endorsementAttachments.id, request.params.id)).limit(1);
    if (!row) throw notFound('attachment');
    if (request.user!.role !== 'admin' && row.uploadedBy !== request.user!.id) throw forbidden('only the uploader or an admin can delete');
    await app.db.delete(schema.endorsementAttachments).where(eq(schema.endorsementAttachments.id, row.id));
    await unlink(path.join(uploadDir, row.storedPath)).catch(() => undefined);
    return { ok: true };
  });
};

export default routes;
