// supabase/functions/axis-ai/lndex.ts
import { GoogleGenAI } from "@google/genai";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { prompt } = await req.json()

    // Fixed: Using the Google GenAI SDK and proper environment variable access as per guidelines.
    // This also resolves the 'Cannot find name Deno' error by using process.env.API_KEY which is the SDK standard.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Fixed: Using the recommended 'gemini-3-flash-preview' model for basic text and reasoning tasks.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Fixed: Using the .text property to extract output string as per documentation.
    const text = response.text || "No response generated.";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
