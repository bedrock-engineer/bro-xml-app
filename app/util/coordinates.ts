import type { Location } from "@bedrock-engineer/bro-xml-parser";
import proj4 from "proj4";
import { useSyncExternalStore } from "react";
// The runtime `import("geotiff")` below loads the chunk
// in parallel with the grid download, off the critical rendering path.
import type { fromArrayBuffer as GeoTIFFFromArrayBuffer } from "geotiff";

type GeoTIFFInstance = Awaited<ReturnType<typeof GeoTIFFFromArrayBuffer>>;

interface WGS84Coords {
  lat: number;
  lon: number;
}

// Define coordinate systems
// RD New. Registered with a 7-parameter +towgs84 shift (~0.5 m accuracy)
// so conversions work synchronously from the first call; once the
// RDNAPTRANS™ 2018 datum-shift grid is loaded the definition is swapped
// to +nadgrids (<1 cm). See loadDatumGrid below.
//
// The rotations MUST be arc-seconds in the position-vector convention
// (the values epsg.io lists). The microradian/coordinate-frame variant
// that epsg-index and spatialreference.org carry
// (…,1.9342,-1.6677,9.1019,…) puts results ~170 m off.
const RD_PROJECTION =
  "+proj=sterea +lat_0=52.1561605555556 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +no_defs +type=crs";
const RD_TOWGS84 = RD_PROJECTION.replace(
  "+ellps=bessel",
  "+ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725",
);
const RD_NADGRIDS = RD_PROJECTION.replace(
  "+ellps=bessel",
  "+ellps=bessel +nadgrids=rdtrans2018",
);
proj4.defs("EPSG:28992", RD_TOWGS84);
// ETRS89
proj4.defs("EPSG:4258", "+proj=longlat +ellps=GRS80 +no_defs +type=crs");

/**
 * Normalize EPSG code to just the numeric part
 * Handles formats like "EPSG:28992", "urn:ogc:def:crs:EPSG::28992", or just "28992"
 */
export function normalizeEpsg(epsg: string): string {
  const match = /(\d+)$/.exec(epsg);
  return match?.[1] ?? epsg;
}

/**
 * Convert location to WGS84 coordinates using proj4.
 *
 * Results for EPSG:28992 depend on which datum shift is registered (see
 * loadDatumGrid below), so render paths that memoize conversions should
 * get this function via useToWgs84 instead of importing it; event
 * handlers, which always read the latest state, can use it directly.
 */
export function toWgs84(location: Location): WGS84Coords | null {
  try {
    const code = normalizeEpsg(location.epsg);

    if (code === "4326") {
      // Already WGS84
      return { lat: location.x, lon: location.y };
    }

    if (code === "4258") {
      // ETRS89 - practically identical to WGS84
      return { lat: location.x, lon: location.y };
    }

    const sourceProj = `EPSG:${code}`;
    const [lon, lat] = proj4(sourceProj, "EPSG:4326", [location.x, location.y]);

    return { lat, lon };
  } catch {
    return null;
  }
}

/**
 * Get human-readable coordinate system name
 */
export function getCoordSystemName(epsg: string) {
  const code = normalizeEpsg(epsg);
  if (code === "28992") {
    return "Rijksdriehoekscoördinaten" as const;
  }
  if (code === "4258") {
    return "ETRS89" as const;
  }
  if (code === "4326") {
    return "WGS84" as const;
  }
  return `EPSG:${code}`;
}

/* ------------------------------------------------------------------------ */
/* RDNAPTRANS™ 2018 datum-shift grid                                        */
/* ------------------------------------------------------------------------ */
/* The +towgs84 Helmert shift for RD New is only good to ~0.5 m. The        */
/* authoritative transformation is grid-based (RDNAPTRANS™ 2018), which     */
/* proj4js supports via proj4.nadgrid + a +nadgrids def. The grid must be   */
/* registered BEFORE a def referencing it is used, otherwise proj4js        */
/* silently applies no datum shift at all (~100 m error) — so we keep the   */
/* +towgs84 def until the grid is fully loaded, then swap. Same approach    */
/* as ifc-georeferencer (see its docs/crs-datum-grids.md).                  */

const GRID_URL = "https://cdn.proj.org/nl_nsgi_rdtrans2018.tif";

type GridState = "idle" | "loading" | "loaded" | "failed";
let gridState: GridState = "idle";
const gridSubscribers = new Set<() => void>();

function subscribeDatumGrid(listener: () => void): () => void {
  gridSubscribers.add(listener);
  return () => {
    gridSubscribers.delete(listener);
  };
}

export type ToWgs84 = typeof toWgs84;

// The store snapshot is a wrapper around toWgs84 whose identity is
// replaced when the grid activates, so consumers listing it as a hook
// dependency recompute exactly then.
let toWgs84Snapshot: ToWgs84 = (location) => toWgs84(location);

function getToWgs84Snapshot(): ToWgs84 {
  return toWgs84Snapshot;
}

/**
 * toWgs84, tied to the RDNAPTRANS™ 2018 grid lifecycle: the returned
 * function gets a new identity once the grid is active and results for
 * EPSG:28992 upgrade from ~0.5 m to <1 cm accuracy. Components that cache
 * or memoize converted coordinates should convert through this so they
 * recompute after the upgrade.
 */
export function useToWgs84(): ToWgs84 {
  return useSyncExternalStore(
    subscribeDatumGrid,
    getToWgs84Snapshot,
    getToWgs84Snapshot,
  );
}

function ensureDatumGrid(): void {
  // Client-only: SSR renders are served fine by the +towgs84 fallback.
  if (gridState !== "idle" || typeof document === "undefined") {
    return;
  }
  gridState = "loading";
  void loadDatumGrid().then((loaded) => {
    if (loaded) {
      proj4.defs("EPSG:28992", RD_NADGRIDS);
      gridState = "loaded";
      toWgs84Snapshot = (location) => toWgs84(location);
    } else {
      // Permanent fallback to +towgs84 for this session; ~0.5 m is fine
      // for display purposes.
      gridState = "failed";
    }
    for (const listener of gridSubscribers) {
      listener();
    }
  });
}

async function loadDatumGrid(): Promise<boolean> {
  try {
    const [response, { fromArrayBuffer }] = await Promise.all([
      fetch(GRID_URL),
      import("geotiff"),
    ]);
    if (!response.ok) {
      return false;
    }
    const tiff = await fromArrayBuffer(await response.arrayBuffer());
    // proj4.nadgrid is typed for the C-PROJ-canonical GeoTIFF interface,
    // which is broader than what proj4js's reader actually consumes. The
    // adapter shape is structurally sufficient, so cast at the call site.
    const grid = proj4.nadgrid(
      "rdtrans2018",
      adaptForProj4(tiff) as unknown as Parameters<typeof proj4.nadgrid>[1],
    );
    // The GeoTIFF path parses asynchronously behind a `ready` promise.
    const maybeReady = (grid as { ready?: Promise<unknown> } | undefined)
      ?.ready;
    if (maybeReady && typeof maybeReady.then === "function") {
      await maybeReady;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Bridge geotiff.js v3's API to what proj4js's nadgrid GeoTIFF code path
 * expects. v3 stores TIFF tags by number in `actualizedFields`; proj4js
 * reads `image.fileDirectory.ModelPixelScale[0..1]`. Synthesise that one
 * field from `image.getResolution()`. Pre-bind methods so `this` survives
 * the Proxy.
 */
interface GeoTIFFLike {
  getImageCount(): Promise<number> | number;
  getImage(index: number): Promise<unknown>;
}

// Kick off the grid download as soon as this module loads on the client:
// almost every BRO file carries RD New coordinates, and at ~272 KB the
// grid is cheap enough to fetch unconditionally. It is usually active
// before the first file finishes parsing; useDatumGridLoaded covers the
// race when it is not.
ensureDatumGrid();

function adaptForProj4(tiff: GeoTIFFInstance): GeoTIFFLike {
  return {
    getImageCount: () => tiff.getImageCount(),
    getImage: async (index: number) => {
      const img = await tiff.getImage(index);
      const [scaleX = 0, scaleY = 0] = img.getResolution();
      return new Proxy(img, {
        get(target, property) {
          if (property === "fileDirectory") {
            return {
              ModelPixelScale: [Math.abs(scaleX), Math.abs(scaleY), 0],
            };
          }
          const v = (target as unknown as Record<string | symbol, unknown>)[
            property as string
          ];
          return typeof v === "function"
            ? (v as (...callArguments: Array<unknown>) => unknown).bind(target)
            : v;
        },
      });
    },
  };
}
