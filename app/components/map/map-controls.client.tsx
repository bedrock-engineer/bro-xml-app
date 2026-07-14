import type { Map as MlMap } from "maplibre-gl";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState, type Key, type RefObject } from "react";
import {
  CheckboxButton,
  CheckboxField,
  ComboBox,
  Group,
  Input,
  ListBox,
  ListBoxItem,
  Popover,
  RadioButton,
  RadioField,
  RadioGroup,
} from "react-aria-components";
import { useTranslation } from "react-i18next";
import type { BROFileType } from "~/types/bro-data";
import type { BROLocationLayer } from "~/util/bro-api";
import {
  lookupAddress,
  suggestAddresses,
  type PdokSuggestion,
} from "~/util/pdok";

export const typeColors: Record<BROFileType, string> = {
  CPT: "#2563eb", // blue
  "BHR-GT": "#ea580c", // orange
  "BHR-G": "#16a34a", // green
};

export const selectedColor = "#dc2626"; // red

// Dark stroke marks files loaded in the app; tile points have a white
// hairline, so the ring color alone tells the states apart.
export const loadedStrokeColor = "#1f2937";

const searchMarkerColor = "#0d9488"; // teal, distinct from point colors

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
}

/**
 * Address / place search rendered into the map via `PortalControl`,
 * backed by the PDOK Locatieserver. The selected place gets a marker
 * and the camera flies to it.
 */
export function SearchBox({ mapRef }: SearchBoxProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const { suggestions, loading } = useAddressSuggest(query);
  const lookupAbortRef = useRef<AbortController | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  function emptyStateMessage(): string {
    if (query.trim().length < minQueryLength) {
      return t("mapSearchTypeToSearch");
    }
    return loading ? t("mapSearchSearching") : t("mapSearchNoResults");
  }

  async function handleSelect(key: Key | null) {
    if (key === null) {
      return;
    }
    const id = String(key);
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

    if (markerRef.current) {
      markerRef.current.setLngLat([place.longitude, place.latitude]);
    } else {
      markerRef.current = new maplibregl.Marker({ color: searchMarkerColor })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map);
    }

    map.flyTo({
      center: [place.longitude, place.latitude],
      zoom: Math.max(map.getZoom(), 15),
      // Cap duration — flyTo otherwise scales with zoom delta, which
      // makes jumps from country-level to street-level drag on.
      duration: 1400,
      curve: 1.2,
    });
  }

  return (
    <div className="min-w-64 rounded-sm border border-gray-300 bg-white/90 p-1">
      <ComboBox
        items={suggestions}
        inputValue={query}
        onInputChange={setQuery}
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
          />
          {loading && (
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
            {(item) => (
              <ListBoxItem
                id={item.id}
                textValue={item.label}
                className="cursor-pointer border-b border-gray-100 px-2.5 py-1.5 outline-none data-focused:bg-blue-50 data-selected:bg-blue-50"
              >
                {item.label}
                <span className="ml-1.5 text-[10px] text-gray-400">
                  {item.type}
                </span>
              </ListBoxItem>
            )}
          </ListBox>
        </Popover>
      </ComboBox>
    </div>
  );
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

      <RadioGroup
        value={basemap}
        onChange={onBasemapChange}
        aria-label={t("mapBasemapLabel")}
        className="border-t border-gray-200 pt-1 space-y-0.5"
      >
        {basemaps.map((definition) => (
          <RadioField key={definition.id} value={definition.id}>
            <RadioButton className="group flex cursor-pointer items-center gap-1.5">
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 transition-colors group-hover:border-gray-400 group-data-selected:border-blue-600">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 opacity-0 transition-opacity group-data-selected:opacity-100" />
              </span>
              {t(definition.labelKey)}
            </RadioButton>
          </RadioField>
        ))}
      </RadioGroup>
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
