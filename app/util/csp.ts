/**
 * Content-Security-Policy for production documents. Every external origin
 * the browser contacts must be listed here; a new API, tile host, or CDN
 * added elsewhere in the app needs a matching entry or the browser blocks
 * the request (check the console for CSP violation reports).
 */
export function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    // The nonce covers React Router's inline hydration scripts and the
    // JSON-LD block in root.tsx.
    `script-src 'self' 'nonce-${nonce}' https://counterscale.bedrock-engineer.workers.dev`,
    // 'unsafe-inline' is for style attributes set by Observable Plot,
    // MapLibre, and the Sentry feedback widget.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // data:/blob: for MapLibre icons and chart exports; Counterscale
    // reports pageviews via an image pixel.
    "img-src 'self' data: blob: https://counterscale.bedrock-engineer.workers.dev",
    [
      "connect-src 'self'",
      "https://publiek.broservices.nl", // BRO object API
      "https://api.pdok.nl", // locatieserver geocoding
      "https://service.pdok.nl", // BRT/luchtfoto tiles (MapLibre fetches tiles via fetch)
      "https://tile.openstreetmap.org",
      "https://r2.eu.bedrock.engineer", // PMTiles range requests
      "https://cdn.proj.org", // RDNAP transformation grid
      "https://counterscale.bedrock-engineer.workers.dev",
      "https://*.sentry.io", // error + feedback ingest
    ].join(" "),
    // 'self' for the PWA service worker, blob: for MapLibre's bundled worker.
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
