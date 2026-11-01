import {
  BROFetchError,
  fetchBROXml,
  type WorkerExecutionContext,
} from "~/util/bro-api.server";
import { broIdPattern } from "~/util/bro-id";
import type { Route } from "./+types/bro-object-xml";

/**
 * Origins allowed to read the XML cross-origin: bedrock.engineer and its
 * subdomains (e.g. the demos on www.bedrock.engineer). Other sites' scripts
 * get no CORS header, so the proxy's edge cache is not a free BRO mirror.
 */
const allowedOrigin = /^https:\/\/([a-z0-9-]+\.)*bedrock\.engineer$/;

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin === null || !allowedOrigin.test(origin)) {
    return {};
  }
  return { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
}

/**
 * Serves the original BRO XML of an object, e.g. /api/bro/CPT000000000029.
 * Backed by the same edge cache as the /:broId page loader, so the download
 * normally doesn't hit the BRO API a second time.
 */
export async function loader({ params, context, request }: Route.LoaderArgs) {
  const broId = params.broId.toUpperCase();
  if (!broIdPattern.test(broId)) {
    return new Response("Not a BRO ID", {
      status: 404,
      headers: corsHeaders(request),
    });
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
        ...corsHeaders(request),
      },
    });
  } catch (error) {
    if (error instanceof BROFetchError) {
      switch (error.kind) {
        case "unsupported": {
          return new Response("BRO object type not supported", {
            status: 404,
            headers: corsHeaders(request),
          });
        }
        case "rejected": {
          return new Response(error.message, {
            status: 404,
            headers: {
              "Cache-Control": "public, max-age=60",
              ...corsHeaders(request),
            },
          });
        }
        case "rate-limited": {
          return new Response("BRO API rate limit reached", {
            status: 503,
            headers: {
              "Retry-After": "60",
              "Cache-Control": "no-store",
              ...corsHeaders(request),
            },
          });
        }
        case "unavailable": {
          return new Response("BRO API unavailable", {
            status: 502,
            headers: {
              "Cache-Control": "no-store",
              ...corsHeaders(request),
            },
          });
        }
      }
    }
    throw error;
  }
}
