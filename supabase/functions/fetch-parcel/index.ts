import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PolygonGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

// Use Regrid (free tier available) or simulate parcel lookup
// For demo purposes, we'll use OpenStreetMap to get building/property outlines
async function fetchParcelFromCoordinates(lng: number, lat: number): Promise<PolygonGeometry | null> {
  try {
    // Try OpenStreetMap Nominatim to get building/property outlines
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&extratags=1&polygon_geojson=1`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'LandProAI/1.0 (land analysis application)',
      },
    });

    if (!response.ok) {
      console.log('Nominatim API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    // Check if we got a polygon geometry back
    if (data.geojson && data.geojson.type === 'Polygon') {
      return data.geojson as PolygonGeometry;
    }
    
    if (data.geojson && data.geojson.type === 'MultiPolygon') {
      // Take the first polygon from the MultiPolygon
      const coords = data.geojson.coordinates[0];
      return {
        type: 'Polygon',
        coordinates: coords
      };
    }

    // If we have a point result but no polygon, try to find the building/area
    if (data.osm_type && data.osm_id) {
      // Try to get the actual boundary from OSM
      const osmUrl = `https://nominatim.openstreetmap.org/lookup?osm_ids=${data.osm_type[0].toUpperCase()}${data.osm_id}&format=json&polygon_geojson=1`;
      
      const osmResponse = await fetch(osmUrl, {
        headers: {
          'User-Agent': 'LandProAI/1.0 (land analysis application)',
        },
      });

      if (osmResponse.ok) {
        const osmData = await osmResponse.json();
        if (osmData[0]?.geojson?.type === 'Polygon') {
          return osmData[0].geojson as PolygonGeometry;
        }
        if (osmData[0]?.geojson?.type === 'MultiPolygon') {
          const coords = osmData[0].geojson.coordinates[0];
          return {
            type: 'Polygon',
            coordinates: coords
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching parcel data:', error);
    return null;
  }
}

// Generate a reasonable estimated parcel boundary based on typical lot sizes
function generateEstimatedParcel(lng: number, lat: number): PolygonGeometry {
  // Estimate parcel size based on typical lot
  // Typical residential lot: ~0.25 acres = ~1000 m² = ~32m x 32m
  
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(lat * Math.PI / 180);
  
  // Default to roughly 0.25 acre rectangular lot (30m x 35m)
  const halfWidthM = 17.5;
  const halfHeightM = 15;
  
  const halfWidthDeg = halfWidthM / metersPerDegLng;
  const halfHeightDeg = halfHeightM / metersPerDegLat;
  
  // Create a slightly irregular polygon (more realistic)
  const variation = 0.1; // 10% variation
  
  const coordinates = [[
    [lng - halfWidthDeg * (1 + variation * 0.2), lat - halfHeightDeg],
    [lng + halfWidthDeg * (1 - variation * 0.1), lat - halfHeightDeg * (1 + variation * 0.15)],
    [lng + halfWidthDeg, lat + halfHeightDeg * (1 - variation * 0.1)],
    [lng - halfWidthDeg * (1 - variation * 0.15), lat + halfHeightDeg],
    [lng - halfWidthDeg * (1 + variation * 0.2), lat - halfHeightDeg], // Close the polygon
  ]];
  
  return {
    type: 'Polygon',
    coordinates,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lng, lat } = await req.json();

    if (typeof lng !== 'number' || typeof lat !== 'number') {
      return new Response(
        JSON.stringify({ error: "Invalid coordinates" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching parcel for coordinates: ${lng}, ${lat}`);

    // First, try to fetch actual parcel data
    const actualParcel = await fetchParcelFromCoordinates(lng, lat);
    
    if (actualParcel) {
      console.log('Found actual parcel boundary');
      return new Response(
        JSON.stringify({
          parcel: actualParcel,
          source: 'osm',
          confidence: 'high',
          message: 'Property boundary found',
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no actual parcel found, generate an estimated boundary
    console.log('Generating estimated parcel boundary');
    const estimatedParcel = generateEstimatedParcel(lng, lat);
    
    return new Response(
      JSON.stringify({
        parcel: estimatedParcel,
        source: 'estimated',
        confidence: 'low',
        message: 'Estimated boundary - adjust as needed',
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in fetch-parcel function:', error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch parcel data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
