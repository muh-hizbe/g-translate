import type { VercelRequest, VercelResponse } from "@vercel/node";
import translate from "google-translate-api-x";
import { applyCors, handlePreflight, sanitizeLangCode } from "./_cors";

type TranslateResult = { text: string; from?: { language?: { iso?: string } } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handlePreflight(req, res)) return;
  applyCors(req, res);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const body = req.body as { text?: string; from?: string; to?: string };
    const text = body?.text?.trim();

    if (!text) {
      return res.status(400).json({ error: "Field 'text' wajib diisi." });
    }

    const from = sanitizeLangCode(body?.from, "id");
    const to   = sanitizeLangCode(body?.to,   "ja");

    const result = await translate(text, { from, to }) as TranslateResult;

    return res.status(200).json({
      original:   text,
      translated: result.text,
      from:       result.from?.language?.iso ?? from,
      to,
    });
  } catch (err) {
    console.error("Translation error:", err);
    return res.status(500).json({ error: "Terjadi kesalahan saat menerjemahkan teks." });
  }
}
