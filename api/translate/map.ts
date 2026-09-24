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
    const body = req.body as { map?: Record<string, string>; from?: string; to?: string };
    const map = body?.map;

    if (!map || typeof map !== "object" || Array.isArray(map)) {
      return res.status(400).json({
        error: "Field 'map' harus berupa object {key: string}.",
      });
    }

    const entries = Object.entries(map).filter(
      ([, v]) => typeof v === "string" && v.trim() !== ""
    );

    if (entries.length === 0) {
      return res.status(400).json({
        error: "Object 'map' tidak memiliki entri yang valid.",
      });
    }

    const from = sanitizeLangCode(body?.from, "id");
    const to   = sanitizeLangCode(body?.to,   "ja");

    const inputObj: Record<string, string> = Object.fromEntries(
      entries.map(([k, v]) => [k, v.trim()])
    );

    const results = await translate(inputObj, { from, to }) as Record<string, TranslateResult>;

    const output: Record<string, { original: string; translated: string }> = {};
    for (const [key, original] of entries) {
      output[key] = {
        original,
        translated: results[key]?.text ?? "",
      };
    }

    return res.status(200).json(output);
  } catch (err) {
    console.error("Map translation error:", err);
    return res.status(500).json({ error: "Terjadi kesalahan saat menerjemahkan map." });
  }
}
