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
    const { clientName, jobDescription, propertySize, propertyUnit, materialNotes } = await req.json();
    
    // Log operation start without PII

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const prompt = `You are an expert landscaping and land management estimator. Analyze the following job request and provide a detailed cost breakdown:

Client: ${clientName}
Job Description: ${jobDescription}
Property Size: ${propertySize} ${propertyUnit}
${materialNotes ? `Material Notes: ${materialNotes}` : ''}

Based on industry standards for landscaping and land management, provide:
1. Estimated labor cost (in USD)
2. Estimated material cost (in USD)
3. Suggested completion time (in days)
4. A brief job title (max 50 characters)

Consider factors like:
- Property size and terrain complexity
- Type of work (clearing, grading, mulching, maintenance, etc.)
- Equipment and labor requirements
- Material costs specific to the job type`;

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
            content: 'You are a professional landscaping cost estimator. Always respond with valid JSON only, no markdown formatting or additional text.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
        tools: [
          {
            type: "function",
            function: {
              name: "generate_quote",
              description: "Generate a landscaping quote with cost breakdown",
              parameters: {
                type: "object",
                properties: {
                  jobTitle: { type: "string", description: "Brief descriptive title for the job" },
                  laborCost: { type: "number", description: "Estimated labor cost in USD" },
                  materialCost: { type: "number", description: "Estimated material cost in USD" },
                  completionTime: { type: "number", description: "Estimated completion time in days" }
                },
                required: ["jobTitle", "laborCost", "materialCost", "completionTime"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_quote" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Log generic AI error without exposing details
      console.error('AI gateway request failed');
      throw new Error('AI service temporarily unavailable');
    }

    const data = await response.json();
    // AI response received (not logging content)

    let quoteData;
    
    // Check for tool call response
    if (data.choices[0]?.message?.tool_calls?.[0]) {
      const toolCall = data.choices[0].message.tool_calls[0];
      quoteData = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback to parsing content
      const aiResponse = data.choices[0].message.content;
      const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      quoteData = JSON.parse(cleanedResponse);
    }

    const totalEstimate = quoteData.laborCost + quoteData.materialCost;
    
    const result = {
      jobTitle: quoteData.jobTitle,
      laborCost: Math.round(quoteData.laborCost),
      materialCost: Math.round(quoteData.materialCost),
      totalEstimate: Math.round(totalEstimate),
      completionTime: Math.round(quoteData.completionTime),
      clientName,
      timestamp: new Date().toISOString()
    };

    // Log success without exposing quote details

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // Log generic error for operational monitoring
    console.error('Quote generation failed');
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
