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

    const prompt = `You are a seasoned land professional who has worked with thousands of properties — from small backyards to large rural acreage. You're sitting down with a landowner to tell them exactly what they need to know about their land. Be direct, confident, and practical. No hedging, no disclaimers, no "based on available data" language.

THEIR GOAL: ${intentFocus}

THE PROPERTY:
- Size: ${acreage} acres${acreage < 1 ? ` (about ${Math.round(acreage * 43560)} square feet)` : ''}
- Location: ${centroid[1].toFixed(4)}°N, ${Math.abs(centroid[0]).toFixed(4)}°W
${location ? `- Address: ${location}` : ''}

CRITICAL COST ESTIMATION GUIDANCE:
Before estimating costs, assess the CURRENT STATE of the property:

1. EXISTING DEVELOPMENT CHECK:
   - If the parcel appears to be a small residential lot (typically < 1 acre in suburban/urban areas), assume it likely has existing structures (house, driveway, utilities already connected).
   - If the address suggests residential development (street address with house number), treat as partially or fully developed.
   - Developed lots do NOT need full land conversion costs — only incremental site work.

2. COST ADJUSTMENT RULES:
   - For lots with existing homes/structures: Reduce base costs by 60-80%. The land is already prepared, utilities exist, access is established.
   - For partially developed lots: Reduce base costs by 30-50%. Some infrastructure exists.
   - For raw undeveloped land only: Use full baseline estimates.
   - When unsure about development status, err on the side of LOWER estimates and widen the range.

3. SANITY CHECK:
   - A typical 0.25-acre residential lot with an existing home should NOT show $15,000+ in land prep costs.
   - Reasonable estimates for minor site work on developed lots: $500-$3,000 range.
   - Only major demolition/redevelopment projects justify higher costs on small developed parcels.

Give them a straight-talking assessment. Write like you're advising a friend — confident, opinionated, and useful. No technical jargon. No academic language. Just practical guidance they can act on today.

Return your analysis as JSON:

{
  "vegetation": {
    "type": "plain description of what's growing there (grass, trees, brush, mixed)",
    "density": "light/moderate/heavy",
    "recommendations": ["2-3 practical tips for dealing with the vegetation"]
  },
  "terrain": {
    "type": "simple description (flat, gentle slope, hilly, steep)",
    "slope_estimate": "rough percentage",
    "drainage": "good/okay/poor",
    "recommendations": ["2-3 things to watch for or work with"]
  },
  "existing_development": {
    "status": "undeveloped/partially_developed/developed",
    "indicators": ["what suggests development status — address type, lot size, location context"],
    "infrastructure_present": ["list likely existing infrastructure — driveway, utilities, cleared areas, structures"]
  },
  "equipment": {
    "recommended": ["list the actual equipment they'll need, be specific — scale appropriately for developed vs raw land"],
    "considerations": ["any gotchas or things that affect equipment choice"]
  },
  "labor": {
    "estimated_crew_size": number,
    "estimated_hours": number,
    "difficulty": "straightforward/moderate/challenging"
  },
  "hazards": ["real things to watch out for — be specific and practical"],
  "cost_factors": {
    "development_adjustment": "none/partial/significant (based on existing development)",
    "base_rate_per_acre": number,
    "estimated_total": number,
    "cost_range_low": number,
    "cost_range_high": number,
    "factors_affecting_cost": ["what drives the price up or down — include development status impact"]
  },
  "next_steps": ["3-5 practical next steps using spatial reasoning — describe WHERE on the property actions should happen and WHY location matters (e.g., 'Walk the lower corner near the road — that's where drainage tends to collect' or 'Check the tree line along the eastern edge, access from there is often more viable'). Use calm, experienced language like 'tends to', 'often influences', 'more viable' rather than absolutes. Never say 'AI recommends' or 'optimal'. Write like an experienced land planner thinking ahead about placement, access, drainage, and future use."],
  "summary": "Write 2-3 sentences that tell them exactly what this land is good for, what might get in their way, and what they should do first. Be direct and confident — like you've seen a hundred properties just like this one."
}

Remember: You're a trusted advisor, not a robot. Give them the real talk. And remember — a small lot with a house on it is NOT raw land.`;

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
          { role: 'system', content: 'You are a straight-talking land professional with decades of field experience. Give practical, confident advice like you would to a friend. Never sound like an AI or use disclaimers. Return valid JSON only.' },
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
