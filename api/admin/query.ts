import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../_lib/db';
import { requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const user = await requireAdmin(req, res);
  if (!user) return;
  await initDb();
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'No query provided' });
  try {
    const result = await db.prepare(query).all();
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
