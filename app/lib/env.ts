import 'server-only';

import { z } from 'zod';

const schema = z.object({
  APP_BASE_URL: z.url(),
  API_BASE_URL: z.url(),
  API_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  AUTH0_DOMAIN: z.string().min(1),
  AUTH0_CLIENT_ID: z.string().min(1),
  AUTH0_CLIENT_SECRET: z.string().min(1),
  AUTH0_SECRET: z.string().min(1),
  AUTH0_AUDIENCE: z.string().min(1),
});

export type Env = z.infer<typeof schema>;

/**
 * Validates the server environment. The error names every missing or invalid variable and never
 * includes a value, so a misconfigured pod fails at startup without leaking a secret to the log.
 */
export function loadEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (result.success) {
    return result.data;
  }
  const names = [
    ...new Set(result.error.issues.map((issue) => String(issue.path[0]))),
  ];
  throw new Error(
    `Invalid or missing environment variables: ${names.join(', ')}`,
  );
}

export const env = loadEnv(process.env);
