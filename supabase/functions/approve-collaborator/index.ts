import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getSendPulseToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) {
    return cachedToken.token;
  }
  const response = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: Deno.env.get("SENDPULSE_CLIENT_ID"),
      client_secret: Deno.env.get("SENDPULSE_CLIENT_SECRET"),
    }),
  });
  if (!response.ok) throw new Error(`Failed to get SendPulse token: ${response.status}`);
  const data = await response.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + 3300000 };
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify admin caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Forbidden: not admin");

    const { solicitacao_id } = await req.json();
    if (!solicitacao_id) throw new Error("Missing solicitacao_id");

    // Fetch the request
    const { data: sol, error: solError } = await adminClient
      .from("solicitacoes_colaboradores")
      .select("*")
      .eq("id", solicitacao_id)
      .single();
    if (solError || !sol) throw new Error("Solicitação não encontrada");
    if (sol.status !== "pendente") throw new Error("Solicitação já processada");

    // Create auth user account
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: sol.email,
      password: sol.senha || "Arcano@2024",
      email_confirm: true,
      user_metadata: {
        name: sol.nome,
        is_collaborator: true,
      },
    });

    if (authError) {
      // If user already exists, that's ok
      if (!authError.message?.includes("already been registered")) {
        throw new Error(`Erro ao criar conta: ${authError.message}`);
      }
    }

    // Get the user ID (either from newly created user or existing one)
    let userId = authData?.user?.id;
    if (!userId) {
      // User already existed, fetch their ID
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u: any) => u.email === sol.email);
      if (!existingUser) throw new Error("Não foi possível encontrar o usuário criado");
      userId = existingUser.id;
    }

    // Create partner role
    const { error: roleError } = await adminClient
      .from("user_roles")
      .upsert({ user_id: userId, role: "partner" }, { onConflict: "user_id,role" });
    if (roleError) {
      console.error("[approve-collaborator] Role creation error:", roleError);
      throw new Error(`Erro ao criar role: ${roleError.message}`);
    }

    // Create partner record
    const { data: partnerRecord, error: partnerError } = await adminClient
      .from("partners")
      .upsert({
        user_id: userId,
        name: sol.nome,
        email: sol.email,
        phone: sol.whatsapp || null,
        is_active: true,
      }, { onConflict: "user_id" })
      .select("id")
      .single();
    if (partnerError) {
      console.error("[approve-collaborator] Partner creation error:", partnerError);
      throw new Error(`Erro ao criar parceiro: ${partnerError.message}`);
    }

    // Create partner platform (default to prompts)
    const { error: platformError } = await adminClient
      .from("partner_platforms")
      .upsert({
        partner_id: partnerRecord.id,
        platform: "prompts",
        is_active: true,
      }, { onConflict: "partner_id,platform" });
    if (platformError) {
      console.error("[approve-collaborator] Platform creation error:", platformError);
    }

    // Update status to approved
    const { error: updateError } = await adminClient
      .from("solicitacoes_colaboradores")
      .update({ status: "aprovado", senha: null }) // Clear password after account creation
      .eq("id", solicitacao_id);
    if (updateError) throw new Error(`Erro ao atualizar status: ${updateError.message}`);

    // Send approval email via SendPulse
    try {
      const token = await getSendPulseToken();

      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#1a1a2e;color:#e0e0e0;padding:30px;border-radius:12px;">
          <h1 style="color:#a855f7;text-align:center;">🎉 Parabéns, ${sol.nome}!</h1>
          <div style="background:#2a2a3e;padding:20px;border-radius:8px;margin:20px 0;">
            <p style="font-size:16px;line-height:1.6;">Sua solicitação para se tornar <strong style="color:#c084fc;">Colaborador Arcano</strong> foi <strong style="color:#22c55e;">aprovada</strong>!</p>
            <p style="font-size:14px;line-height:1.6;">Sua conta foi criada com sucesso. Você já pode acessar a plataforma usando o e-mail e a senha que cadastrou na solicitação.</p>
            <div style="background:#1a1a2e;padding:15px;border-radius:8px;margin:15px 0;">
              <p style="font-size:14px;"><strong style="color:#c084fc;">E-mail:</strong> ${sol.email}</p>
              <p style="font-size:14px;"><strong style="color:#c084fc;">Acesso:</strong> Faça login em <a href="https://arcanolab.voxvisual.com.br/parceiro-login-unificado" style="color:#a855f7;">arcanolab.voxvisual.com.br/parceiro-login-unificado</a></p>
            </div>
            <p style="font-size:14px;line-height:1.6;">Agora você pode começar a publicar seus prompts e conteúdos criativos. Cada vez que um usuário utilizar seus conteúdos, você receberá uma remuneração automática!</p>
          </div>
          <p style="text-align:center;color:#999;font-size:12px;">Arcano — Plataforma de IA</p>
        </div>
      `;

      const htmlBase64 = btoa(unescape(encodeURIComponent(html)));

      await fetch("https://api.sendpulse.com/smtp/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          email: {
            subject: "🎉 Sua parceria foi aprovada — Bem-vindo ao Arcano!",
             from: { name: "Arcano App", email: "contato@voxvisual.com.br" },
            to: [{ name: sol.nome, email: sol.email }],
            html: htmlBase64,
            encoding: "base64",
          },
        }),
      });

      console.log(`[approve-collaborator] Approval email sent to ${sol.email}`);
    } catch (emailErr) {
      console.error("[approve-collaborator] Email send error:", emailErr);
      // Don't fail the approval if email fails
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[approve-collaborator] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});