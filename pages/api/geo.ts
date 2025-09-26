import type { NextApiRequest, NextApiResponse } from 'next';

// Minimal geo lookup: prefer edge-provided headers, fall back to a lightweight public service.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check common CDN headers that contain country code
    const headers = req.headers;
    const headerCandidates = [
      'x-vercel-ip-country',
      'x-now-country',
      'x-nf-client-country',
      'x-country',
      'x-edge-country'
    ];

    let country = '';
    for (const h of headerCandidates) {
      const val = (headers as any)[h];
      if (val && typeof val === 'string' && val.trim()) { country = val.trim().toUpperCase(); break; }
    }

    // If no header, try a public IP geolocation service (rate-limited, fallback friendly)
    if (!country) {
      try {
        const resp = await fetch('https://ipapi.co/json/');
        if (resp.ok) {
          const j = await resp.json();
          if (j && j.country_code) country = String(j.country_code).toUpperCase();
        }
      } catch (e) {
        // network error or blocked in local dev; leave country empty
      }
    }

    // Map common country codes to region keys used by the app
    const map: Record<string, { regionKey: string; language: string }> = {
      'LT': { regionKey: 'lithuania', language: 'lt' },
      'FR': { regionKey: 'france', language: 'fr' },
      'DE': { regionKey: 'germany', language: 'de' },
      'ES': { regionKey: 'spain', language: 'es' },
      'IT': { regionKey: 'italy', language: 'it' },
      'US': { regionKey: 'global', language: 'en' },
      'GB': { regionKey: 'global', language: 'en' }
    };

    const info = map[country] || { regionKey: 'global', language: 'en' };
    res.status(200).json({ country: country || null, regionKey: info.regionKey, language: info.language });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
