import type { NextApiRequest, NextApiResponse } from "next";

const BOT_INTERNAL_URL =
  process.env.BOT_INTERNAL_URL || "http://localhost:3030";
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const headers: any = {};
    if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;

    const r = await fetch(`${BOT_INTERNAL_URL}/internal/stats`, { headers });
    if (!r.ok) {
      console.error("/api/stats/global proxy error", r.statusText);
      res.status(502).json({ error: "Failed to fetch stats from bot" });
      return;
    }

    const stats = await r.json();
    res.status(200).json(stats);
  } catch (err) {
    console.error("/api/stats/global error:", err);
    res.status(500).json({ error: "Failed to fetch global stats" });
  }
}
