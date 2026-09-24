import { serve } from "bun";
import translate from "google-translate-api-x";
import { speak } from "google-translate-api-x";
import index from "./index.html";

type TranslateResult = { text: string; from?: { language?: { iso?: string } } };

// ── CORS ────────────────────────────────────────────────────────────────────
//
// Konfigurasi via environment variables:
//   ALLOWED_ORIGINS  — comma-separated list of allowed origins, atau "*" untuk semua.
//                      Default: "*"
//   ALLOWED_METHODS  — comma-separated HTTP methods. Default: "GET,POST,PUT,OPTIONS"
//   ALLOWED_HEADERS  — comma-separated request headers. Default: "Content-Type,Authorization"
//
// Contoh .env:
//   ALLOWED_ORIGINS=https://myapp.com,https://staging.myapp.com
//   ALLOWED_ORIGINS=*
//
const ALLOWED_ORIGINS: string[] =
  (process.env.ALLOWED_ORIGINS ?? "*")
    .split(",")
    .map(o => o.trim())
    .filter(Boolean);

const ALLOWED_METHODS =
  process.env.ALLOWED_METHODS ?? "GET,POST,PUT,OPTIONS";

const ALLOWED_HEADERS =
  process.env.ALLOWED_HEADERS ?? "Content-Type,Authorization";

/** Hitung nilai Access-Control-Allow-Origin untuk request tertentu */
function getAllowOrigin(req: Request): string {
  // Wildcard — izinkan semua origin
  if (ALLOWED_ORIGINS.length === 1 && ALLOWED_ORIGINS[0] === "*") return "*";

  const origin = req.headers.get("origin") ?? "";
  return ALLOWED_ORIGINS.includes(origin) ? origin : "";
}

/** Kembalikan CORS headers sebagai plain object */
function corsHeaders(req: Request): Record<string, string> {
  const allowOrigin = getAllowOrigin(req);
  if (!allowOrigin) return {};          // origin tidak diizinkan, tidak tambah header

  return {
    "Access-Control-Allow-Origin":  allowOrigin,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    // Expose header agar JS frontend bisa baca header custom jika diperlukan
    "Access-Control-Expose-Headers": "Content-Type",
    // Vary harus ada saat origin tidak wildcard, agar cache tidak bercampur
    ...(allowOrigin !== "*" ? { "Vary": "Origin" } : {}),
  };
}

/** Tambahkan CORS headers ke Response yang sudah ada */
function withCors(req: Request, res: Response): Response {
  const headers = corsHeaders(req);
  if (Object.keys(headers).length === 0) return res;

  const next = new Response(res.body, res);
  for (const [k, v] of Object.entries(headers)) {
    next.headers.set(k, v);
  }
  return next;
}

/** Respon preflight OPTIONS */
function preflight(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(req),
      "Access-Control-Max-Age": "86400",   // cache preflight 24 jam
    },
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Validasi kode bahasa — hanya izinkan karakter aman (huruf, angka, strip, underscore)
function sanitizeLangCode(code: unknown, fallback: string): string {
  if (typeof code !== "string" || !/^[a-zA-Z0-9\-_]+$/.test(code.trim())) {
    return fallback;
  }
  return code.trim();
}

// ── Server ───────────────────────────────────────────────────────────────────

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    // Single: terima satu string, kembalikan satu hasil terjemahan
    "/api/translate": {
      async OPTIONS(req) { return preflight(req); },
      async POST(req) {
        try {
          const body = await req.json() as { text?: string; from?: string; to?: string };
          const text = body?.text?.trim();

          if (!text) {
            return withCors(req, Response.json(
              { error: "Field 'text' wajib diisi." },
              { status: 400 }
            ));
          }

          const from = sanitizeLangCode(body?.from, "id");
          const to   = sanitizeLangCode(body?.to,   "ja");

          const result = await translate(text, { from, to }) as TranslateResult;

          return withCors(req, Response.json({
            original:   text,
            translated: result.text,
            from:       result.from?.language?.iso ?? from,
            to,
          }));
        } catch (err) {
          console.error("Translation error:", err);
          return withCors(req, Response.json(
            { error: "Terjadi kesalahan saat menerjemahkan teks." },
            { status: 500 }
          ));
        }
      },
    },

    // Batch: terima array of strings, kembalikan array hasil terjemahan
    "/api/translate/batch": {
      async OPTIONS(req) { return preflight(req); },
      async POST(req) {
        try {
          const body = await req.json() as { texts?: string[]; from?: string; to?: string };
          const texts = body?.texts;

          if (!Array.isArray(texts) || texts.length === 0) {
            return withCors(req, Response.json(
              { error: "Field 'texts' harus berupa array string yang tidak kosong." },
              { status: 400 }
            ));
          }

          const sanitized = texts
            .map(t => (typeof t === "string" ? t.trim() : ""))
            .filter(Boolean);

          if (sanitized.length === 0) {
            return withCors(req, Response.json(
              { error: "Semua item pada 'texts' kosong." },
              { status: 400 }
            ));
          }

          const from = sanitizeLangCode(body?.from, "id");
          const to   = sanitizeLangCode(body?.to,   "ja");

          const results = await translate(sanitized, { from, to }) as TranslateResult[];

          return withCors(req, Response.json(
            sanitized.map((original, i) => ({
              original,
              translated: results[i]?.text ?? "",
            }))
          ));
        } catch (err) {
          console.error("Batch translation error:", err);
          return withCors(req, Response.json(
            { error: "Terjadi kesalahan saat menerjemahkan batch." },
            { status: 500 }
          ));
        }
      },
    },

    // Map: terima object {key: string}, kembalikan object {key: {original, translated}}
    "/api/translate/map": {
      async OPTIONS(req) { return preflight(req); },
      async POST(req) {
        try {
          const body = await req.json() as { map?: Record<string, string>; from?: string; to?: string };
          const map = body?.map;

          if (!map || typeof map !== "object" || Array.isArray(map)) {
            return withCors(req, Response.json(
              { error: "Field 'map' harus berupa object {key: string}." },
              { status: 400 }
            ));
          }

          const entries = Object.entries(map).filter(
            ([, v]) => typeof v === "string" && v.trim() !== ""
          );

          if (entries.length === 0) {
            return withCors(req, Response.json(
              { error: "Object 'map' tidak memiliki entri yang valid." },
              { status: 400 }
            ));
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

          return withCors(req, Response.json(output));
        } catch (err) {
          console.error("Map translation error:", err);
          return withCors(req, Response.json(
            { error: "Terjadi kesalahan saat menerjemahkan map." },
            { status: 500 }
          ));
        }
      },
    },

    // TTS: terima text + lang, kembalikan Base64 MP3
    "/api/speak": {
      async OPTIONS(req) { return preflight(req); },
      async POST(req) {
        try {
          const body = await req.json() as { text?: string; lang?: string };
          const text = body?.text?.trim();

          if (!text) {
            return withCors(req, Response.json(
              { error: "Field 'text' wajib diisi." },
              { status: 400 }
            ));
          }

          const lang = sanitizeLangCode(body?.lang, "ja");

          const base64mp3 = await speak(text, { to: lang }) as string;

          if (!base64mp3) {
            return withCors(req, Response.json(
              { error: "Google Translate tidak dapat menghasilkan audio untuk teks ini." },
              { status: 422 }
            ));
          }

          return withCors(req, Response.json({ audio: base64mp3, lang }));
        } catch (err) {
          console.error("TTS error:", err);
          return withCors(req, Response.json(
            { error: "Terjadi kesalahan saat menghasilkan audio." },
            { status: 500 }
          ));
        }
      },
    },

    "/api/hello": {
      async GET(req) {
        return withCors(req, Response.json({ message: "Hello, world!", method: "GET" }));
      },
      async PUT(req) {
        return withCors(req, Response.json({ message: "Hello, world!", method: "PUT" }));
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return withCors(req, Response.json({ message: `Hello, ${name}!` }));
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
console.log(`🔒 CORS allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
