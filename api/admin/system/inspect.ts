import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../../_lib/db';
import { requireAdmin } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  await initDb();
  try {
    const tables = await db.prepare("SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public'").all();
    const result: any = {};
    for (const table of tables) {
      result[table.name] = await db.prepare(`SELECT * FROM ${table.name}`).all();
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
