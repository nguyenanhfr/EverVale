import type { IncomingMessage } from "node:http";

export const DEFAULT_MAX_BODY_BYTES = 64 * 1024;
const MAX_OWNER_BYTES = 256;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/u;

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function configuredMaxBodyBytes(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_MAX_BODY_BYTES;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("INVALID_MAX_BODY_BYTES");
  }
  return value;
}

function requireJsonContentType(req: IncomingMessage): void {
  const contentType = headerValue(req.headers["content-type"]);
  if (!contentType) throw new Error("UNSUPPORTED_MEDIA_TYPE");

  const mediaType = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (mediaType !== "application/json" && !mediaType.endsWith("+json")) {
    throw new Error("UNSUPPORTED_MEDIA_TYPE");
  }
}

export async function readJsonBody<T>(
  req: IncomingMessage,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): Promise<T> {
  requireJsonContentType(req);

  const contentLength = headerValue(req.headers["content-length"]);
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > maxBytes) {
    req.resume();
    throw new Error("REQUEST_TOO_LARGE");
  }

  const chunks: Buffer[] = [];
  let bytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > maxBytes) {
      req.resume();
      throw new Error("REQUEST_TOO_LARGE");
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) throw new Error("INVALID_JSON");

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("INVALID_JSON");
  }
}

export function requestOwner(req: IncomingMessage): string {
  const value = headerValue(req.headers["x-evervale-owner"]);
  if (value === undefined || value.trim() === "") throw new Error("UNAUTHORIZED");

  const ownerId = value.trim();
  if (
    Buffer.byteLength(ownerId, "utf8") > MAX_OWNER_BYTES ||
    CONTROL_CHARACTERS.test(ownerId)
  ) {
    throw new Error("INVALID_OWNER");
  }

  return ownerId;
}

export function statusForError(message: string): number {
  if (message === "UNAUTHORIZED") return 401;
  if (message === "DEV_AUTH_DISABLED") return 403;
  if (
    message === "REVISION_CONFLICT" ||
    message === "COMMAND_ID_CONFLICT" ||
    message === "WORLD_ALREADY_EXISTS" ||
    message === "WORLD_OWNER_EXISTS"
  ) {
    return 409;
  }
  if (message === "REQUEST_TOO_LARGE") return 413;
  if (message === "UNSUPPORTED_MEDIA_TYPE") return 415;
  if (
    message === "INVALID_JSON" ||
    message === "UNKNOWN_COMMAND" ||
    message.startsWith("INVALID_") ||
    message.startsWith("NOT_ENOUGH") ||
    message.startsWith("NO_") ||
    message.startsWith("REPAIR_") ||
    message.startsWith("BLOCKER_") ||
    message.startsWith("PROP_") ||
    message === "UNKNOWN_PROP" ||
    message.includes("LOCKED") ||
    message.includes("COLLISION")
  ) {
    return 400;
  }
  return 500;
}
