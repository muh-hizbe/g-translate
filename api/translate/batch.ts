import type { VercelRequest, VercelResponse } from "@vercel/node";
import translate from "google-translate-api-x";
import { applyCors, handlePreflight, sanitizeLangCode } from "../_cors";

type TranslateResult = { text: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handlePreflight(req, res)) return;
  applyCors(req, res);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const body = req.body as { texts?: string[]; from?: string; to?: string };
    const texts = body?.texts;

    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        error: "Field 'texts' harus berupa array string yang tidak kosong.",
      });
    }

    const sanitized = texts
      .map(t => (typeof t === "string" ? t.trim() : ""))
      .filter(Boolean);

    if (sanitized.length === 0) {
      return res.status(400).json({ error: "Semua item pada 'texts' kosong." });
    }

    const from = sanitizeLangCode(body?.from, "id");
    const to   = sanitizeLangCode(body?.to,   "ja");

    const results = await translate(sanitized, { from, to }) as TranslateResult[];

    return res.status(200).json(
      sanitized.map((original, i) => ({
        original,
        translated: results[i]?.text ?? "",
      }))
    );
  } catch (err) {
    console.error("Batch translation error:", err);
    return res.status(500).json({ error: "Terjadi kesalahan saat menerjemahkan batch." });
  }
}
