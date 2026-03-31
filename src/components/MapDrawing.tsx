import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import * as turf from "@turf/turf";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
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
  const geocoderRef = useRef<MapboxGeocoder | null>(null);
  const [acreage, setAcreage] = useState<number | null>(initialAcreage ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingParcel, setIsFetchingParcel] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<GeoJSON.Polygon | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("satellite");
  const [parcelSource, setParcelSource] = useState<'osm' | 'estimated' | 'manual' | null>(null);
  const [parcelMessage, setParcelMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

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
        toast("Define your property boundary", {
          description: "Use the polygon tool to outline the land you want."
        });
        setParcelSource(null);
        setAcreage(null);
        if (onAcreageChange) onAcreageChange(null, null);
        setCurrentPolygon(null);
        return;
      }

      // MVP: Only auto-draw VERIFIED parcels (from OSM)
      // Do NOT auto-draw estimated parcels - require user to manually draw
      if (data?.parcel && draw.current && data.source === 'osm') {
        // Clear any existing drawings
        draw.current.deleteAll();
        
        // Add the fetched parcel to the draw control
        draw.current.add({
          type: 'Feature',
          properties: {},
          geometry: data.parcel,
        });

        // Update area and set source
        const areaInfo = calculateArea(data.parcel);
        setAcreage(areaInfo.acres);
        if (onAcreageChange) onAcreageChange(areaInfo.acres, areaInfo.sqm);
        setCurrentPolygon(data.parcel);
        setHasChanges(true);
        setParcelSource('osm');
        setParcelMessage(data.message);

        // Fit bounds to the parcel
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
        // No verified parcel available - prompt user to draw manually
        setParcelSource(null);
        setAcreage(null);
        if (onAcreageChange) onAcreageChange(null, null);
        setCurrentPolygon(null);
        setParcelMessage(null);
        toast("Define your property boundary", {
          description: "Draw the exact area you want for the most accurate results."
        });
      }
    } catch (err) {
      console.error('Error fetching parcel:', err);
      toast("Define your property boundary", {
        description: "Use the polygon tool to outline the land you want."
      });
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

    console.log("Initializing Mapbox map...");
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [-98.5795, 39.8283],
      zoom: 4,
      pitch: 0,
      trackResize: true,
    });

    // Ensure map resizes correctly when container size changes
    const resizeObserver = new ResizeObserver(() => {
      map.current?.resize();
    });
    resizeObserver.observe(mapContainer.current);

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.ScaleControl(), "bottom-left");
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserHeading: false,
      }),
      "top-right"
    );

    const geocoder = new MapboxGeocoder({
      accessToken: MAPBOX_TOKEN,
      marker: false, // We'll handle the marker ourselves
      placeholder: "Search for an address or location...",
      flyTo: {
        speed: 1.5,
        zoom: 17,
      },
    });
    geocoderRef.current = geocoder;
    map.current.addControl(geocoder, "top-left");

    // Listen for geocoder results to auto-fetch parcel
    geocoder.on('result', (e: { result: { center: [number, number]; place_name?: string } }) => {
      const [lng, lat] = e.result.center;
      console.log('Geocoder result:', e.result.place_name, lng, lat);
      
      // Mark as searched to prevent snap-back
      setHasSearched(true);
      
      // Auto-fetch parcel boundary when address is found
      if (!readOnly) {
        fetchParcelBoundary(lng, lat);
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

      map.current.on("draw.create", () => {
        setHasSearched(true);
        updateArea();
      });
      map.current.on("draw.update", () => {
        setHasSearched(true);
        updateArea();
      });
      map.current.on("draw.delete", () => updateArea());
    }

    // Set initial boundary if provided
    map.current.on('load', () => {
      // ONLY run default/initial positioning if the user hasn't searched or interacted yet
      if (!hasSearched) {
        if (initialBoundary && draw.current) {
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
        }
      }
    });

    return () => {
      resizeObserver.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, [readOnly, initialBoundary, updateArea, fetchParcelBoundary, hasSearched]);

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
      {/* Map Container - Always full width, primary surface */}
      <div className="relative h-[600px] min-h-[400px] w-full overflow-hidden rounded-lg border">
        <div 
          ref={mapContainer} 
          className="absolute inset-0 h-full w-full" 
          style={{ minHeight: '400px' }}
        />
        
        {/* Imagery Recency Notice */}
        <div className="absolute bottom-4 right-4 z-10">
          <p className="text-[10px] text-muted-foreground/70 bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
            Imagery may not reflect recent site changes. Verify conditions on-site.
          </p>
        </div>
      
        {/* Layer Toggle */}
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
      
        {/* Info Panel */}
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

        {/* Action Buttons */}
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

        {/* Instructions */}
        {!readOnly && !currentPolygon && !isFetchingParcel && (
          <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-4 border max-w-sm">
            <p className="text-sm font-medium text-foreground mb-1">Define your land area</p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Search an address</span> to find your property, or{" "}
              <span className="font-medium text-foreground">draw your boundary</span> with the polygon tool for exact precision.
            </p>
          </div>
        )}
        
        {/* Loading overlay for parcel fetch */}
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
