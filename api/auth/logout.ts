import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearCookie } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  clearCookie(res, 'userId');
  res.json({ success: true });
}
