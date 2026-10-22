# BRO Map Integration

## Overview

Add an interactive map showing all BRO CPT and geotechnical borehole (BHR-GT) locations in the Netherlands. Users can click a location to fetch and view the data directly in the viewer.

## User Flow

1. User opens the app and sees a map of the Netherlands
2. Map displays markers/points for all CPT and BHR-GT locations
3. User can pan, zoom, and click on a point
4. Clicking a point shows a popup with basic info (BRO ID, date, depth)
5. User clicks "View data" in the popup
6. App fetches the BRO XML via the BRO API
7. Data is displayed in the existing viewer components

## Technology Stack

### MapLibre GL JS
- Open-source fork of Mapbox GL JS
- No API key required
- Good React integration via `react-map-gl` or `@maplibre/maplibre-react-native`
- Supports vector tiles natively

### PMTiles
- Single-file archive format for tiled data
- Can be hosted on static storage (S3, Cloudflare R2, etc.)
- No tile server needed - fetches byte ranges directly
- Protocol: `pmtiles://` with MapLibre plugin

### Data Source
- BRO provides WFS services with all registered objects
- We would pre-process this into PMTiles for performance
- Update periodically (weekly/monthly) via scheduled job

## PMTiles Generation

### Source Data
- BRO CPT locations: ~500,000+ points
- BRO BHR-GT locations: ~100,000+ points
- Available via BRO WFS or bulk download

### Processing Pipeline
```
BRO WFS/Bulk → GeoJSON → tippecanoe → PMTiles
```

Using [tippecanoe](https://github.com/felt/tippecanoe):
```bash
tippecanoe -o bro-locations.pmtiles \
  --layer=cpt \
  --layer=bhr-gt \
  --minimum-zoom=6 \
  --maximum-zoom=14 \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  cpt-locations.geojson \
  bhr-gt-locations.geojson
```

### Tile Content (per point)
- `bro_id` - for API fetch
- `type` - "CPT" or "BHR-GT"
- `date` - research report date
- `depth` - final depth in meters
- Coordinates (implicit in tile geometry)

## BRO API Integration

### Endpoints

**CPT Data:**
```
GET https://publiek.broservices.nl/sr/cpt/v2/objects/{bro_id}
Accept: application/xml
```

**BHR-GT Data:**
```
GET https://publiek.broservices.nl/sr/bhrgt/v2/objects/{bro_id}
Accept: application/xml
```

### Response
Returns the same XML format as the downloadable files from PDOK. Can be passed directly to the existing parser.

### Rate Limits
- Public API, no authentication required
- Fair use policy applies
- Single-object fetches should be fine

## UI Components

### Map View
```
┌─────────────────────────────────────────────────┐
│  [Upload XML]  [Browse Map]                     │
├─────────────────────────────────────────────────┤
│                                                 │
│                  ┌─────────┐                    │
│       •  •       │CPT00123 │                    │
│     •    •  •    │2023-05-│                    │
│    •  ◉────────▶│15.2m    │                    │
│      •  •       │[View]   │                    │
│        •        └─────────┘                    │
│                    Netherlands Map              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Point Popup
- BRO ID (e.g., `CPT000000123456`)
- Type (CPT / Geotechnical Borehole)
- Date
- Final depth
- "View data" button

### Loading State
After clicking "View data":
- Show loading spinner
- Fetch XML from BRO API
- Parse with existing `BROParser`
- Navigate to data view

## Implementation Steps

### Phase 1: Basic Map
1. Add MapLibre GL JS dependency
2. Create map component with Netherlands bounds
3. Add base map tiles (e.g., OpenStreetMap, CartoDB)
4. Test basic pan/zoom

### Phase 2: PMTiles Layer
1. Generate PMTiles from BRO data
2. Host PMTiles file (Cloudflare R2 or similar)
3. Add pmtiles protocol to MapLibre
4. Style CPT and BHR-GT points differently

### Phase 3: Interaction
1. Add click handler for points
2. Show popup with point info
3. Add "View data" button to popup

### Phase 4: API Integration
1. Create fetch function for BRO API
2. Handle loading/error states
3. Parse response with existing parser
4. Display in viewer

### Phase 5: Polish
1. Add search by BRO ID
2. Add current location button
3. Cluster points at low zoom levels
4. Add legend for point types
5. Remember last map position

## Hosting PMTiles

### Option A: Cloudflare R2
- Free egress
- Good for static files
- ~50MB for all BRO locations (estimated)

### Option B: GitHub Releases
- Simple, free
- Good for infrequent updates
- Size limit: 2GB per file

### Option C: Same host as app
- Simplest deployment
- May increase bundle size concerns

## Data Updates

PMTiles should be regenerated periodically to include new BRO registrations:

1. Scheduled GitHub Action (weekly/monthly)
2. Fetch latest from BRO WFS
3. Process with tippecanoe
4. Upload to hosting
5. App always fetches latest PMTiles

## Dependencies to Add

```json
{
  "maplibre-gl": "^4.x",
  "pmtiles": "^3.x",
  "react-map-gl": "^7.x"
}
```

## Open Questions

- [ ] Exact PMTiles hosting location
- [ ] Update frequency for location data
- [ ] Whether to include BHR-G (geological boreholes) as well
- [ ] Clustering strategy at low zoom levels
- [ ] Mobile touch interaction
