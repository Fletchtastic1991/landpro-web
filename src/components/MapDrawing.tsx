import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import * as turf from "@turf/turf";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2, Save, Trash2, Maximize2, MapPin } from "lucide-react";

const MAP_STYLES = {
  satellite: { id: "mapbox://styles/mapbox/satellite-streets-v12", label: "Satellite" },
  streets: { id: "mapbox://styles/mapbox/streets-v12", label: "Streets" },
  terrain: { id: "mapbox://styles/mapbox/outdoors-v12", label: "Terrain" },
  light: { id: "mapbox://styles/mapbox/light-v11", label: "Light" },
} as const;

type MapStyleKey = keyof typeof MAP_STYLES;
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiZmxldGNodGFzdGljMTk5MSIsImEiOiJjbWlxNnNjajUwamI2M2VvdmFmbGQ5NTlsIn0.hIurrjB3WXifVT10VgKXRA";

import type { LandIntent } from "@/components/IntentSelector";

interface MapDrawingProps {
  initialBoundary?: GeoJSON.Polygon | null;
  initialAcreage?: number | null;
  onSave?: (boundary: GeoJSON.Polygon, acreage: number) => Promise<void>;
  onCreateProject?: (boundary: GeoJSON.Polygon, acreage: number) => void;
  onAcreageChange?: (acreage: number | null, squareMeters: number | null) => void;
  readOnly?: boolean;
  intent?: LandIntent | null;
}

export default function MapDrawing({
  initialBoundary,
  initialAcreage,
  onSave,
  onCreateProject,
  onAcreageChange,
  readOnly = false,
  intent = null,
}: MapDrawingProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [acreage, setAcreage] = useState<number | null>(initialAcreage ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingParcel, setIsFetchingParcel] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<GeoJSON.Polygon | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("satellite");
  const [parcelSource, setParcelSource] = useState<'osm' | 'estimated' | 'manual' | null>(null);
  const [parcelMessage, setParcelMessage] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const handleStyleChange = useCallback((style: MapStyleKey) => {
    if (!map.current || !style) return;
    setMapStyle(style);
    map.current.setStyle(MAP_STYLES[style].id);
  }, []);

  const calculateArea = useCallback((polygon: GeoJSON.Polygon) => {
    const area = turf.area(polygon);
    const acres = area * 0.000247105;
    return {
      acres: Math.round(acres * 100) / 100,
      sqm: Math.round(area * 100) / 100
    };
  }, []);

  const updateArea = useCallback((fromParcel = false) => {
    if (!draw.current) return;
    
    const data = draw.current.getAll();
    if (data.features.length > 0) {
      const polygon = data.features[0].geometry as GeoJSON.Polygon;
      const areaInfo = calculateArea(polygon);
      setAcreage(areaInfo.acres);
      if (onAcreageChange) onAcreageChange(areaInfo.acres, areaInfo.sqm);
      setCurrentPolygon(polygon);
      setHasChanges(true);
      if (!fromParcel) {
        setParcelSource('manual');
        setParcelMessage(null);
      }

      // Fit bounds once when drawing or updating
      const bounds = turf.bbox(polygon);
      map.current?.fitBounds(
        [
          [bounds[0], bounds[1]],
          [bounds[2], bounds[3]],
        ],
        { padding: 80, maxZoom: 18 }
      );
    } else {
      setAcreage(null);
      if (onAcreageChange) onAcreageChange(null, null);
      setCurrentPolygon(null);
      setParcelSource(null);
      setParcelMessage(null);
    }
  }, [calculateArea, onAcreageChange]);

  // Fetch parcel boundary from coordinates
  const fetchParcelBoundary = useCallback(async (lng: number, lat: number) => {
    setIsFetchingParcel(true);
    setParcelMessage(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-parcel', {
        body: { lng, lat }
      });

      if (error) {
        console.error('Parcel fetch error:', error);
        setParcelSource(null);
        setAcreage(null);
        if (onAcreageChange) onAcreageChange(null, null);
        setCurrentPolygon(null);
        return;
      }

      if (data?.parcel && draw.current && data.source === 'osm') {
        draw.current.deleteAll();
        draw.current.add({
          type: 'Feature',
          properties: {},
          geometry: data.parcel,
        });

        const areaInfo = calculateArea(data.parcel);
        setAcreage(areaInfo.acres);
        if (onAcreageChange) onAcreageChange(areaInfo.acres, areaInfo.sqm);
        setCurrentPolygon(data.parcel);
        setHasChanges(true);
        setParcelSource('osm');
        setParcelMessage(data.message);

        const bounds = turf.bbox(data.parcel);
        map.current?.fitBounds(
          [
            [bounds[0], bounds[1]],
            [bounds[2], bounds[3]],
          ],
          { padding: 80, maxZoom: 18 }
        );

        toast.success("Property boundary found!");
      } else {
        setParcelSource(null);
        setAcreage(null);
        if (onAcreageChange) onAcreageChange(null, null);
        setCurrentPolygon(null);
        setParcelMessage(null);
      }
    } catch (err) {
      console.error('Error fetching parcel:', err);
      setParcelSource(null);
      setAcreage(null);
      if (onAcreageChange) onAcreageChange(null, null);
      setCurrentPolygon(null);
    } finally {
      setIsFetchingParcel(false);
    }
  }, [calculateArea, onAcreageChange]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [-98.5795, 39.8283],
      zoom: 4,
      pitch: 0,
      trackResize: true,
    });

    const resizeObserver = new ResizeObserver(() => {
      map.current?.resize();
    });
    resizeObserver.observe(mapContainer.current);

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.ScaleControl(), "bottom-left");
    
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    });
    map.current.addControl(geolocate, "top-right");

    geolocate.on('geolocate', (e: any) => {
      const { longitude, latitude } = e.coords;
      if (isInitialLoad && !initialBoundary) {
        map.current?.flyTo({
          center: [longitude, latitude],
          zoom: 17,
          speed: 1.5
        });
        setIsInitialLoad(false);
        if (!readOnly) {
          fetchParcelBoundary(longitude, latitude);
        }
      }
    });

    // Auto-trigger geolocation on load
    map.current.on('load', () => {
      if (!initialBoundary) {
        geolocate.trigger();
      } else if (draw.current) {
        draw.current.add({
          type: 'Feature',
          properties: {},
          geometry: initialBoundary,
        });
        
        const bounds = turf.bbox(initialBoundary);
        map.current?.fitBounds(
          [
            [bounds[0], bounds[1]],
            [bounds[2], bounds[3]],
          ],
          { padding: 50, animate: false }
        );
        setIsInitialLoad(false);
      }
    });

    if (!readOnly) {
      draw.current = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
        defaultMode: "simple_select",
        styles: [
          {
            id: "gl-draw-polygon-fill",
            type: "fill",
            filter: ["all", ["==", "$type", "Polygon"]],
            paint: {
              "fill-color": "#22c55e",
              "fill-opacity": 0.35,
            },
          },
          {
            id: "gl-draw-polygon-stroke",
            type: "line",
            filter: ["all", ["==", "$type", "Polygon"]],
            paint: {
              "line-color": "#16a34a",
              "line-width": 4,
            },
          },
          {
            id: "gl-draw-polygon-midpoint",
            type: "circle",
            filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
            paint: {
              "circle-radius": 6,
              "circle-color": "#16a34a",
            },
          },
          {
            id: "gl-draw-polygon-vertex-halo",
            type: "circle",
            filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"]],
            paint: {
              "circle-radius": 10,
              "circle-color": "#fff",
            },
          },
          {
            id: "gl-draw-polygon-vertex",
            type: "circle",
            filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"]],
            paint: {
              "circle-radius": 6,
              "circle-color": "#16a34a",
            },
          },
        ],
      });

      map.current.addControl(draw.current, "top-left");

      map.current.on("draw.create", () => updateArea());
      map.current.on("draw.update", () => updateArea());
      map.current.on("draw.delete", () => updateArea());
    }

    return () => {
      resizeObserver.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, [readOnly, initialBoundary, updateArea, fetchParcelBoundary, isInitialLoad]);

  const handleSave = async () => {
    if (!onSave || !currentPolygon || !acreage) return;

    setIsSaving(true);
    try {
      await onSave(currentPolygon, acreage);
      setHasChanges(false);
      toast.success("Boundary saved successfully!");
    } catch (err) {
      console.error('Save error:', err);
      toast.error("Failed to save boundary");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    if (draw.current) {
      draw.current.deleteAll();
      setAcreage(null);
      if (onAcreageChange) onAcreageChange(null, null);
      setCurrentPolygon(null);
      setHasChanges(false);
    }
  };

  const handleFitBounds = () => {
    if (!map.current) return;
    
    const data = draw.current?.getAll();
    if (data && data.features.length > 0) {
      const bounds = turf.bbox(data);
      map.current.fitBounds(
        [
          [bounds[0], bounds[1]],
          [bounds[2], bounds[3]],
        ],
        { padding: 50, maxZoom: 16 }
      );
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="relative h-[600px] min-h-[400px] w-full overflow-hidden rounded-lg border">
        <div 
          ref={mapContainer} 
          className="absolute inset-0 h-full w-full" 
          style={{ minHeight: '400px' }}
        />
        
        <div className="absolute bottom-4 right-4 z-10">
          <p className="text-[10px] text-muted-foreground/70 bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
            Imagery may not reflect recent site changes. Verify conditions on-site.
          </p>
        </div>
      
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-1">
          <ToggleGroup type="single" value={mapStyle} onValueChange={(v) => v && handleStyleChange(v as MapStyleKey)} className="gap-1">
            {Object.entries(MAP_STYLES).map(([key, { label }]) => (
              <ToggleGroupItem 
                key={key} 
                value={key} 
                size="sm"
                className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      
        <div className="absolute top-4 right-16 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-4 border">
          <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
            Property Area
            {parcelSource === 'osm' && (
              <span className="text-[10px] text-green-600 font-normal">(verified)</span>
            )}
            {parcelSource === 'estimated' && (
              <span className="text-[10px] text-amber-600 font-normal">(estimate)</span>
            )}
          </div>
          <div className={`text-2xl font-bold ${parcelSource === 'estimated' ? 'text-amber-600' : 'text-primary'}`}>
            {isFetchingParcel ? (
              <span className="flex items-center gap-2 text-base text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Finding boundary...
              </span>
            ) : acreage !== null ? (
              <>
                {parcelSource === 'estimated' && <span className="text-base font-normal">~</span>}
                {acreage} acres
              </>
            ) : (
              "—"
            )}
          </div>
          {acreage !== null && !isFetchingParcel && (
            <div className="text-xs text-muted-foreground mt-1">
              {parcelSource === 'estimated' && '~'}
              {(acreage * 4046.86).toLocaleString(undefined, { maximumFractionDigits: 0 })} m²
            </div>
          )}
          {parcelSource && !isFetchingParcel && (
            <div className="mt-2 pt-2 border-t">
              <Badge 
                variant={parcelSource === 'osm' ? 'default' : parcelSource === 'estimated' ? 'secondary' : 'outline'}
                className={`text-[10px] ${parcelSource === 'osm' ? 'bg-green-600' : ''}`}
              >
                {parcelSource === 'osm' && <MapPin className="h-3 w-3 mr-1" />}
                {parcelSource === 'osm' ? 'Verified boundary' : parcelSource === 'estimated' ? 'Estimated boundary' : 'Your boundary'}
              </Badge>
              {parcelSource === 'osm' && (
                <p className="text-[10px] text-green-600 mt-1 font-medium">
                  ✓ Matched to official property records
                </p>
              )}
              {parcelSource === 'estimated' && (
                <p className="text-[10px] text-amber-600 mt-1">
                  Adjust corners to match your land
                </p>
              )}
              {parcelSource === 'manual' && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Precisely reflects the area you defined
                </p>
              )}
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="absolute bottom-4 left-4 flex gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleFitBounds}
              disabled={!currentPolygon}
            >
              <Maximize2 className="h-4 w-4 mr-1" />
              Fit View
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClear}
              disabled={!currentPolygon}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
            {onSave && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save Boundary
              </Button>
            )}
            {onCreateProject && currentPolygon && acreage && (
              <Button
                size="sm"
                onClick={() => onCreateProject(currentPolygon, acreage)}
              >
                Create Project
              </Button>
            )}
          </div>
        )}

        {!readOnly && !currentPolygon && !isFetchingParcel && (
          <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-4 border max-w-sm">
            <p className="text-sm font-medium text-foreground mb-1">Define your land area</p>
            <p className="text-sm text-muted-foreground">
              Outline your property boundary with the polygon tool for exact precision.
            </p>
          </div>
        )}
        
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
