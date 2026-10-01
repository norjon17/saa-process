import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().default('postgres://saa:saa@localhost:5432/saa'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(12),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  UPLOAD_DIR: z.string().default('./uploads'),
  LOG_LEVEL: z.string().default('info'),
  NODE_ENV: z.string().default('development'),
});

export type Env = z.infer<typeof schema>;

export const env: Env = schema.parse(process.env);
