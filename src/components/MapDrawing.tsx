import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import * as turf from "@turf/turf";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2, Save, Trash2, Maximize2, Brain, Leaf, Mountain, Wrench, DollarSign, AlertTriangle, Users, ArrowRight, MapPin } from "lucide-react";
import AnalysisDisclaimer from "@/components/AnalysisDisclaimer";

const MAP_STYLES = {
  satellite: { id: "mapbox://styles/mapbox/satellite-streets-v12", label: "Satellite" },
  streets: { id: "mapbox://styles/mapbox/streets-v12", label: "Streets" },
  terrain: { id: "mapbox://styles/mapbox/outdoors-v12", label: "Terrain" },
  light: { id: "mapbox://styles/mapbox/light-v11", label: "Light" },
} as const;

type MapStyleKey = keyof typeof MAP_STYLES;
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZmxldGNodGFzdGljMTk5MSIsImEiOiJjbWlxNnNjajUwamI2M2VvdmFmbGQ5NTlsIn0.hIurrjB3WXifVT10VgKXRA";

interface LandAnalysis {
  vegetation: {
    type: string;
    density: string;
    recommendations: string[];
  };
  terrain: {
    type: string;
    slope_estimate: string;
    drainage: string;
    recommendations: string[];
  };
  equipment: {
    recommended: string[];
    considerations: string[];
  };
  labor: {
    estimated_crew_size: number;
    estimated_hours: number;
    difficulty: string;
  };
  hazards: string[];
  cost_factors: {
    base_rate_per_acre: number;
    estimated_total: number;
    factors_affecting_cost: string[];
  };
  next_steps?: string[];
  summary: string;
}

import type { LandIntent } from "@/components/IntentSelector";

interface MapDrawingProps {
  initialBoundary?: GeoJSON.Polygon | null;
  initialAcreage?: number | null;
  onSave?: (boundary: GeoJSON.Polygon, acreage: number) => Promise<void>;
  onCreateProject?: (boundary: GeoJSON.Polygon, acreage: number, analysis?: LandAnalysis) => void;
  readOnly?: boolean;
  intent?: LandIntent | null;
  autoAnalyze?: boolean;
}

export default function MapDrawing({
  initialBoundary,
  initialAcreage,
  onSave,
  onCreateProject,
  readOnly = false,
  intent = null,
  autoAnalyze = false,
}: MapDrawingProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const geocoderRef = useRef<MapboxGeocoder | null>(null);
  const [acreage, setAcreage] = useState<number | null>(initialAcreage ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingParcel, setIsFetchingParcel] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<GeoJSON.Polygon | null>(null);
  const [analysis, setAnalysis] = useState<LandAnalysis | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("satellite");
  const [parcelSource, setParcelSource] = useState<'osm' | 'estimated' | 'manual' | null>(null);
  const [parcelMessage, setParcelMessage] = useState<string | null>(null);

  const handleStyleChange = useCallback((style: MapStyleKey) => {
    if (!map.current || !style) return;
    setMapStyle(style);
    map.current.setStyle(MAP_STYLES[style].id);
  }, []);


  const calculateArea = useCallback((polygon: GeoJSON.Polygon) => {
    const area = turf.area(polygon);
    const acres = area * 0.000247105;
    return Math.round(acres * 100) / 100;
  }, []);

  const updateArea = useCallback((fromParcel = false) => {
    if (!draw.current) return;
    
    const data = draw.current.getAll();
    if (data.features.length > 0) {
      const polygon = data.features[0].geometry as GeoJSON.Polygon;
      const acres = calculateArea(polygon);
      setAcreage(acres);
      setCurrentPolygon(polygon);
      setHasChanges(true);
      setAnalysis(null);
      setShowAnalysis(false);
      if (!fromParcel) {
        setParcelSource('manual');
        setParcelMessage(null);
      }
    } else {
      setAcreage(null);
      setCurrentPolygon(null);
      setParcelSource(null);
      setParcelMessage(null);
    }
  }, [calculateArea]);

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
          description: "Use the polygon tool to outline the land you want analyzed."
        });
        setParcelSource(null);
        setAcreage(null);
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
        const acres = calculateArea(data.parcel);
        setAcreage(acres);
        setCurrentPolygon(data.parcel);
        setHasChanges(true);
        setParcelSource('osm');
        setParcelMessage(data.message);
        setAnalysis(null);
        setShowAnalysis(false);

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
        // Don't show acreage until user draws boundary
        setParcelSource(null);
        setAcreage(null);
        setCurrentPolygon(null);
        setParcelMessage(null);
        toast("Define your property boundary", {
          description: "Draw the exact area you want analyzed for the most accurate results."
        });
      }
    } catch (err) {
      console.error('Error fetching parcel:', err);
      toast("Define your property boundary", {
        description: "Use the polygon tool to outline the land you want analyzed."
      });
      setParcelSource(null);
      setAcreage(null);
      setCurrentPolygon(null);
    } finally {
      setIsFetchingParcel(false);
    }
  }, [calculateArea]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [-98.5795, 39.8283],
      zoom: 4,
      pitch: 0,
    });

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

      map.current.on("draw.create", () => updateArea(false));
      map.current.on("draw.update", () => updateArea(false));
      map.current.on("draw.delete", () => {
        setAcreage(null);
        setCurrentPolygon(null);
        setHasChanges(false);
        setAnalysis(null);
        setShowAnalysis(false);
        setParcelSource(null);
        setParcelMessage(null);
      });
    }


    map.current.on("load", () => {
      if (initialBoundary && map.current) {
        if (readOnly) {
          map.current.addSource("boundary", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: initialBoundary,
            },
          });

          map.current.addLayer({
            id: "boundary-fill",
            type: "fill",
            source: "boundary",
            paint: {
              "fill-color": "#22c55e",
              "fill-opacity": 0.3,
            },
          });

          map.current.addLayer({
            id: "boundary-line",
            type: "line",
            source: "boundary",
            paint: {
              "line-color": "#16a34a",
              "line-width": 3,
            },
          });
        } else if (draw.current) {
          draw.current.add({
            type: "Feature",
            properties: {},
            geometry: initialBoundary,
          });
        }

        const bounds = turf.bbox(initialBoundary);
        map.current.fitBounds(
          [
            [bounds[0], bounds[1]],
            [bounds[2], bounds[3]],
          ],
          { padding: 50, maxZoom: 16 }
        );

        if (initialAcreage) {
          setAcreage(initialAcreage);
        }
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [initialBoundary, initialAcreage, readOnly, updateArea, fetchParcelBoundary]);

  const handleSave = async () => {
    if (!currentPolygon || !onSave || !acreage) return;
    
    setIsSaving(true);
    try {
      await onSave(currentPolygon, acreage);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!currentPolygon || !acreage) {
      toast.error("Please draw a boundary first");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-land', {
        body: { 
          boundary: currentPolygon, 
          acreage,
          intent: intent || undefined
        }
      });

      if (error) {
        console.error('Analysis error:', error);
        toast.error(error.message || "Failed to analyze land");
        return;
      }

      if (data?.analysis) {
        setAnalysis(data.analysis);
        setShowAnalysis(true);
        toast.success("Land analysis complete!");
      }
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error("Failed to analyze land");
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentPolygon, acreage, intent]);

  // Auto-analyze when boundary is drawn and autoAnalyze is enabled
  useEffect(() => {
    if (autoAnalyze && currentPolygon && acreage && !analysis && !isAnalyzing) {
      // Small delay to let the map settle
      const timer = setTimeout(() => {
        handleAnalyze();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoAnalyze, currentPolygon, acreage, analysis, isAnalyzing, handleAnalyze]);

  const handleClear = () => {
    if (draw.current) {
      draw.current.deleteAll();
      setAcreage(null);
      setCurrentPolygon(null);
      setHasChanges(false);
      setAnalysis(null);
      setShowAnalysis(false);
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-500/20 text-green-700';
      case 'moderate': return 'bg-yellow-500/20 text-yellow-700';
      case 'challenging': return 'bg-red-500/20 text-red-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getDensityColor = (density: string) => {
    switch (density.toLowerCase()) {
      case 'low': return 'bg-green-500/20 text-green-700';
      case 'medium': return 'bg-yellow-500/20 text-yellow-700';
      case 'high': return 'bg-red-500/20 text-red-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Map Container - Always full width, primary surface */}
      <div className="relative h-[600px] min-h-[400px]">
        <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
        
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
            <Button
              size="sm"
              variant="outline"
              onClick={handleAnalyze}
              disabled={!currentPolygon || isAnalyzing}
              className="bg-primary/10 hover:bg-primary/20 border-primary/30"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Brain className="h-4 w-4 mr-1" />
              )}
              AI Analysis
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
            {onCreateProject && currentPolygon && acreage && !showAnalysis && (
              <Button
                size="sm"
                onClick={() => onCreateProject(currentPolygon, acreage, analysis || undefined)}
              >
                Create Project
              </Button>
            )}
          </div>
        )}

        {/* Instructions */}
        {!readOnly && !currentPolygon && !isFetchingParcel && (
          <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-4 border max-w-sm">
            <p className="text-sm font-medium text-foreground mb-1">You decide what land gets analyzed</p>
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

      {/* Analysis Panel - Below the map, full width continuation */}
      {showAnalysis && analysis && (
        <div className="border-t bg-background px-4 py-10 sm:px-6 lg:px-8 animate-in fade-in duration-300">
          <div className="max-w-5xl mx-auto space-y-10">
            {/* Analysis Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-primary/10 flex-shrink-0">
                  <Brain className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold tracking-tight">Land Clearing Assessment</h3>
                  <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">{analysis.summary}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Analysis is based on mapped boundaries and available data.</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAnalysis(false)} className="flex-shrink-0">
                Collapse
              </Button>
            </div>

            {/* Analysis Grid - Responsive layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Vegetation */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-green-600" />
                    Vegetation
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 px-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{analysis.vegetation.type}</span>
                    <Badge className={getDensityColor(analysis.vegetation.density)}>
                      {analysis.vegetation.density} density
                    </Badge>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    {analysis.vegetation.recommendations.map((rec, i) => (
                      <li key={i} className="leading-relaxed">• {rec}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Terrain */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mountain className="h-5 w-5 text-amber-600" />
                    Terrain
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 px-5 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{analysis.terrain.type}</span>
                    <Badge variant="outline">{analysis.terrain.slope_estimate} slope</Badge>
                    <Badge variant="outline">{analysis.terrain.drainage} drainage</Badge>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    {analysis.terrain.recommendations.map((rec, i) => (
                      <li key={i} className="leading-relaxed">• {rec}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Equipment */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-blue-600" />
                    Equipment
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 px-5 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.equipment.recommended.map((eq, i) => (
                      <Badge key={i} variant="secondary">{eq}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground/70">Common equipment examples. Contractors may use different methods or equipment.</p>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    {analysis.equipment.considerations.map((con, i) => (
                      <li key={i} className="leading-relaxed">• {con}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Labor */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Labor Estimate
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 px-5">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-2xl font-bold">{analysis.labor.estimated_crew_size}</div>
                      <div className="text-sm text-muted-foreground">Crew Size</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{analysis.labor.estimated_hours}</div>
                      <div className="text-sm text-muted-foreground">Hours</div>
                    </div>
                    <div>
                      <Badge className={getDifficultyColor(analysis.labor.difficulty)}>
                        {analysis.labor.difficulty}
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">Difficulty</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Estimate */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Cost Estimate
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 px-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Base rate/acre:</span>
                    <span className="font-medium">${analysis.cost_factors.base_rate_per_acre}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="font-medium">Estimated Total:</span>
                    <span className="text-xl font-bold text-primary">
                      ${analysis.cost_factors.estimated_total.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/70">Actual costs vary by contractor, access, and disposal method.</p>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Cost factors:</span>
                    <ul className="mt-1.5 space-y-1">
                      {analysis.cost_factors.factors_affecting_cost.map((factor, i) => (
                        <li key={i} className="leading-relaxed">• {factor}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Hazards */}
              {analysis.hazards.length > 0 && (
                <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="h-5 w-5" />
                      Potential Hazards
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 px-5">
                    <ul className="text-sm space-y-2">
                      {analysis.hazards.map((hazard, i) => (
                        <li key={i} className="flex items-start gap-2 leading-relaxed text-muted-foreground">
                          <span className="text-amber-600 flex-shrink-0">•</span>
                          {hazard}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Next Steps - Full width, prominent placement */}
            {analysis.next_steps && analysis.next_steps.length > 0 && (
              <Card className="border-primary/30 bg-primary/5 shadow-sm">
                <CardHeader className="pb-3 pt-5 px-5">
                  <CardTitle className="text-lg flex items-center gap-2 text-primary">
                    <ArrowRight className="h-5 w-5" />
                    Recommended Next Steps (Before Hiring)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-5 px-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analysis.next_steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-background/60 border border-primary/10">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-sm leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Informational Disclaimer */}
            <AnalysisDisclaimer />

            {/* Save Project CTA */}
            {onCreateProject && currentPolygon && acreage && (
              <div className="flex justify-center pt-6 pb-10">
                <Button
                  size="lg"
                  onClick={() => onCreateProject(currentPolygon, acreage, analysis)}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save This Analysis
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Show Analysis Button when collapsed */}
      {analysis && !showAnalysis && (
        <div className="border-t bg-muted/30 p-4 flex items-center justify-center">
          <Button onClick={() => setShowAnalysis(true)} className="gap-2">
            <Brain className="h-4 w-4" />
            View Land Analysis
          </Button>
        </div>
      )}
    </div>
  );
}
