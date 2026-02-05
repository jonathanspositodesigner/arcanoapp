import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get email from query params or body
    let email: string | null = null;
    
    const url = new URL(req.url);
    email = url.searchParams.get("email");
    
    // If not in URL, try body
    if (!email && req.method === "POST") {
      try {
        const body = await req.json();
        email = body.email;
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    if (!email) {
      return new Response(
        generateHtmlPage("Erro", "Email não fornecido.", false),
        { 
          status: 400, 
          headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders } 
        }
      );
    }

    // Decode email if URL encoded
    email = decodeURIComponent(email).toLowerCase().trim();
    
    console.log(`Processing unsubscribe for: ${email}`);

    // Check if already blacklisted
    const { data: existing } = await supabaseClient
      .from("blacklisted_emails")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      console.log(`Email already unsubscribed: ${email}`);
      return new Response(
        generateHtmlPage("Já Desinscrito", "Este email já foi removido da nossa lista de envios.", true),
        { 
          status: 200, 
          headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders } 
        }
      );
    }

    // Add to blacklist
    const { error: insertError } = await supabaseClient
      .from("blacklisted_emails")
      .insert({
        email: email,
        reason: "unsubscribed",
        auto_blocked: false,
        notes: "Usuário clicou no link de desinscrição"
      });

    if (insertError) {
      console.error("Error adding to blacklist:", insertError);
      return new Response(
        generateHtmlPage("Erro", "Ocorreu um erro ao processar sua solicitação. Tente novamente.", false),
        { 
          status: 500, 
          headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders } 
        }
      );
    }

    console.log(`Successfully unsubscribed: ${email}`);

    return new Response(
      generateHtmlPage("Desinscrição Confirmada", "Você foi removido da nossa lista de emails. Não receberá mais comunicações por email.", true),
      { 
        status: 200, 
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error("Error processing unsubscribe:", error);
    return new Response(
      generateHtmlPage("Erro", "Ocorreu um erro inesperado. Tente novamente mais tarde.", false),
      { 
        status: 500, 
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders } 
      }
    );
  }
});

function generateHtmlPage(title: string, message: string, success: boolean): string {
  const bgColor = success ? "#10b981" : "#ef4444";
  const icon = success ? "✓" : "✕";
  
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Vox Visual</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 48px;
      max-width: 480px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: ${bgColor};
      color: white;
      font-size: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    h1 {
      color: #1a1a2e;
      font-size: 28px;
      margin-bottom: 16px;
    }
    p {
      color: #64748b;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .logo {
      color: #94a3b8;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="logo">Vox Visual</div>
  </div>
</body>
</html>`;
}
