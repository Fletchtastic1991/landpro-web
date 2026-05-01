import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import * as turf from "@turf/turf";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { Button } from "@/components/ui/button.ts";
import { Badge } from "@/components/ui/badge.ts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.ts";
import { Loader2, Save, Trash2, Maximize2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client.ts";
import { toast } from "sonner";
import type { LandIntent } from "@/components/IntentSelector.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAP_STYLES = {
  satellite: { id: "mapbox://styles/mapbox/satellite-streets-v12", label: "Satellite" },
  streets:   { id: "mapbox://styles/mapbox/streets-v12",            label: "Streets"   },
  terrain:   { id: "mapbox://styles/mapbox/outdoors-v12",           label: "Terrain"   },
  light:     { id: "mapbox://styles/mapbox/light-v11",              label: "Light"     },
} as const;

type MapStyleKey = keyof typeof MAP_STYLES;

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  "pk.eyJ1IjoiZmxldGNodGFzdGljMTk5MSIsImEiOiJjbWlxNnNjajUwamI2M2VvdmFmbGQ5NTlsIn0.hIurrjB3WXifVT10VgKXRA";

const DRAW_STYLES = [
  { id: "gl-draw-polygon-fill",        type: "fill",   filter: ["all", ["==", "$type", "Polygon"]],                           paint: { "fill-color": "#22c55e", "fill-opacity": 0.35 } },
  { id: "gl-draw-polygon-stroke",      type: "line",   filter: ["all", ["==", "$type", "Polygon"]],                           paint: { "line-color": "#16a34a", "line-width": 4 } },
  { id: "gl-draw-polygon-midpoint",    type: "circle", filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]], paint: { "circle-radius": 6,  "circle-color": "#16a34a" } },
  { id: "gl-draw-polygon-vertex-halo", type: "circle", filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"]],   paint: { "circle-radius": 10, "circle-color": "#fff" } },
  { id: "gl-draw-polygon-vertex",      type: "circle", filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"]],   paint: { "circle-radius": 6,  "circle-color": "#16a34a" } },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface MapDrawingProps {
  initialBoundary?: GeoJSON.Polygon | null;
  initialAcreage?: number | null;
  onSave?: (boundary: GeoJSON.Polygon, acreage: number) => Promise<void>;
  onCreateProject?: (boundary: GeoJSON.Polygon, acreage: number) => void;
  onAcreageChange?: (acreage: number | null, squareMeters: number | null) => void;
  onBoundaryChange?: (boundary: GeoJSON.Polygon | null) => void;
  readOnly?: boolean;
  intent?: LandIntent | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapDrawing({
  initialBoundary,
  initialAcreage,
  onSave,
  onCreateProject,
  onAcreageChange,
  onBoundaryChange,
  readOnly = false,
}: MapDrawingProps) {
  const mapContainer    = useRef<HTMLDivElement>(null);
  const map             = useRef<mapboxgl.Map | null>(null);
  const draw            = useRef<MapboxDraw | null>(null);
  const geocoder        = useRef<MapboxGeocoder | null>(null);
  const savedPolygon    = useRef<GeoJSON.Polygon | null>(null);
  const isInitialLoad   = useRef(true);

  const [acreage, setAcreage]                   = useState<number | null>(initialAcreage ?? null);
  const [isSaving, setIsSaving]                 = useState(false);
  const [isFetchingParcel, setIsFetchingParcel] = useState(false);
  const [hasChanges, setHasChanges]             = useState(false);
  const [currentPolygon, setCurrentPolygon]     = useState<GeoJSON.Polygon | null>(null);
  const [mapStyle, setMapStyle]                 = useState<MapStyleKey>("satellite");
  const [parcelSource, setParcelSource]         = useState<"osm" | "estimated" | "manual" | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const calculateArea = useCallback((polygon: GeoJSON.Polygon) => {
    const area = turf.area(polygon);
    return { acres: Math.round(area * 0.000247105 * 100) / 100, sqm: Math.round(area * 100) / 100 };
  }, []);

  const fitToBounds = useCallback((polygon: GeoJSON.Polygon, animate = true) => {
    const bounds = turf.bbox(polygon);
    map.current?.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 80, maxZoom: 18, animate });
  }, []);

  const commitPolygon = useCallback((polygon: GeoJSON.Polygon, source: "osm" | "manual") => {
    const info = calculateArea(polygon);
    setAcreage(info.acres);
    onAcreageChange?.(info.acres, info.sqm);
    onBoundaryChange?.(polygon);
    setCurrentPolygon(polygon);
    savedPolygon.current = polygon;
    setHasChanges(true);
    setParcelSource(source);
    fitToBounds(polygon);
  }, [calculateArea, onAcreageChange, onBoundaryChange, fitToBounds]);

  const clearPolygon = useCallback(() => {
    setAcreage(null);
    onAcreageChange?.(null, null);
    onBoundaryChange?.(null);
    setCurrentPolygon(null);
    savedPolygon.current = null;
    setParcelSource(null);
  }, [onAcreageChange, onBoundaryChange]);

  // ── Draw control attach/reattach (survives style reload) ──────────────────

  const attachDraw = useCallback(() => {
    if (!map.current || readOnly) return;
    if (draw.current) { try { map.current.removeControl(draw.current); } catch (_) {} }

    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      defaultMode: "simple_select",
      styles: DRAW_STYLES as any,
    });
    map.current.addControl(draw.current, "top-left");

    // Restore saved polygon
    if (savedPolygon.current) {
      draw.current.add({ type: "Feature", properties: {}, geometry: savedPolygon.current });
    }

    const onDraw = () => {
      if (!draw.current) return;
      const data = draw.current.getAll();
      if (data.features.length > 0) {
        commitPolygon(data.features[0].geometry as GeoJSON.Polygon, "manual");
      } else {
        clearPolygon();
      }
    };

    map.current.on("draw.create", onDraw);
    map.current.on("draw.update", onDraw);
    map.current.on("draw.delete", onDraw);
  }, [readOnly, commitPolygon, clearPolygon]);

  // ── Style switcher ────────────────────────────────────────────────────────

  const handleStyleChange = useCallback((style: MapStyleKey) => {
    if (!map.current || !style) return;
    setMapStyle(style);
    map.current.setStyle(MAP_STYLES[style].id);
    map.current.once("styledata", () => { attachDraw(); });
  }, [attachDraw]);

  // ── Parcel fetch (from GPS click) ─────────────────────────────────────────

  const fetchParcelBoundary = useCallback(async (lng: number, lat: number) => {
    setIsFetchingParcel(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-parcel", { body: { lng, lat } });
      if (error || !data?.parcel || data.source !== "osm") {
        clearPolygon();
        return;
      }
      draw.current?.deleteAll();
      draw.current?.add({ type: "Feature", properties: {}, geometry: data.parcel });
      commitPolygon(data.parcel, "osm");
      toast.success("Property boundary found!");
    } catch (err) {
      console.error("Parcel fetch error:", err);
      clearPolygon();
    } finally {
      setIsFetchingParcel(false);
    }
  }, [commitPolygon, clearPolygon]);

  // ── Map init ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container:   mapContainer.current,
      style:       "mapbox://styles/mapbox/satellite-streets-v12",
      center:      [-98.5795, 39.8283],
      zoom:        4,
      pitch:       0,
      trackResize: true,
    });

    const resizeObserver = new ResizeObserver(() => map.current?.resize());
    if (mapContainer.current) resizeObserver.observe(mapContainer.current);

    // Navigation + scale
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.ScaleControl(), "bottom-left");

    // ── Address search geocoder ──
    if (!readOnly) {
      geocoder.current = new MapboxGeocoder({
        accessToken: MAPBOX_TOKEN,
        mapboxgl:    mapboxgl as any,
        placeholder: "Search address or place...",
        countries:   "us",
        types:       "address,place,region,locality,neighborhood,postcode",
        marker:      false, // we'll handle fly-to ourselves
        flyTo:       false,
      });

      map.current.addControl(geocoder.current, "top-left");

      // When user selects an address → fly there + try parcel lookup
      geocoder.current.on("result", (e: any) => {
        const [lng, lat] = e.result.center;
        map.current?.flyTo({ center: [lng, lat], zoom: 17, speed: 1.4 });
        // Try fetching parcel boundary for this location
        fetchParcelBoundary(lng, lat);
      });
    }

    // Geolocation
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions:  { enableHighAccuracy: true },
      trackUserLocation: false,
      showUserHeading:   false,
    });
    map.current.addControl(geolocate, "top-right");

    geolocate.on("geolocate", (e: any) => {
      const { longitude, latitude } = e.coords;
      if (isInitialLoad.current && !initialBoundary && !savedPolygon.current) {
        map.current?.flyTo({ center: [longitude, latitude], zoom: 17, speed: 1.5 });
        isInitialLoad.current = false;
        if (!readOnly) fetchParcelBoundary(longitude, latitude);
      }
    });

    map.current.on("load", () => {
      if (!draw.current) attachDraw();

      if (initialBoundary && draw.current) {
        draw.current.add({ type: "Feature", properties: {}, geometry: initialBoundary });
        savedPolygon.current = initialBoundary;
        onBoundaryChange?.(initialBoundary);
        fitToBounds(initialBoundary, false);
        isInitialLoad.current = false;
        return;
      }

      // Auto-geolocate on first open
      if (!savedPolygon.current) geolocate.trigger();
    });

    return () => {
      resizeObserver.disconnect();
      map.current?.remove();
      map.current = null;
      draw.current = null;
      geocoder.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!onSave || !currentPolygon || !acreage) return;
    setIsSaving(true);
    try { await onSave(currentPolygon, acreage); setHasChanges(false); toast.success("Boundary saved!"); }
    catch { toast.error("Failed to save boundary"); }
    finally { setIsSaving(false); }
  };

  const handleClear = () => {
    draw.current?.deleteAll();
    clearPolygon();
    setHasChanges(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col w-full">
      <div className="relative h-[600px] min-h-[400px] w-full overflow-hidden rounded-lg border">
        <div ref={mapContainer} className="absolute inset-0 h-full w-full" style={{ minHeight: "400px" }} />

        {/* Satellite imagery disclaimer */}
        <div className="absolute bottom-4 right-4 z-10">
          <p className="text-[10px] text-muted-foreground/70 bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
            Imagery may not reflect recent site changes. Verify conditions on-site.
          </p>
        </div>

        {/* Style switcher — positioned to not overlap geocoder */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-1"
             style={{ marginLeft: "100px" }}> {/* offset right of geocoder */}
          <ToggleGroup type="single" value={mapStyle} onValueChange={(v: string | null) => v && handleStyleChange(v as MapStyleKey)} className="gap-1">
            {Object.entries(MAP_STYLES).map(([key, { label }]) => (
              <ToggleGroupItem key={key} value={key} size="sm"
                className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Property area card */}
        <div className="absolute top-4 right-16 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-4 border z-10">
          <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
            Property Area
            {parcelSource === "osm" && <span className="text-[10px] text-green-600 font-normal">(verified)</span>}
          </div>
          <div className={`text-2xl font-bold ${parcelSource === "osm" ? "text-green-600" : "text-primary"}`}>
            {isFetchingParcel ? (
              <span className="flex items-center gap-2 text-base text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Finding boundary...
              </span>
            ) : acreage !== null ? `${acreage} acres` : "—"}
          </div>
          {acreage !== null && !isFetchingParcel && (
            <div className="text-xs text-muted-foreground mt-1">
              {(acreage * 4046.86).toLocaleString(undefined, { maximumFractionDigits: 0 })} m²
            </div>
          )}
          {parcelSource && !isFetchingParcel && (
            <div className="mt-2 pt-2 border-t">
              <Badge variant={parcelSource === "osm" ? "default" : "outline"}
                className={`text-[10px] ${parcelSource === "osm" ? "bg-green-600" : ""}`}>
                {parcelSource === "osm" && <MapPin className="h-3 w-3 mr-1" />}
                {parcelSource === "osm" ? "Verified boundary" : "Your boundary"}
              </Badge>
              {parcelSource === "osm"    && <p className="text-[10px] text-green-600 mt-1 font-medium">✓ Matched to property records</p>}
              {parcelSource === "manual" && <p className="text-[10px] text-muted-foreground mt-1">Precisely reflects the area you defined</p>}
            </div>
          )}
        </div>

        {/* Bottom buttons */}
        {!readOnly && (
          <div className="absolute bottom-4 left-4 flex gap-2 flex-wrap z-10">
            <Button variant="secondary" size="sm"
              onClick={() => { if (savedPolygon.current) fitToBounds(savedPolygon.current); }}
              disabled={!currentPolygon}>
              <Maximize2 className="h-4 w-4 mr-1" /> Fit View
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClear} disabled={!currentPolygon}>
              <Trash2 className="h-4 w-4 mr-1" /> Clear
            </Button>
            {onSave && (
              <Button size="sm" onClick={handleSave} disabled={!hasChanges || isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save Boundary
              </Button>
            )}
            {onCreateProject && currentPolygon && acreage && (
              <Button size="sm" onClick={() => onCreateProject(currentPolygon, acreage)}>
                Create Project
              </Button>
            )}
          </div>
        )}

        {/* Draw hint */}
        {!readOnly && !currentPolygon && !isFetchingParcel && (
          <div className="absolute bottom-16 right-4 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-4 border max-w-sm z-10">
            <p className="text-sm font-medium mb-1">Define your land area</p>
            <p className="text-sm text-muted-foreground">
              Search for an address above, or use the polygon tool to draw your boundary manually.
            </p>
          </div>
        )}

        {/* Fetching overlay */}
        {isFetchingParcel && (
          <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px] flex items-center justify-center z-20 pointer-events-none">
            <div className="bg-background/95 rounded-lg shadow-lg p-4 border flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium">Looking up property records...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
