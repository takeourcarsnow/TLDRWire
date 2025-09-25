// Next.js API Route: Health check
// Returns whether the GEMINI_API_KEY is configured and the model name

import { NextApiRequest, NextApiResponse } from 'next';

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

interface HealthResponse {
  ok: boolean;
  model: string;
  hasKey: boolean;
  error?: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  try {
    res.status(200).json({ 
      ok: true, 
      model: GEMINI_MODEL, 
      hasKey: Boolean(process.env.GEMINI_API_KEY) 
    });
  } catch (err: any) {
    res.status(500).json({ 
      ok: false, 
      model: GEMINI_MODEL,
      hasKey: false,
      error: "Health check failed", 
      details: err.message 
    });
  }
}