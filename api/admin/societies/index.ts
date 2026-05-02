import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from '../../_lib/db';
import { requireAdmin } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  await initDb();

  if (req.method === 'POST') {
    const { name, description, category, established_year, contact_email, vision } = req.body;
    const id = Math.random().toString(36).substring(2, 11);
    await db.prepare('INSERT INTO societies (id, name, description, category, established_year, contact_email, vision) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, name, description, category, established_year || null, contact_email, vision);
    return res.json({ success: true, id });
  }

  if (req.method === 'DELETE') {
    await db.prepare('DELETE FROM societies WHERE id = ?').run(req.query.id);
    return res.json({ success: true });
  }

  res.status(405).end();
}
