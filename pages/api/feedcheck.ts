import type { NextApiRequest, NextApiResponse } from 'next';

// Feed check endpoint disabled for Google News. Google News RSS fetching was
// removed from the application because it produced fragile behavior and
// frequent timeouts/aborts. If you need to debug a specific publisher feed,
// use the public fallback publisher URLs or test the feed directly.

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(400).json({ ok: false, error: 'Feed check for Google News is disabled in this deployment.' });
}
