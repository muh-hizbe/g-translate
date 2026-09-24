import type { VercelRequest, VercelResponse } from "@vercel/node";

// Konfigurasi via environment variables (set di Vercel dashboard atau .env):
//   ALLOWED_ORIGINS  — comma-separated, atau "*" (default)
//   ALLOWED_METHODS  — default: GET,POST,PUT,OPTIONS
//   ALLOWED_HEADERS  — default: Content-Type,Authorization

const ALLOWED_ORIGINS: string[] = (process.env.ALLOWED_ORIGINS ?? "*")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

const ALLOWED_METHODS =
  process.env.ALLOWED_METHODS ?? "GET,POST,PUT,OPTIONS";

const ALLOWED_HEADERS =
  process.env.ALLOWED_HEADERS ?? "Content-Type,Authorization";

function getAllowOrigin(req: VercelRequest): string {
  if (ALLOWED_ORIGINS.length === 1 && ALLOWED_ORIGINS[0] === "*") return "*";
  const origin = (req.headers["origin"] as string) ?? "";
  return ALLOWED_ORIGINS.includes(origin) ? origin : "";
}

/** Terapkan CORS headers ke response. Return false jika origin ditolak. */
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const allowOrigin = getAllowOrigin(req);
  if (!allowOrigin) return false;

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  res.setHeader("Access-Control-Expose-Headers", "Content-Type");
  if (allowOrigin !== "*") res.setHeader("Vary", "Origin");
  return true;
}

/** Handle preflight OPTIONS dan return true jika sudah dihandle. */
export function handlePreflight(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method !== "OPTIONS") return false;
  applyCors(req, res);
  res.setHeader("Access-Control-Max-Age", "86400");
  res.status(204).end();
  return true;
}

/** Validasi kode bahasa — hanya izinkan karakter aman. */
export function sanitizeLangCode(code: unknown, fallback: string): string {
  if (typeof code !== "string" || !/^[a-zA-Z0-9\-_]+$/.test(code.trim())) {
    return fallback;
  }
  return code.trim();
}
