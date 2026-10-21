import {
    BROFetchError,
    fetchBROXml,
    type WorkerExecutionContext,
} from "~/util/bro-api.server";
import { broIdPattern } from "~/util/bro-id";
import type { Route } from "./+types/bro-object-xml";

/**
 * Serves the original BRO XML of an object, e.g. /api/bro/CPT000000000029.
 * Backed by the same edge cache as the /:broId page loader, so the download
 * normally doesn't hit the BRO API a second time.
 */
export async function loader({ params, context }: Route.LoaderArgs) {
  const broId = params.broId.toUpperCase();
  if (!broIdPattern.test(broId)) {
    return new Response("Not a BRO ID", { status: 404 });
  }

  // context.cloudflare is set in workers/app.ts (same pattern as feedback.tsx)
  const { cloudflare } = context as unknown as {
    cloudflare?: { ctx: WorkerExecutionContext };
  };

  try {
    const xml = await fetchBROXml(broId, cloudflare?.ctx);
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Content-Disposition": `attachment; filename="${broId}.xml"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    if (error instanceof BROFetchError) {
      switch (error.kind) {
        case "unsupported": {
          return new Response("BRO object type not supported", {
            status: 404,
          });
        }
        case "rejected": {
          return new Response(error.message, {
            status: 404,
            headers: { "Cache-Control": "public, max-age=60" },
          });
        }
        case "rate-limited": {
          return new Response("BRO API rate limit reached", {
            status: 503,
            headers: { "Retry-After": "60", "Cache-Control": "no-store" },
          });
        }
        case "unavailable": {
          return new Response("BRO API unavailable", {
            status: 502,
            headers: { "Cache-Control": "no-store" },
          });
        }
      }
    }
    throw error;
  }
}
