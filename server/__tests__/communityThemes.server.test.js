import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock the DB pool
vi.mock('../../server/db/pool.js', () => {
  return { pool: { query: vi.fn() } };
});

import communityThemesRouter from '../routes/communityThemes.js';
import { pool } from '../../server/db/pool.js';

describe('communityThemes routes', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  it('GET returns null when no theme found', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const app = express();
    app.use('/api/community-themes', communityThemesRouter);
    const res = await request(app).get('/api/community-themes/1');
    expect(res.status).toBe(200);
    expect(res.body.theme).toBeNull();
  });

  it('GET returns theme when DB returns row', async () => {
    const theme = { name: 't1', vars: { '--color-bg': '#000' } };
    pool.query.mockResolvedValue({ rows: [{ data: theme }] });
    const app = express();
    app.use('/api/community-themes', communityThemesRouter);
    const res = await request(app).get('/api/community-themes/2');
    expect(res.status).toBe(200);
    expect(res.body.theme).toEqual(theme);
  });

  it('POST upserts theme and returns saved theme', async () => {
    const payload = { theme: { name: 't2', vars: { '--color-bg': '#111' } } };
    pool.query.mockResolvedValue({ rows: [{ data: payload.theme }] });
    const app = express();
    app.use(express.json());
    app.use('/api/community-themes', communityThemesRouter);
    const res = await request(app).post('/api/community-themes/3').send(payload);
    expect(res.status).toBe(200);
    expect(res.body.theme).toEqual(payload.theme);
  });
});
