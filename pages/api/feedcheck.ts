import type { NextApiRequest, NextApiResponse } from 'next';

// Lightweight server-side feed fetcher for diagnostics.
// Usage: GET /api/feedcheck?url=<encoded-url>
// NOTE: deliberately strict to avoid SSRF: only allow news.google.com RSS URLs.

const ALLOWED_HOST = 'news.google.com';
const DEFAULT_TIMEOUT_MS = 10000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { url } = req.query as { url?: string };
    if (!url) return res.status(400).json({ ok: false, error: 'Missing url query parameter' });

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch (err) {
      return res.status(400).json({ ok: false, error: 'Invalid URL' });
    }

    if (!/^https?:$/.test(parsed.protocol)) {
      return res.status(400).json({ ok: false, error: 'Only http(s) URLs are supported' });
    }

    if (parsed.hostname !== ALLOWED_HOST) {
      return res.status(403).json({ ok: false, error: `Host not allowed for safety (only ${ALLOWED_HOST})` });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    // Use a browser-like UA to mimic the behaviour from the app changes
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36',
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9'
    } as Record<string, string>;

    let fetchResp: Response;
    try {
      fetchResp = await fetch(parsed.toString(), { method: 'GET', headers, signal: controller.signal });
    } catch (err: any) {
      clearTimeout(timeout);
      const msg = err?.name === 'AbortError' ? 'Request timed out' : String(err?.message || err);
      return res.status(502).json({ ok: false, error: 'Fetch failed', details: msg });
    }

    clearTimeout(timeout);

    const contentType = fetchResp.headers.get('content-type') || '';
    let snippet = '';
    try {
      // Only read a small amount to avoid buffering large responses
      const txt = await fetchResp.text();
      snippet = txt.slice(0, 2000);
    } catch (err) {
      snippet = '';
    }

    const headersObj: Record<string, string> = {};
    fetchResp.headers.forEach((v, k) => { headersObj[k] = v; });

    return res.status(200).json({
      ok: true,
      url: parsed.toString(),
      status: fetchResp.status,
      statusText: fetchResp.statusText,
      redirected: fetchResp.redirected,
      contentType,
      headers: headersObj,
      snippet
    });

  } catch (err: any) {
    return res.status(500).json({ ok: false, error: 'Server error', details: String(err?.message || err) });
  }
}
