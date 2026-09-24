import type { VercelRequest, VercelResponse } from "@vercel/node";
import { speak } from "google-translate-api-x";
import { applyCors, handlePreflight, sanitizeLangCode } from "./_cors";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handlePreflight(req, res)) return;
  applyCors(req, res);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const body = req.body as { text?: string; lang?: string };
    const text = body?.text?.trim();

    if (!text) {
      return res.status(400).json({ error: "Field 'text' wajib diisi." });
    }

    const lang = sanitizeLangCode(body?.lang, "ja");

    const base64mp3 = await speak(text, { to: lang }) as string;

    if (!base64mp3) {
      return res.status(422).json({
        error: "Google Translate tidak dapat menghasilkan audio untuk teks ini.",
      });
    }

    return res.status(200).json({ audio: base64mp3, lang });
  } catch (err) {
    console.error("TTS error:", err);
    return res.status(500).json({ error: "Terjadi kesalahan saat menghasilkan audio." });
  }
}
