import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, initDb } from './_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await initDb();
  const venues = await db.prepare('SELECT * FROM venues').all();
  res.json(venues);
}
