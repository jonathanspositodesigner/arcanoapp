import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const EVOLINK_API_KEY = Deno.env.get("EVOLINK_API_KEY");
    if (!EVOLINK_API_KEY) {
      console.error("[translate] EVOLINK_API_KEY not configured");
      return new Response(
        JSON.stringify({ translatedPrompt: prompt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      "https://api.evolink.ai/v1beta/models/gemini-2.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${EVOLINK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You are a professional translator specializing in Chinese. Translate the following cinematic/video prompt to Simplified Chinese (中文). Keep technical camera terms in English. Output ONLY the translated text, nothing else.\n\n${prompt}`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[translate] Evolink API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ translatedPrompt: prompt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const translatedPrompt =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || prompt;

    return new Response(
      JSON.stringify({ translatedPrompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[translate] Error:", err);
    return new Response(
      JSON.stringify({ error: "Translation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
