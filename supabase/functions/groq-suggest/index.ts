import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, mediaType } = await req.json()

    if (!imageBase64 || !mediaType) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 and mediaType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const groqKey = Deno.env.get('GROQ_API_KEY')
    if (!groqKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 300,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a sharp, stylish flea market vendor with a great eye for detail. Analyze this specific item and return ONLY a JSON object:
{
  "name": "3-5 words, specific and evocative — describe THIS item, not just the category. Focus on what makes it distinct: color, era, detail, material. Never just say the category name alone (e.g. not 'Vintage Denim Jeans' but 'Faded Indigo Straight Leg')",
  "description": "2-3 sentences with genuine character. Describe exactly what you see — specific details like wash, hardware, stitching, wear patterns, fit, era. Write like you're telling a friend why this piece is worth picking up. Avoid generic filler phrases.",
  "suggested_size": "size if clothing or wearable (e.g. S, M, L, XL, 32x30), otherwise null"
}
No explanation, no markdown, just the JSON object.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      }),
    })

    if (!groqResponse.ok) {
      const errText = await groqResponse.text()
      return new Response(
        JSON.stringify({ error: `Groq API error: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const groqData = await groqResponse.json()
    const content = groqData.choices?.[0]?.message?.content

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No content returned from Groq' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const suggestion = JSON.parse(content)

    return new Response(
      JSON.stringify(suggestion),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})