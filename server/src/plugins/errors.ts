import fp from 'fastify-plugin';
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from 'fastify-type-provider-zod';

import { AppError } from '../lib/errors.js';
import { MeancheckInputError } from '../shared/meancheck/index.js';

interface PgError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
}

export default fp(async (app) => {
  app.setErrorHandler((error: unknown, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        error: 'VALIDATION',
        message: 'request validation failed',
        issues: error.validation.map((v) => ({ path: v.instancePath, message: v.message, keyword: v.keyword })),
      });
    }
    if (isResponseSerializationError(error)) {
      request.log.error(error, 'response serialization failed');
      return reply.status(500).send({ error: 'SERIALIZATION', message: error.message });
    }
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.code, message: error.message, details: error.details });
    }
    if (error instanceof MeancheckInputError) {
      return reply.status(422).send({ error: 'MEANCHECK_INPUT', message: error.message, problems: error.problems });
    }
    const err = error as PgError & { statusCode?: number; validation?: unknown };
    // drizzle wraps pg errors as DrizzleQueryError with `cause`
    const cause = (err as { cause?: PgError }).cause;
    const pgCode = err.code ?? cause?.code;
    if (pgCode === '23505') {
      return reply.status(409).send({ error: 'CONFLICT', message: 'duplicate value', constraint: err.constraint ?? cause?.constraint });
    }
    if (pgCode === '23503') {
      return reply.status(422).send({ error: 'FK_VIOLATION', message: 'referenced record does not exist', detail: err.detail ?? cause?.detail });
    }
    if (pgCode === '23514') {
      return reply.status(422).send({ error: 'CHECK_VIOLATION', message: err.message, constraint: err.constraint ?? cause?.constraint });
    }
    if (typeof err.statusCode === 'number' && err.statusCode < 500) {
      return reply.status(err.statusCode).send({ error: err.name ?? 'ERROR', message: err.message });
    }
    request.log.error(error, 'unhandled error');
    return reply.status(500).send({ error: 'INTERNAL', message: 'internal server error' });
  });

});
