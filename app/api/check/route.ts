import { APICallError, NoObjectGeneratedError, UnsupportedFunctionalityError } from "ai";
import { APPLICANT_TYPES, runCheck, type ApplicantType, type UploadedDoc } from "@/lib/check";

export const maxDuration = 120;

// Vercel rejects request bodies over 4.5 MB.
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 6;
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

// Best effort: per serverless instance. The hard cost cap is the Anthropic workspace spend limit.
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function sniffType(bytes: Uint8Array): UploadedDoc["mediaType"] | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  // The PDF spec allows the %PDF- header anywhere in the first 1024 bytes; government portals emit leading bytes.
  if (ascii(0, 1024).includes("%PDF-")) return "application/pdf";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Upload could not be read.");
  }

  const applicantType = form.get("applicant_type");
  if (!APPLICANT_TYPES.includes(applicantType as ApplicantType)) return fail(400, "Pick an applicant type.");

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return fail(400, "Upload at least one document.");
  if (files.length > MAX_FILES) return fail(400, `Upload at most ${MAX_FILES} documents.`);
  if (files.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_BYTES) return fail(413, "Total upload must be under 4 MB.");

  const docs: UploadedDoc[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mediaType = sniffType(bytes);
    if (!mediaType) return fail(415, `${file.name}: only PDF, JPG, PNG, or WEBP files are accepted.`);
    docs.push({ name: file.name.slice(0, 100), mediaType, data: bytes });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) return fail(429, "Limit is 5 checks per hour. Try again later.");

  try {
    return Response.json(await runCheck(docs, applicantType as ApplicantType));
  } catch (error) {
    if (UnsupportedFunctionalityError.isInstance(error)) return fail(415, "The configured AI model cannot read this file type. Upload JPG or PNG images instead of PDFs.");
    if (NoObjectGeneratedError.isInstance(error)) return fail(422, "The check returned an unreadable result. Try again or upload fewer files.");
    if (APICallError.isInstance(error) && error.statusCode === 429) return fail(503, "Service is busy. Try again in a minute.");
    if (APICallError.isInstance(error) && error.statusCode === 400) return fail(400, "A document could not be processed. Check that PDFs are not password-protected.");
    console.error(error);
    return fail(502, "Check failed. Try again.");
  }
}
