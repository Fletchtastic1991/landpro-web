import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import * as turf from "@turf/turf";
import type { Polygon, FeatureCollection } from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2, Save, Trash2, Maximize2, Brain, Leaf, Mountain, Wrench, DollarSign, AlertTriangle, Users, Ruler, MapPin } from "lucide-react";

const MAP_STYLES = {
  custom: { id: "mapbox://styles/fletchtastic1991/cmkczdlr6006d01qn119r4anr", label: "LandPro" },
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
  summary: string;
}

interface MapDrawingProps {
  initialBoundary?: Polygon | null;
  initialAcreage?: number | null;
  onSave?: (boundary: Polygon, acreage: number) => Promise<void>;
  onCreateProject?: (boundary: Polygon, acreage: number, analysis?: LandAnalysis) => void;
  readOnly?: boolean;
}

export default function MapDrawing({
  initialBoundary,
  initialAcreage,
  onSave,
  onCreateProject,
  readOnly = false,
}: MapDrawingProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [acreage, setAcreage] = useState<number | null>(initialAcreage ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<Polygon | null>(null);
  const [analysis, setAnalysis] = useState<LandAnalysis | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("custom");
  const [measureMode, setMeasureMode] = useState<'none' | 'distance' | 'area'>('none');
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const [measureResult, setMeasureResult] = useState<string | null>(null);
  const measureSourceRef = useRef<boolean>(false);

  const handleStyleChange = useCallback((style: MapStyleKey) => {
    if (!map.current || !style) return;
    setMapStyle(style);
    map.current.setStyle(MAP_STYLES[style].id);
  }, []);

  const clearMeasurement = useCallback(() => {
    setMeasurePoints([]);
    setMeasureResult(null);
    if (map.current && measureSourceRef.current) {
      try {
        if (map.current.getLayer('measure-lines')) map.current.removeLayer('measure-lines');
        if (map.current.getLayer('measure-points')) map.current.removeLayer('measure-points');
        if (map.current.getLayer('measure-fill')) map.current.removeLayer('measure-fill');
        if (map.current.getSource('measure-geojson')) map.current.removeSource('measure-geojson');
        measureSourceRef.current = false;
      } catch (e) {
        // Ignore errors if layers don't exist
      }
    }
  }, []);

  const toggleMeasureMode = useCallback((mode: 'distance' | 'area') => {
    if (measureMode === mode) {
      setMeasureMode('none');
      clearMeasurement();
    } else {
      setMeasureMode(mode);
      clearMeasurement();
    }
  }, [measureMode, clearMeasurement]);

  const updateMeasurementDisplay = useCallback((points: [number, number][]) => {
    if (!map.current || points.length < 2) return;

    const geojson: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: measureMode === 'area' && points.length >= 3
            ? { type: 'Polygon', coordinates: [[...points, points[0]]] }
            : { type: 'LineString', coordinates: points }
        },
        ...points.map(coord => ({
          type: 'Feature' as const,
          properties: {},
          geometry: { type: 'Point' as const, coordinates: coord }
        }))
      ]
    };

    if (!measureSourceRef.current) {
      map.current.addSource('measure-geojson', { type: 'geojson', data: geojson });
      
      if (measureMode === 'area') {
        map.current.addLayer({
          id: 'measure-fill',
          type: 'fill',
          source: 'measure-geojson',
          filter: ['==', '$type', 'Polygon'],
          paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.2 }
        });
      }
      
      map.current.addLayer({
        id: 'measure-lines',
        type: 'line',
        source: 'measure-geojson',
        filter: ['in', '$type', 'LineString', 'Polygon'],
        paint: { 'line-color': '#3b82f6', 'line-width': 2, 'line-dasharray': [2, 2] }
      });
      
      map.current.addLayer({
        id: 'measure-points',
        type: 'circle',
        source: 'measure-geojson',
        filter: ['==', '$type', 'Point'],
        paint: { 'circle-radius': 5, 'circle-color': '#3b82f6', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 }
      });
      
      measureSourceRef.current = true;
    } else {
      (map.current.getSource('measure-geojson') as mapboxgl.GeoJSONSource)?.setData(geojson);
    }

    // Calculate measurement
    if (measureMode === 'distance') {
      const line = turf.lineString(points);
      const length = turf.length(line, { units: 'feet' });
      setMeasureResult(length >= 5280 
        ? `${(length / 5280).toFixed(2)} miles`
        : `${Math.round(length)} ft`
      );
    } else if (measureMode === 'area' && points.length >= 3) {
      const polygon = turf.polygon([[...points, points[0]]]);
      const areaM2 = turf.area(polygon);
      const acres = areaM2 * 0.000247105;
      setMeasureResult(acres >= 1 
        ? `${acres.toFixed(2)} acres`
        : `${Math.round(areaM2 * 10.7639)} sq ft`
      );
    }
  }, [measureMode]);

  const calculateArea = useCallback((polygon: Polygon) => {
    const area = turf.area(polygon);
    const acres = area * 0.000247105;
    return Math.round(acres * 100) / 100;
  }, []);

  const updateArea = useCallback(() => {
    if (!draw.current) return;
    
    const data = draw.current.getAll();
    if (data.features.length > 0) {
      const polygon = data.features[0].geometry as Polygon;
      const acres = calculateArea(polygon);
      setAcreage(acres);
      setCurrentPolygon(polygon);
      setHasChanges(true);
      setAnalysis(null);
      setShowAnalysis(false);
    } else {
      setAcreage(null);
      setCurrentPolygon(null);
    }
  }, [calculateArea]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/fletchtastic1991/cmkczdlr6006d01qn119r4anr",
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
      marker: true,
      placeholder: "Search for an address or location...",
      flyTo: {
        speed: 1.5,
        zoom: 16,
      },
    });
    map.current.addControl(geocoder, "top-left");

    if (!readOnly) {
      draw.current = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
        defaultMode: "simple_select",
        styles: [
          // LandPro Parcel Fill
          {
            id: "parcel-fill",
            type: "fill",
            filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
            paint: {
              "fill-color": "#22c55e",
              "fill-opacity": 0.25,
            },
          },
          // LandPro Parcel Outline
          {
            id: "parcel-outline",
            type: "line",
            filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
            paint: {
              "line-color": "#16a34a",
              "line-width": 2,
            },
          },
          {
            id: "gl-draw-polygon-midpoint",
            type: "circle",
            filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
            paint: {
              "circle-radius": 5,
              "circle-color": "#16a34a",
            },
          },
          {
            id: "gl-draw-polygon-vertex-halo",
            type: "circle",
            filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"]],
            paint: {
              "circle-radius": 8,
              "circle-color": "#fff",
            },
          },
          {
            id: "gl-draw-polygon-vertex",
            type: "circle",
            filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"]],
            paint: {
              "circle-radius": 5,
              "circle-color": "#16a34a",
            },
          },
        ],
      });

      map.current.addControl(draw.current, "top-left");

      // LANDPRO DRAW EVENTS
      const updateParcel = () => {
        const data = draw.current?.getAll();
        if (!data || !data.features.length) return;

        const parcel = data.features[0];
        console.log("📍 Parcel drawn:", parcel);

        // 👉 LandPro logic hooks in here
        updateArea();
      };

      const clearParcel = () => {
        console.log("🗑 Parcel removed");
        setAcreage(null);
        setCurrentPolygon(null);
        setHasChanges(false);
        setAnalysis(null);
        setShowAnalysis(false);
      };

      map.current.on("draw.create", updateParcel);
      map.current.on("draw.update", updateParcel);
      map.current.on("draw.delete", clearParcel);
    }

    // Measurement click handler
    const handleMeasureClick = (e: mapboxgl.MapMouseEvent) => {
      if (measureMode === 'none') return;
      
      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setMeasurePoints(prev => {
        const newPoints = [...prev, coords];
        updateMeasurementDisplay(newPoints);
        return newPoints;
      });
    };

    map.current.on('click', handleMeasureClick);

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
  }, [initialBoundary, initialAcreage, readOnly, updateArea, measureMode, updateMeasurementDisplay]);

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

  const handleAnalyze = async () => {
    if (!currentPolygon || !acreage) {
      toast.error("Please draw a boundary first");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-land', {
        body: { 
          boundary: currentPolygon, 
          acreage 
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
  };

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
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={mapContainer} className={`absolute inset-0 rounded-lg ${showAnalysis ? 'w-[60%]' : 'w-full'} transition-all duration-300`} />
      
      {/* Layer Toggle */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-1" style={{ left: showAnalysis ? '30%' : '50%' }}>
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
      
      {/* Analysis Panel */}
      {showAnalysis && analysis && (
        <div className="absolute right-0 top-0 bottom-0 w-[40%] overflow-y-auto bg-background border-l p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Land Analysis
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowAnalysis(false)}>
              ✕
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">{analysis.summary}</p>

          {/* Vegetation */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Leaf className="h-4 w-4 text-green-600" />
                Vegetation
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{analysis.vegetation.type}</span>
                <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getDensityColor(analysis.vegetation.density)}`}>
                  {analysis.vegetation.density} density
                </div>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {analysis.vegetation.recommendations.map((rec, i) => (
                  <li key={i}>• {rec}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Terrain */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mountain className="h-4 w-4 text-amber-600" />
                Terrain
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{analysis.terrain.type}</span>
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-foreground">{analysis.terrain.slope_estimate} slope</div>
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-foreground">{analysis.terrain.drainage} drainage</div>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {analysis.terrain.recommendations.map((rec, i) => (
                  <li key={i}>• {rec}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Equipment */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-600" />
                Equipment
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 space-y-2">
              <div className="flex flex-wrap gap-1">
                {analysis.equipment.recommended.map((eq, i) => (
                  <div key={i} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">{eq}</div>
                ))}
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {analysis.equipment.considerations.map((con, i) => (
                  <li key={i}>• {con}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Labor */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Labor Estimate
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xl font-bold">{analysis.labor.estimated_crew_size}</div>
                  <div className="text-xs text-muted-foreground">Crew Size</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{analysis.labor.estimated_hours}</div>
                  <div className="text-xs text-muted-foreground">Hours</div>
                </div>
                <div>
                  <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getDifficultyColor(analysis.labor.difficulty)}`}>
                    {analysis.labor.difficulty}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Difficulty</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Estimate */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Cost Estimate
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Base rate/acre:</span>
                <span className="font-medium">${analysis.cost_factors.base_rate_per_acre}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-medium">Estimated Total:</span>
                <span className="text-lg font-bold text-primary">
                  ${analysis.cost_factors.estimated_total.toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Cost factors:</span>
                <ul className="mt-1 space-y-0.5">
                  {analysis.cost_factors.factors_affecting_cost.map((factor, i) => (
                    <li key={i}>• {factor}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Hazards */}
          {analysis.hazards.length > 0 && (
            <Card className="border-destructive/50">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Potential Hazards
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <ul className="text-xs space-y-1">
                  {analysis.hazards.map((hazard, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-destructive">⚠</span>
                      {hazard}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      {/* Info Panel */}
      <div className="absolute top-4 right-16 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-4 border" style={{ right: showAnalysis ? 'calc(40% + 4rem)' : '4rem' }}>
        <div className="text-sm font-medium text-muted-foreground mb-1">
          Property Area
        </div>
        <div className="text-2xl font-bold text-primary">
          {acreage !== null ? `${acreage} acres` : "—"}
        </div>
        {acreage !== null && (
          <div className="text-xs text-muted-foreground mt-1">
            {(acreage * 4046.86).toLocaleString()} m²
          </div>
        )}
      </div>

      {/* Measurement Tools - positioned top-right below navigation controls */}
      {!readOnly && (
        <div 
          className="absolute bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-2 space-y-1 z-10" 
          style={{ 
            top: '10rem', 
            right: showAnalysis ? 'calc(40% + 1rem)' : '1rem' 
          }}
        >
          <div className="text-xs font-medium text-muted-foreground px-2 pb-1 border-b mb-1">
            Measure
          </div>
          <Button
            variant={measureMode === 'distance' ? 'default' : 'ghost'}
            size="sm"
            className="w-full justify-start"
            onClick={() => toggleMeasureMode('distance')}
          >
            <Ruler className="h-4 w-4 mr-2" />
            Distance
          </Button>
          <Button
            variant={measureMode === 'area' ? 'default' : 'ghost'}
            size="sm"
            className="w-full justify-start"
            onClick={() => toggleMeasureMode('area')}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Area
          </Button>
          {measureMode !== 'none' && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={clearMeasurement}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Measurement Result */}
      {measureResult && (
        <div className="absolute top-4 left-4 bg-blue-500/90 text-white rounded-lg shadow-lg px-4 py-2 border">
          <div className="text-xs font-medium opacity-80">
            {measureMode === 'distance' ? 'Distance' : 'Area'}
          </div>
          <div className="text-lg font-bold">{measureResult}</div>
        </div>
      )}

      {/* Measure Mode Instructions */}
      {measureMode !== 'none' && !measureResult && (
        <div className="absolute top-4 left-4 bg-blue-500/90 text-white rounded-lg shadow-lg px-4 py-2">
          <div className="text-sm">
            Click on map to {measureMode === 'distance' ? 'measure distance' : 'measure area'}
            {measureMode === 'area' && measurePoints.length < 3 && ' (min 3 points)'}
          </div>
        </div>
      )}

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
          {onCreateProject && currentPolygon && acreage && (
            <Button
              size="sm"
              onClick={() => onCreateProject(currentPolygon, acreage, analysis || undefined)}
            >
              Create Project
            </Button>
          )}
        </div>
      )}

      {/* Show Analysis Button when collapsed */}
      {analysis && !showAnalysis && (
        <div className="absolute bottom-4 right-4">
          <Button size="sm" onClick={() => setShowAnalysis(true)}>
            <Brain className="h-4 w-4 mr-1" />
            View Analysis
          </Button>
        </div>
      )}

      {/* Instructions */}
      {!readOnly && !currentPolygon && (
        <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border max-w-xs">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Draw a polygon:</span>{" "}
            Click the polygon tool, then click on the map to add points. Double-click to finish.
          </p>
        </div>
      )}
    </div>
  );
}
