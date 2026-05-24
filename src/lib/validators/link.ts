import "server-only";

export {
  type CreateLinkInput,
  createLinkSchema,
  type UpdateLinkInput,
  updateLinkSchema,
} from "./link-schema";

const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "[0:0:0:0:0:0:0:1]",
];

const BLOCKED_PATTERNS = [
  /^https?:\/\/169\.254\./,
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/127\./,
  /^https?:\/\/0\.0\.0\.0/,
];

export function validateDestinationUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (BLOCKED_HOSTS.includes(host)) return false;

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(url)) return false;
    }

    if (!["http:", "https:"].includes(parsed.protocol)) return false;

    return true;
  } catch {
    return false;
  }
}
