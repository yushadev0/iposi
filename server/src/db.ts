import sql from 'mssql';
import { config } from './config.js';

/**
 * Single shared connection pool to the existing MSSQL "iposi" database.
 * Schema is unchanged from the Delphi/uniGUI app:
 *   users(id, username, email, passwordHash)
 *   user_tokens(id, user_id, selector, token_hash, expiry_date)
 *   api_history(id, user_id, tab_name, method, url, body_type, raw_type,
 *               req_body, req_params, req_headers, req_urlencoded, status_code, created_at)
 */

const poolConfig: sql.config = {
  server: config.db.server,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  options: {
    encrypt: config.db.encrypt,
    trustServerCertificate: config.db.trustServerCertificate,
    ...(config.db.instance ? { instanceName: config.db.instance } : {}),
  },
  ...(config.db.port ? { port: config.db.port } : {}),
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  connectionTimeout: 15000,
  requestTimeout: 20000,
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  if (poolPromise) return poolPromise;

  const p = new sql.ConnectionPool(poolConfig)
    .connect()
    .then((pool: sql.ConnectionPool) => {
      // eslint-disable-next-line no-console
      console.log(`[db] connected to ${config.db.server} / ${config.db.database}`);
      pool.on('error', (err: unknown) => console.error('[db] pool error', err));
      return pool;
    })
    .catch((err: unknown) => {
      poolPromise = null;
      throw err;
    });

  poolPromise = p;
  return p;
}

export { sql };
