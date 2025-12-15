import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to_email: string;
  to_name?: string;
  subject: string;
  content: string;
  sender_name?: string;
  sender_email?: string;
}

// SendPulse OAuth2 token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getSendPulseToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) {
    return cachedToken.token;
  }

  console.log("Fetching new SendPulse token...");
  
  const response = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: Deno.env.get("SENDPULSE_CLIENT_ID"),
      client_secret: Deno.env.get("SENDPULSE_CLIENT_SECRET"),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("SendPulse token error:", errorText);
    throw new Error(`Failed to get SendPulse token: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 3300000
  };

  return data.access_token;
}

function getUnsubscribeLink(email: string): string {
  const baseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  return `${baseUrl}/functions/v1/email-unsubscribe?email=${encodeURIComponent(email)}`;
}

function addUnsubscribeFooter(html: string, email: string): string {
  const unsubscribeLink = getUnsubscribeLink(email);
  
  const footer = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;">Você está recebendo este email porque está cadastrado em nossa plataforma.</p>
      <p style="margin: 8px 0 0 0;">
        <a href="${unsubscribeLink}" style="color: #6b7280; text-decoration: underline;">
          Clique aqui para cancelar sua inscrição
        </a>
      </p>
    </div>
  `;
  
  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`);
  }
  return html + footer;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      to_email, 
      to_name, 
      subject, 
      content,
      sender_name = "Vox Visual",
      sender_email = "contato@voxvisual.com.br"
    }: SendEmailRequest = await req.json();

    console.log(`Sending email to: ${to_email}, subject: ${subject}`);

    // Check blacklist
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: blacklisted } = await supabaseAdmin
      .from('blacklisted_emails')
      .select('id')
      .eq('email', to_email.toLowerCase())
      .maybeSingle();

    if (blacklisted) {
      console.log(`Email ${to_email} is blacklisted, skipping`);
      return new Response(
        JSON.stringify({ success: false, error: "Email está na blacklist" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = await getSendPulseToken();
    const htmlWithUnsubscribe = addUnsubscribeFooter(content, to_email);
    const htmlBase64 = btoa(unescape(encodeURIComponent(htmlWithUnsubscribe)));

    const emailPayload = {
      email: {
        html: htmlBase64,
        text: "",
        subject: subject,
        from: { name: sender_name, email: sender_email },
        to: [{ name: to_name || to_email, email: to_email }]
      }
    };

    const response = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(emailPayload)
    });

    const responseText = await response.text();
    console.log(`SendPulse response: ${response.status} - ${responseText}`);

    if (!response.ok) {
      throw new Error(`SendPulse error: ${responseText}`);
    }

    const result = JSON.parse(responseText);

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
