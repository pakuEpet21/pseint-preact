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