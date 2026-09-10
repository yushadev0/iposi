import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { attachUser } from './auth.js';
import { config } from './config.js';
import { getPool } from './db.js';
import { authRouter } from './routes/auth.js';
import { historyRouter } from './routes/history.js';
import { requestRouter } from './routes/request.js';

const app = express();
app.set('trust proxy', 1); // behind nginx

app.use(
  cors({
    origin: config.isProd ? (config.cors.origins.length ? config.cors.origins : false) : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(attachUser);

app.get('/api/health', async (_req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/history', historyRouter);
app.use('/api/request', requestRouter);

// 404 for anything else under the API
app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[iposi] API listening on :${config.port} (${config.isProd ? 'prod' : 'dev'})`);
  // Warm the pool so the first real request is fast; don't crash if DB is down yet.
  getPool().catch((err) => console.error('[db] initial connect failed', err.message));
});
