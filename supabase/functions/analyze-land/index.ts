// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/// <reference lib="deno.window" />
declare global {
  namespace Deno {
    const env: {
      get(key: string): string | undefined;
    };
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation
function validateRequest(body: unknown): { valid: true; data: { boundary: any; acreage: number; location?: string; intent?: string } } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { boundary, acreage, location, intent } = body as any;

  if (!boundary || typeof boundary !== 'object') {
    return { valid: false, error: 'Boundary is required and must be a GeoJSON object' };
  }

  if (boundary.type !== 'Polygon') {
    return { valid: false, error: 'Boundary must be a GeoJSON Polygon' };
  }

  if (!Array.isArray(boundary.coordinates) || boundary.coordinates.length === 0) {
    return { valid: false, error: 'Boundary must have coordinates' };
  }

  const ring = boundary.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) {
    return { valid: false, error: 'Polygon must have at least 4 coordinate pairs' };
  }

  for (const coord of ring) {
    if (!Array.isArray(coord) || coord.length < 2 || typeof coord[0] !== 'number' || typeof coord[1] !== 'number') {
      return { valid: false, error: 'Invalid coordinate format' };
    }
    if (coord[0] < -180 || coord[0] > 180 || coord[1] < -90 || coord[1] > 90) {
      return { valid: false, error: 'Coordinates out of valid range' };
    }
  }

  if (typeof acreage !== 'number' || acreage <= 0 || acreage > 10000) {
    return { valid: false, error: 'Acreage must be a positive number up to 10,000' };
  }

  if (location !== undefined && (typeof location !== 'string' || location.length > 500)) {
    return { valid: false, error: 'Location must be a string under 500 characters' };
  }

  const validIntents = ['build', 'clear', 'farm', 'evaluate'];
  if (intent !== undefined && !validIntents.includes(intent)) {
    return { valid: false, error: `Intent must be one of: ${validIntents.join(', ')}` };
  }

  return { valid: true, data: { boundary, acreage, location, intent } };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // @ts-ignore
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    const requestBody = await req.json();
    const validation = validateRequest(requestBody);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { boundary, acreage, location, intent } = validation.data;

    // @ts-ignore
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const coordinates = boundary.coordinates[0];
    const centroid = coordinates.reduce(
      (acc: [number, number], coord: [number, number]) => [acc[0] + coord[0], acc[1] + coord[1]],
      [0, 0]
    ).map((v: number) => v / coordinates.length);

    // Intent-specific analysis focus
    const intentContext: Record<string, string> = {
      build: `The landowner wants to BUILD on this land. Focus your analysis on:
- Site preparation requirements (clearing, grading, leveling)
- Soil stability and foundation considerations
- Access roads and utility routing
- Drainage and water management for construction
- Permitting considerations based on terrain
- Cost estimates for site prep before construction`,
      
      clear: `The landowner wants to CLEAR this land. Focus your analysis on:
- Vegetation removal requirements (trees, brush, stumps)
- Equipment needed for efficient clearing
- Debris disposal and burn pile considerations
- Erosion control after clearing
- Timeline and crew requirements
- Cost estimates for complete land clearing`,
      
      farm: `The landowner wants to FARM this land. Focus your analysis on:
- Soil quality and composition estimates
- Drainage and irrigation needs
- Terrain suitability for crops or livestock
- Land preparation for agricultural use
- Seasonal considerations
- Cost estimates for agricultural preparation`,
      
      evaluate: `The landowner wants to EVALUATE this land for general assessment. Focus your analysis on:
- Overall land characteristics and potential uses
- Property strengths and challenges
- Comparative value factors
- Development potential
- Maintenance considerations
- General cost estimates for various improvements`
    };

    const intentFocus = intent && intentContext[intent] 
      ? intentContext[intent] 
      : intentContext['evaluate'];

const prompt = `You are the LandPro Brain — a deterministic land clearing assessment system. You produce stable, invariant-compliant analysis that a landowner can act on with confidence.

=== SYSTEM INVARIANTS (VIOLATION = SYSTEM ERROR) ===

INVARIANT 1: DEVELOPMENT CLASSIFICATION LOCK
- Initial parcel development classification (Raw / Partially Developed / Developed) is inferred ONLY from:
  • Parcel boundary geometry
  • Mapped features within the boundary
  • Surrounding development context visible on the map
- Once inferred for a given parcel boundary, this classification is LOCKED
- Re-running analysis MUST NOT change development classification unless:
  • The parcel boundary geometry changes, OR
  • A user-declared decision explicitly alters development state (recorded in Memory Core)
- Classification is deterministic: same boundary + same context = same classification ALWAYS

INVARIANT 2: ANALYSIS VS DECISION SEPARATION
- Analysis describes observed or inferred conditions based on available data
- Decision State reflects ONLY user-declared actions or confirmations
- The system MUST NOT elevate analysis conclusions into decisions
- PROHIBITED decision-state terms (unless supported by explicit decision memory):
  • "Build-Ready"
  • "Clearing Complete"
  • "Development Ready"
  • "Approved for construction"
  • "Ready to build"
- Instead, use conditional language such as:
  • "Potentially buildable pending verification"
  • "Not build-ready (decision incomplete)"
  • "Conditional readiness — requires [specific verification]"

INVARIANT 3: CONDITIONAL READINESS ENFORCEMENT
- If ANY of the following are missing, uncertain, or unverified:
  • Required surveys (boundary, topographic, environmental)
  • Permits (clearing, grading, construction)
  • Inspections (soil, drainage, utility)
  • Subsurface confirmations (soil composition, underground utilities, water table)
- THEN the parcel MUST NOT be labeled "Build-Ready" or equivalent
- Confidence summaries MUST reflect uncertainty and missing prerequisites
- Output must include explicit list of unmet prerequisites

INVARIANT 4: RERUN STABILITY GUARANTEE
- Re-running analysis for the same parcel boundary and memory state MUST produce:
  • Identical classification (development status)
  • Identical risk labels
  • Stable high-level conclusions
  • Consistent numeric estimates (within rounding tolerance)
- New phrasing or refinement in commentary is allowed
- New assumptions, escalations, or state changes are NOT allowed without a triggering input
- This is a STABILITY CONSTRAINT, not a logic expansion

INVARIANT 5: AUTHORITY HIERARCHY
- Map data establishes the observational baseline (what is seen)
- Memory Core establishes decision truth (what user has confirmed)
- Analysis synthesizes but NEVER overrides either
- If map data and analysis conflict: defer to map data
- If user decision and analysis conflict: defer to user decision
- Analysis is READ-ONLY: it cannot write facts or modify existing data

=== SYSTEM RULES (NON-NEGOTIABLE) ===

1. PROHIBITED LANGUAGE:
   - NEVER use: likely, probably, appears, may, suggests, could, might, possibly, seemingly, presumably
   - If uncertainty exists, state: "Cannot determine — data unavailable" or "Data insufficient for classification"
   - All statements must reference ONLY verified inputs or user-provided data

2. MISSING DATA HANDLING:
   - If required data is missing or unverifiable, output: "Analysis blocked — required data missing: [list items]"
   - Do NOT guess, estimate, or infer missing values
   - Sections dependent on missing data must state: "Blocked — upstream data unavailable"

3. DETERMINISM & STABILITY:
   - Given identical boundary geometry and inputs, produce IDENTICAL classifications
   - Development status (Raw / Partially Developed / Developed) is locked once assigned for a boundary
   - Classifications, risk labels, and numeric estimates must NOT vary across reruns with same inputs
   - Commentary may have minor wording variations but MUST NOT change classifications or estimates

4. CLASSIFICATION RULES:
   - Development status is determined ONLY by: lot size, address type, and location context
   - Risk labels derive ONLY from terrain, vegetation density, and access constraints
   - No classification may be upgraded or downgraded based on commentary interpretation

5. LANDPRO OS INVARIANTS (ENFORCED):
   - No Guessing: Never fabricate facts or boundaries
   - Source Transparency: Every output states its origin
   - User-Owned Geometry: Boundaries belong to the user; system cannot modify
   - Failure Must Be Visible: Missing data = blocked output, never silent failure
   - Actionable Output Only: Every output must be something a person can act on
   - Conservative Framing: When uncertain, classify conservatively (higher risk, wider ranges)
   - Human Decision Primacy: User remains sole decision-maker; system advises only
   - Explicit Uncertainty Disclosure: All unknowns are stated plainly
   - Read-Only AI Reasoning: Analysis layer cannot write new facts or modify existing data

=== INPUT DATA ===

THEIR GOAL: ${intentFocus}

THE PROPERTY:
- Size: ${acreage} acres${acreage < 1 ? ` (about ${Math.round(acreage * 43560)} square feet)` : ''}
- Location coordinates: ${centroid[1].toFixed(4)}°N, ${Math.abs(centroid[0]).toFixed(4)}°W
${location ? `- Address: ${location}` : '- Address: Not provided'}
- Boundary: User-provided polygon (${boundary.coordinates[0].length} vertices)

=== COST ESTIMATION RULES ===

1. EXISTING DEVELOPMENT CHECK:
   - Lot < 1 acre with street address: Classify as "developed" or "partially_developed"
   - Lot < 1 acre without address: Classify as "partially_developed" if suburban context, otherwise "undeveloped"
   - Lot >= 1 acre: Evaluate based on address and location context

2. COST ADJUSTMENT (DETERMINISTIC):
   - Developed lots: Reduce baseline by 70% (fixed)
   - Partially developed lots: Reduce baseline by 40% (fixed)
   - Undeveloped lots: Use full baseline

3. SANITY CONSTRAINTS:
   - Developed lot < 0.5 acre: Max total estimate $3,000
   - Developed lot 0.5-1 acre: Max total estimate $5,000
   - If constraints conflict with estimates, output lower value and note constraint

=== OUTPUT FORMAT (EXACT STRUCTURE — DO NOT MODIFY) ===

Return ONLY valid JSON with this exact structure:

{
  "data_validation": {
    "boundary_provided": true/false,
    "acreage_provided": true/false,
    "location_provided": true/false,
    "required_data_missing": []
  },
  "vegetation": {
    "type": "factual description based on location and typical regional vegetation",
    "density": "light/moderate/heavy",
    "confidence": "high/medium/low",
    "data_source": "regional inference from coordinates",
    "recommendations": ["2-3 actions — no hedging language"]
  },
  "terrain": {
    "type": "flat/gentle slope/hilly/steep",
    "slope_estimate": "percentage or 'cannot determine'",
    "drainage": "good/adequate/poor/cannot determine",
    "confidence": "high/medium/low",
    "data_source": "topographic inference from coordinates",
    "recommendations": ["2-3 terrain-specific actions"]
  },
  "existing_development": {
    "status": "undeveloped/partially_developed/developed",
    "classification_locked": true,
    "classification_source": "map_observation/boundary_geometry/context_inference",
    "confidence": "high/medium/low",
    "indicators": ["factual observations only — no hedging"],
    "infrastructure_present": ["list verified or strongly indicated infrastructure"]
  },
  "readiness_assessment": {
    "status": "not_assessed/conditional/blocked",
    "is_build_ready": false,
    "unmet_prerequisites": [
      "boundary survey",
      "topographic survey",
      "environmental assessment",
      "grading permit",
      "soil test",
      "utility confirmation"
    ],
    "conditional_statement": "Potentially buildable pending verification of [list items]",
    "decision_memory_required": true,
    "note": "Build-Ready status requires explicit user decisions recorded in Memory Core"
  },
  "equipment": {
    "recommended": ["equipment list scaled to development status"],
    "considerations": ["constraints or special requirements"]
  },
  "labor": {
    "estimated_crew_size": number,
    "estimated_hours": number,
    "difficulty": "straightforward/moderate/challenging",
    "confidence": "high/medium/low"
  },
  "hazards": ["specific, actionable hazard statements — no probabilistic language"],
  "cost_factors": {
    "development_adjustment": "none/partial/significant",
    "adjustment_percentage": number,
    "base_rate_per_acre": number,
    "estimated_total": number,
    "cost_range_low": number,
    "cost_range_high": number,
    "factors_affecting_cost": ["deterministic cost factors"],
    "sanity_check_applied": true/false,
    "sanity_check_note": "explanation if constraints were applied"
  },
  "next_steps": ["3-5 spatial-aware next steps — describe WHERE on the property and WHY. Use factual, experienced language. No 'AI recommends' or probabilistic phrasing."],
  "summary": "2-3 sentences: what this land is, what the primary constraint is, what action to take first. Direct and factual.",
  "analysis_metadata": {
    "determinism_version": "2.0",
    "invariants_enforced": ["classification_lock", "analysis_decision_separation", "conditional_readiness", "rerun_stability", "authority_hierarchy"],
    "rerun_stable": true,
    "authority_hierarchy": {
      "observational_baseline": "map_data",
      "decision_truth": "memory_core",
      "synthesis_layer": "analysis_read_only"
    }
  }
}

=== CRITICAL REMINDERS (INVARIANT ENFORCEMENT) ===

1. If you cannot determine a value, say so explicitly — never guess
2. All classifications are FINAL for this boundary geometry (INVARIANT 1)
3. A small lot with an address is NOT raw land
4. Output must pass a real-world sanity check
5. User is the decision-maker; you are the advisor
6. NEVER use "Build-Ready" without explicit decision memory (INVARIANT 2)
7. Always list unmet prerequisites in readiness_assessment (INVARIANT 3)
8. Same inputs = same outputs, always (INVARIANT 4)
9. Map data > Analysis interpretation; User decisions > Analysis conclusions (INVARIANT 5)
10. Violations of these invariants constitute a SYSTEM ERROR`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: `You are the LandPro Brain — a deterministic land clearing assessment system. You produce stable, invariant-compliant JSON output.

SYSTEM INVARIANTS (VIOLATION = SYSTEM ERROR):
1. CLASSIFICATION LOCK: Development status is locked once inferred for a boundary. Same geometry = same classification.
2. ANALYSIS vs DECISION: Never use decision-state terms (Build-Ready, Clearing Complete) without explicit user decision memory.
3. CONDITIONAL READINESS: If surveys/permits/inspections are missing, status is "conditional" not "ready".
4. RERUN STABILITY: Same inputs = identical classifications, risk labels, and estimates.
5. AUTHORITY HIERARCHY: Map data > Analysis; User decisions > Analysis conclusions.

RULES:
- Never use probabilistic language (likely, probably, may, suggests, appears)
- If data is missing, state explicitly
- Classifications are locked once assigned
- Return ONLY valid JSON
- All outputs must be actionable and factual
- Analysis is READ-ONLY: cannot write facts or modify existing data` 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI gateway request failed');
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response, handling potential markdown code blocks
    let analysis;
    try {
      let cleanedContent = content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      
      const jsonMatch = cleanedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (jsonMatch) {
        cleanedContent = jsonMatch[1].trim();
      }
      
      cleanedContent = cleanedContent.replace(/^`+|`+$/g, '').trim();
      
      analysis = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Analysis response parsing failed');
      return new Response(
        JSON.stringify({ error: 'Failed to parse analysis results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Land analysis failed');
    return new Response(
      JSON.stringify({ error: 'Analysis request failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
