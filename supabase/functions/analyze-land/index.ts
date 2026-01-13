import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { boundary, acreage, location, intent } = await req.json();
    
    if (!boundary || !acreage) {
      return new Response(
        JSON.stringify({ error: 'Boundary and acreage are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    "required_data_missing": [] // list any missing required fields
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
    "confidence": "high/medium/low",
    "indicators": ["factual observations only — no hedging"],
    "infrastructure_present": ["list verified or strongly indicated infrastructure"]
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
    "determinism_version": "1.0",
    "invariants_enforced": true,
    "rerun_stable": true
  }
}

=== CRITICAL REMINDERS ===

1. If you cannot determine a value, say so explicitly — never guess
2. All classifications are FINAL for this boundary geometry
3. A small lot with an address is NOT raw land
4. Output must pass a real-world sanity check
5. User is the decision-maker; you are the advisor`;

    // Starting land analysis
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are the LandPro Brain — a deterministic land clearing assessment system. You produce stable, invariant-compliant JSON output. RULES: 1) Never use probabilistic language (likely, probably, may, suggests, appears). 2) If data is missing, state explicitly. 3) Classifications are locked once assigned. 4) Return ONLY valid JSON. 5) All outputs must be actionable and factual.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      // Log generic AI error without exposing details
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
      // Log generic error without exposing AI response
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response, handling potential markdown code blocks
    let analysis;
    try {
      // Remove markdown code blocks (```json, ```, etc.)
      let cleanedContent = content
        .replace(/^```(?:json)?\s*/i, '')  // Remove opening code block
        .replace(/\s*```$/i, '')            // Remove closing code block
        .trim();
      
      // If still wrapped in backticks, try extracting JSON between them
      const jsonMatch = cleanedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (jsonMatch) {
        cleanedContent = jsonMatch[1].trim();
      }
      
      // Final cleanup - remove any remaining backticks at start/end
      cleanedContent = cleanedContent.replace(/^`+|`+$/g, '').trim();
      
      analysis = JSON.parse(cleanedContent);
    } catch (parseError) {
      // Log generic parse error without exposing content
      console.error('Analysis response parsing failed');
      return new Response(
        JSON.stringify({ error: 'Failed to parse analysis results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Land analysis completed
    
    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Log generic error for operational monitoring
    console.error('Land analysis failed');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
