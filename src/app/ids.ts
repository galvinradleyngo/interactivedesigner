/** Random hex id; works in non-secure contexts where crypto.randomUUID is missing. */
export function randomId(length = 16): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}
