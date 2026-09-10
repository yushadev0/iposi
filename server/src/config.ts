import 'dotenv/config';

function bool(v: string | undefined, def: boolean): boolean {
  if (v === undefined || v === '') return def;
  return v === '1' || v.toLowerCase() === 'true';
}

function int(v: string | undefined, def: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
}

export const config = {
  port: int(process.env.PORT, 3001),
  isProd: process.env.NODE_ENV === 'production',

  db: {
    server: process.env.DB_SERVER ?? '127.0.0.1',
    instance: process.env.DB_INSTANCE || undefined,
    port: process.env.DB_PORT ? int(process.env.DB_PORT, 1433) : undefined,
    user: process.env.DB_USER ?? '',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'iposi',
    encrypt: bool(process.env.DB_ENCRYPT, false),
    trustServerCertificate: bool(process.env.DB_TRUST_SERVER_CERT, true),
  },

  auth: {
    secret: process.env.SESSION_SECRET ?? 'insecure-dev-secret',
    cookieSecure: bool(process.env.COOKIE_SECURE, true),
    cookieSameSite: (process.env.COOKIE_SAMESITE ?? 'lax') as 'lax' | 'strict' | 'none',
    sessionCookie: 'iposi_session',
    rememberCookie: 'iposi_remember',
    sessionMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
    rememberMaxAgeMs: 30 * 24 * 60 * 60 * 1000,
  },

  cors: {
    origins: (process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },

  proxy: {
    timeoutMs: int(process.env.PROXY_TIMEOUT_MS, 15000),
    maxBytes: int(process.env.PROXY_MAX_BYTES, 10 * 1024 * 1024),
  },
};
