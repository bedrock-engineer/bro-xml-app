/**
 * Form bodies that `Request#formData()` can parse. Scanners POST random
 * payloads to "/" and "/index.php" (JSON, truncated multipart, no body), and
 * without this guard every one of them throws a TypeError out of the action
 * and lands in Sentry as if it were our bug.
 */
const FORM_CONTENT_TYPES = [
  "multipart/form-data",
  "application/x-www-form-urlencoded",
];

/**
 * Read a POSTed form body or throw a 4xx Response. Thrown Responses render
 * the route's ErrorBoundary and are skipped by `handleError`, so malformed
 * requests from bots stop showing up as unhandled errors.
 */
export async function readFormData(request: Request): Promise<FormData> {
  if (request.method !== "POST") {
    throw new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!FORM_CONTENT_TYPES.some((type) => contentType.startsWith(type))) {
    throw new Response("Unsupported Media Type", { status: 415 });
  }
  try {
    return await request.formData();
  } catch {
    throw new Response("Malformed form body", { status: 400 });
  }
}
