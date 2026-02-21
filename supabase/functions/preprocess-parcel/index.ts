// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT token for authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth context for validation
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate the JWT and get authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use validated user ID from JWT, not from request body
    const user_id = claimsData.claims.sub;

    // Create service role client for database operations that need elevated privileges
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { parcel_geometry, lat, lng, property_goal } = await req.json();

    // Log operation start without PII

    // ---- AUTO PROPERTY CLASSIFICATION ----
    const property_type = detectPropertyType(parcel_geometry);

    // ---- FETCH TERRAIN / SLOPE ----
    const terrain = await fetchTerrain(lat, lng);

    // ---- VEGETATION INDEX (simplified MVP version) ----
    const vegetation = computeVegetation(parcel_geometry);

    // ---- WATERFLOW SIM (basic DEM routing) ----
    const waterflow = simulateWaterFlow(terrain);

    // Combine into one file
    const result = {
      user_id,
      parcel_geometry,
      lat,
      lng,
      property_goal,
      property_type,
      terrain,
      vegetation,
      waterflow,
      created_at: new Date().toISOString(),
    };

    // Store file in Supabase
    const filePath = `preprocessed/${user_id}/${Date.now()}.json`;

    const { error: uploadError } = await supabase.storage
      .from("preprocessed")
      .upload(filePath, JSON.stringify(result), {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadError) {
      // Log generic error without exposing internal details
      console.error("Upload failed");
      throw new Error("Failed to upload preprocessed data");
    }

    // Create analysis job row
    const { data: job, error: jobError } = await supabase
      .from("analysis_jobs")
      .insert({
        user_id,
        preprocess_path: filePath,
        status: "pending",
      })
      .select()
      .single();

    if (jobError) {
      // Log generic error without exposing internal details
      console.error("Job creation failed");
      throw new Error("Failed to create analysis job");
    }

    // Log success without exposing IDs

    return new Response(JSON.stringify({ job_id: job.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    // Log generic error for operational monitoring
    console.error("Preprocess parcel failed");
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ----------- HELPERS --------------

function detectPropertyType(geometry: any) {
  // SIMPLE MVP LOGIC
  const area = geometry?.area || 0;

  if (area < 2) return "residential";
  if (area < 15 && isTreeDense(geometry)) return "wooded";
  if (area > 15 && isOpenField(geometry)) return "pasture";
  return "mixed";
}

function isTreeDense(g: any) {
  return (g?.ndvi || 0) > 0.45;
}

function isOpenField(g: any) {
  return (g?.ndvi || 0) < 0.2;
}

async function fetchTerrain(lat: number, lng: number) {
  // Placeholder - integrate with elevation API later
  return {
    slope: "generated_value",
    elevation: "generated_value",
    aspect: "generated_value",
  };
}

function computeVegetation(geo: any) {
  return {
    ndvi: Math.random(),
    canopy_density: Math.random(),
  };
}

function simulateWaterFlow(terrain: any) {
  return {
    flow_map: "placeholder",
    erosion_hotspots: [],
  };
}
