/** Compress text using Compression Streams API (gzip), returns base64. */
export const compress = async (text: string): Promise<string> => {
  const bytes = new TextEncoder().encode(text);
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
};

/** Decompress a base64+gzip string back to plain text. */
export const decompress = async (encoded: string): Promise<string> => {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const cs = new DecompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return new TextDecoder().decode(buf);
};
