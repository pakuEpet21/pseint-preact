"use client";

/**
 * Share utilities: compress code to URL-safe base64 and decompress from URL.
 * Uses the native Compression Streams API (Gzip) — no external dependencies.
 */

/** Compress a string using Gzip and encode as URL-safe base64. */
export async function compressToUrlSafeBase64(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = cs.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  // Base64url encoding (no + / =)
  let base64 = btoa(String.fromCharCode(...merged));
  base64 = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return base64;
}

/** Decode URL-safe base64 and decompress using Gzip. */
export async function decompressFromUrlSafeBase64(
  encoded: string,
): Promise<string> {
  // Restore standard base64
  let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  // Pad to multiple of 4
  while (base64.length % 4 !== 0) base64 += "=";
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const cs = new DecompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = cs.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(merged);
}

/** Build a shareable URL with the compressed code as a query param. */
export function buildShareUrl(code: string): string {
  const params = new URLSearchParams();
  params.set("code", code);
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

/** Build an exam mode URL with the compressed consigna (exam prompt) and keyword. */
export async function buildExamUrl(
  consigna: string,
  keyword: string,
): Promise<string> {
  const compressed = await compressToUrlSafeBase64(consigna);
  const params = new URLSearchParams();
  params.set("exam", compressed);
  params.set("keyword", keyword);
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

/** Parse an exam mode URL and verify the keyword. Returns null if invalid. */
export async function parseExamUrl(): Promise<{
  consigna: string;
  keyword: string;
} | null> {
  const params = new URLSearchParams(window.location.search);
  const examParam = params.get("exam");
  const keywordParam = params.get("keyword");

  if (!examParam || !keywordParam) {
    return null;
  }

  try {
    const consigna = await decompressFromUrlSafeBase64(examParam);
    return { consigna, keyword: keywordParam };
  } catch {
    return null;
  }
}