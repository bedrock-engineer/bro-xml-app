import { usePostHog } from "@posthog/react";
import { MapPinIcon } from "lucide-react";
import { Marker, type Map as MlMap } from "maplibre-gl";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type Key,
  type RefObject,
} from "react";
import {
  CheckboxButton,
  CheckboxField,
  ComboBox,
  Group,
  Input,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import { useTranslation } from "react-i18next";
import type { BROFileType } from "~/types/bro-data";
import { broIdPattern, type BROLocationLayer } from "~/util/bro-api";
import {
  lookupAddress,
  suggestAddresses,
  type PdokSuggestion,
} from "~/util/pdok";
import { RadioButtonGroup } from "../radio-button-group";

export const typeColors: Record<BROFileType, string> = {
  CPT: "#2563eb", // blue
  "BHR-GT": "#ea580c", // orange
  "BHR-G": "#16a34a", // green
  GMW: "#0891b2", // cyan
  // GLD has no location of its own (it references a GMW well) so it never
  // appears on the map; a colour is required only to keep the map exhaustive.
  GLD: "#0d9488", // teal
};

export const selectedColor = "#dc2626"; // red

// Fill for markers of files loaded in the app: violet, distinct from
// every type color so loaded points stand out among the tile points.
export const loadedColor = "#7c3aed";

// Dark stroke marks files loaded in the app; tile points have a white
// hairline, so the ring color alone tells the states apart.
export const loadedStrokeColor = "#1f2937";

const searchMarkerColor = "#0d9488"; // teal, distinct from point colors

// Gray-500, used for the result-row marker of a BHR id. A BHR prefix is
// shared by BHR-GT and BHR-G, so the exact type (and its color) is unknown
// until the object is fetched; a neutral marker avoids showing a wrong one.
const neutralMarkerColor = "#6b7280";

const kadasterAttribution =
  'Kaartgegevens &copy; <a href="https://www.kadaster.nl/">Kadaster</a>';

interface BasemapDefinition {
  id: string;
  labelKey: "mapBasemapTopo" | "mapBasemapAerial" | "mapBasemapOsm";
  tiles: string;
  attribution: string;
}

export const basemaps: ReadonlyArray<BasemapDefinition> = [
  {
    id: "brt",
    labelKey: "mapBasemapTopo",
    tiles:
      "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png",
    attribution: kadasterAttribution,
  },
  {
    id: "luchtfoto",
    labelKey: "mapBasemapAerial",
    tiles:
      "https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857/{z}/{x}/{y}.jpeg",
    attribution: kadasterAttribution,
  },
  {
    id: "osm",
    labelKey: "mapBasemapOsm",
    tiles: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
];

export type BasemapId = string;

export const defaultBasemapId: BasemapId = "brt";

export function swallowEvent(event: Event) {
  event.stopPropagation();
}

const debounceMs = 220;
const minQueryLength = 2;

interface AddressSuggestState {
  suggestions: Array<PdokSuggestion>;
  loading: boolean;
}

/**
 * Debounced, abortable PDOK address suggestions. Queries below
 * `minQueryLength` skip both the fetch and the state altogether;
 * cleanup aborts any in-flight fetch.
 */
function useAddressSuggest(query: string): AddressSuggestState {
  const trimmed = query.trim();
  const shouldSearch = trimmed.length >= minQueryLength;
  const [state, setState] = useState<AddressSuggestState>({
    suggestions: [],
    loading: false,
  });

  useEffect(() => {
    if (!shouldSearch) {
      return;
    }
    const abort = new AbortController();
    const timer = globalThis.setTimeout(() => {
      setState((s) => ({ ...s, loading: true }));
      suggestAddresses(trimmed, abort.signal)
        .then((suggestions) => {
          if (!abort.signal.aborted) {
            setState({ suggestions, loading: false });
          }
        })
        .catch(() => {
          if (!abort.signal.aborted) {
            setState({ suggestions: [], loading: false });
          }
        });
    }, debounceMs);

    return () => {
      globalThis.clearTimeout(timer);
      abort.abort();
    };
  }, [trimmed, shouldSearch]);

  if (!shouldSearch) {
    return { suggestions: [], loading: false };
  }
  return state;
}

interface SearchBoxProps {
  mapRef: RefObject<MlMap | null>;
  onSearchBroId: (
    broId: string,
  ) => Promise<{ lat: number; lon: number } | null>;
}

/** Sentinel prefix marking a synthetic BRO-ID item among address results. */
const broIdItemPrefix = "broid:";

/**
 * The BRO ID the query resolves to, or null. Whitespace is trimmed and the
 * domain code upper-cased so a lower-case paste still matches.
 */
function detectBroId(query: string): string | null {
  const normalized = query.trim().toUpperCase();
  return broIdPattern.test(normalized) ? normalized : null;
}

/** A full domain prefix followed by fewer than the required 12 digits. */
const partialBroIdPattern = /^(CPT|BHR)(\d{0,11})$/;

/**
 * A BRO ID still being typed: the prefix is complete but the 12-digit tail
 * is not. Returns the prefix and how many digits have been entered so the UI
 * can show progress, or null when the query is a complete id or not id-like.
 */
function detectPartialBroId(
  query: string,
): { prefix: string; digits: number } | null {
  const normalized = query.trim().toUpperCase();
  const match = partialBroIdPattern.exec(normalized);
  if (!match) {
    return null;
  }
  const [, prefix = "", digitsGroup = ""] = match;
  return { prefix, digits: digitsGroup.length };
}

/**
 * Address / place search rendered into the map via `PortalControl`,
 * backed by the PDOK Locatieserver. Typing a full BRO ID (e.g.
 * `CPT000000090040`) instead offers a "go to" result that loads the object
 * and flies to it. The selected result gets a marker and the camera flies
 * to it.
 */
export function SearchBox({ mapRef, onSearchBroId }: SearchBoxProps) {
  const { t } = useTranslation();
  const posthog = usePostHog();
  const [query, setQuery] = useState("");
  const { suggestions, loading } = useAddressSuggest(query);
  const [isSearchingBroId, startBroIdSearch] = useTransition();
  const [notFoundBroId, setNotFoundBroId] = useState<string | null>(null);
  const lookupAbortRef = useRef<AbortController | null>(null);
  const markerRef = useRef<Marker | null>(null);
  // Guards against the click and Enter paths both firing a lookup for the
  // same id within one synchronous event. A ref is required rather than the
  // transition's pending flag, which only updates on the next render.
  const inFlightBroIdRef = useRef<string | null>(null);

  const broId = detectBroId(query);
  const partialBroId = broId ? null : detectPartialBroId(query);
  const notFound = notFoundBroId !== null && notFoundBroId === broId;

  // A recognised BRO ID replaces the address suggestions with a single
  // "go to" item; a partial or not-found id shows nothing in the list (the
  // status line below the box carries that feedback); otherwise the PDOK
  // suggestions drive the list.
  let items: Array<PdokSuggestion>;
  if (broId && !notFound) {
    items = [
      {
        id: `${broIdItemPrefix}${broId}`,
        label: t("mapSearchGoToBroId", { broId }),
        type: "BRO ID",
      },
    ];
  } else if (broId || partialBroId) {
    items = [];
  } else {
    items = suggestions;
  }

  function flyToResult(map: MlMap, longitude: number, latitude: number) {
    if (markerRef.current) {
      markerRef.current.setLngLat([longitude, latitude]);
    } else {
      markerRef.current = new Marker({ color: searchMarkerColor })
        .setLngLat([longitude, latitude])
        .addTo(map);
    }

    map.flyTo({
      center: [longitude, latitude],
      zoom: Math.max(map.getZoom(), 15),
      // Cap duration — flyTo otherwise scales with zoom delta, which
      // makes jumps from country-level to street-level drag on.
      duration: 1400,
      curve: 1.2,
    });
  }

  function emptyStateMessage(): string {
    if (query.trim().length < minQueryLength) {
      return t("mapSearchTypeToSearch");
    }
    return loading ? t("mapSearchSearching") : t("mapSearchNoResults");
  }

  function handleBroIdSelect(selectedBroId: string) {
    if (inFlightBroIdRef.current === selectedBroId) {
      return;
    }
    inFlightBroIdRef.current = selectedBroId;
    setQuery(selectedBroId);
    setNotFoundBroId(null);
    startBroIdSearch(async () => {
      let coords: { lat: number; lon: number } | null;
      try {
        coords = await onSearchBroId(selectedBroId);
      } catch {
        coords = null;
      } finally {
        inFlightBroIdRef.current = null;
      }

      const map = mapRef.current;
      if (!coords || !map) {
        setNotFoundBroId(selectedBroId);
        return;
      }

      posthog.capture("map_bro_id_selected");
      flyToResult(map, coords.lon, coords.lat);
    });
  }

  async function handleSelect(key: Key | null) {
    if (key === null) {
      return;
    }
    const id = String(key);

    if (id.startsWith(broIdItemPrefix)) {
      handleBroIdSelect(id.slice(broIdItemPrefix.length));
      return;
    }

    const picked = suggestions.find((s) => s.id === id);
    if (picked) {
      setQuery(picked.label);
    }

    lookupAbortRef.current?.abort();
    const abort = new AbortController();
    lookupAbortRef.current = abort;

    let place;
    try {
      place = await lookupAddress(id, abort.signal);
    } catch {
      return;
    }
    const map = mapRef.current;
    if (!place || !map || abort.signal.aborted) {
      return;
    }

    posthog.capture("map_address_selected", {
      result_type: picked?.type,
    });

    flyToResult(map, place.longitude, place.latitude);
  }

  return (
    <div className="min-w-64 rounded-sm border border-gray-300 bg-white/90 p-1">
      <ComboBox
        items={items}
        inputValue={query}
        onInputChange={(value) => {
          setQuery(value);
          if (notFoundBroId !== null) {
            setNotFoundBroId(null);
          }
        }}
        onChange={(key) => {
          void handleSelect(key);
        }}
        allowsCustomValue
        menuTrigger="input"
        aria-label={t("mapSearchPlaceholder")}
      >
        <Group className="relative flex items-center rounded-sm border border-gray-300 bg-white focus-within:border-gray-500">
          <Input
            type="search"
            placeholder={t("mapSearchPlaceholder")}
            autoComplete="off"
            spellCheck={false}
            className="w-full min-w-0 rounded-sm bg-transparent py-1 pr-2 pl-2 text-xs text-gray-900 outline-none"
            onKeyDown={(event) => {
              // The ComboBox doesn't auto-focus the single "go to" row, so
              // Enter alone wouldn't select it. Trigger the lookup directly
              // whenever the field holds a valid BRO ID (covers paste+Enter).
              if (event.key === "Enter" && broId) {
                event.preventDefault();
                event.stopPropagation();
                handleBroIdSelect(broId);
              }
            }}
          />
          {(loading || isSearchingBroId) && (
            <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[10px] text-gray-400">
              …
            </span>
          )}
        </Group>
        <Popover className="w-(--trigger-width) rounded-sm bg-white shadow-lg">
          <ListBox<PdokSuggestion>
            className="max-h-64 overflow-auto text-xs text-gray-900 outline-none"
            renderEmptyState={() => (
              <div className="px-2.5 py-1.5 text-gray-400">
                {emptyStateMessage()}
              </div>
            )}
          >
            {(item) => {
              const isBroRow = item.id.startsWith(broIdItemPrefix);
              return (
                <ListBoxItem
                  id={item.id}
                  textValue={item.label}
                  className="flex cursor-pointer items-center gap-1.5 border-b border-gray-100 px-2.5 py-1.5 outline-none data-focused:bg-blue-50 data-selected:bg-blue-50"
                >
                  {isBroRow ? (
                    <BroResultMarker
                      broId={item.id.slice(broIdItemPrefix.length)}
                    />
                  ) : (
                    <MapPinIcon
                      className="h-3 w-3 shrink-0 text-gray-400"
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {isBroRow ? (
                    <kbd
                      className="ml-auto shrink-0 rounded border border-gray-300 px-1 text-[10px] leading-4 text-gray-500"
                      title={t("mapSearchEnterToLocate")}
                    >
                      ↵
                    </kbd>
                  ) : (
                    <span className="ml-1.5 shrink-0 text-[10px] text-gray-400">
                      {item.type}
                    </span>
                  )}
                </ListBoxItem>
              );
            }}
          </ListBox>
        </Popover>
      </ComboBox>
      {notFound && (
        <p className="px-1 pt-1 text-[11px] text-red-600">
          {t("mapSearchBroIdNotFound", { broId })}
        </p>
      )}
      {!notFound && partialBroId && (
        <p className="px-1 pt-1 text-[11px] text-gray-500">
          {t("mapSearchBroIdProgress", {
            prefix: partialBroId.prefix,
            digits: partialBroId.digits,
          })}
        </p>
      )}
    </div>
  );
}

/**
 * Marker shown beside a BRO-ID result row, mirroring the map legend: a blue
 * triangle for a CPT, and a neutral dot for a BHR whose exact type (and
 * color) is not yet known. See {@link neutralMarkerColor}.
 */
function BroResultMarker({ broId }: { broId: string }) {
  if (broId.startsWith("CPT")) {
    return <LegendDot color={typeColors.CPT} shape="triangle" />;
  }
  return <LegendDot color={neutralMarkerColor} />;
}

interface MapLayersPanelProps {
  visibility: Record<BROLocationLayer, boolean>;
  onVisibilityChange: (layer: BROLocationLayer, visible: boolean) => void;
  basemap: BasemapId;
  onBasemapChange: (id: BasemapId) => void;
}

/**
 * Legend with visibility toggles for the BRO location layers, static
 * legend entries for the loaded / selected marker states, and a
 * basemap picker. Rendered into the map via `PortalControl`.
 */
export function MapLayersPanel({
  visibility,
  onVisibilityChange,
  basemap,
  onBasemapChange,
}: MapLayersPanelProps) {
  const { t } = useTranslation();
  const posthog = usePostHog();

  return (
    <div className="rounded-sm border border-gray-300 bg-white/90 px-2 py-1.5 text-xs space-y-1">
      <LayerToggle
        color={typeColors.CPT}
        shape="triangle"
        label={t("mapLegendCpt")}
        checked={visibility.cpt}
        onChange={(checked) => {
          onVisibilityChange("cpt", checked);
        }}
      />
      <LayerToggle
        color={typeColors["BHR-GT"]}
        label={t("mapLegendBhrgt")}
        checked={visibility.bhrgt}
        onChange={(checked) => {
          onVisibilityChange("bhrgt", checked);
        }}
      />
      <LayerToggle
        color={typeColors["BHR-G"]}
        label={t("mapLegendBhrg")}
        checked={visibility.bhrg}
        onChange={(checked) => {
          onVisibilityChange("bhrg", checked);
        }}
      />

      <RadioButtonGroup
        value={basemap}
        onChange={(id) => {
          posthog.capture("map_basemap_changed", {
            basemap: id,
          });
          onBasemapChange(id);
        }}
        aria-label={t("mapBasemapLabel")}
        orientation="vertical"
        options={basemaps.map((definition) => ({
          value: definition.id,
          label: t(definition.labelKey),
        }))}
        className="border-t border-gray-200 pt-1"
      />
    </div>
  );
}

function LayerToggle({
  color,
  label,
  shape = "circle",
  checked,
  onChange,
}: {
  color: string;
  label: string;
  shape?: LegendShape;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <CheckboxField isSelected={checked} onChange={onChange}>
      <CheckboxButton className="group flex cursor-pointer items-center gap-1.5">
        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border-2 border-gray-300 transition-colors group-hover:border-gray-400 group-data-selected:border-blue-600 group-data-selected:bg-blue-600">
          <svg
            viewBox="0 0 18 18"
            className="h-2.5 w-2.5 fill-none stroke-white stroke-3 opacity-0 group-data-selected:opacity-100"
          >
            <polyline points="1 9 7 14 15 4" />
          </svg>
        </span>
        <LegendDot color={color} shape={shape} />
        {label}
      </CheckboxButton>
    </CheckboxField>
  );
}

type LegendShape = "circle" | "triangle";

function LegendDot({
  color,
  shape = "circle",
}: {
  color: string;
  shape?: LegendShape;
}) {
  if (shape === "triangle") {
    return (
      <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0" aria-hidden>
        <polygon
          points="1,2 11,2 6,10.5"
          fill={color}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth={1}
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{
        width: 10,
        height: 10,
        backgroundColor: color,
        border: "1px solid #ffffff",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
      }}
    />
  );
}
