import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
  if (!response.ok) {
    const errorText = await response.text();
    console.error("SendPulse token error:", errorText);
    throw new Error(`Failed to get SendPulse token: ${response.status}`);
  }
  const data = await response.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + 3300000 };
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { nome, instagram, email, whatsapp, portfolio, created_at, aceite_at } = await req.json();

    if (!nome || !email) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getSendPulseToken();

    const dataFormatted = created_at
      ? new Date(created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
      : new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const aceiteFormatted = aceite_at
      ? new Date(aceite_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
      : dataFormatted;

    const html = `<div style="font-family:sans-serif;max-width:700px;margin:0 auto;background:#1a1a2e;color:#e0e0e0;padding:30px;border-radius:12px;">
  <h1 style="color:#a855f7;text-align:center;">🤝 Nova Solicitação de Colaborador</h1>
  <div style="background:#2a2a3e;padding:20px;border-radius:8px;margin:20px 0;">
    <p><strong style="color:#c084fc;">Nome:</strong> ${nome}</p>
    <p><strong style="color:#c084fc;">Instagram:</strong> ${instagram}</p>
    <p><strong style="color:#c084fc;">Email:</strong> ${email}</p>
    <p><strong style="color:#c084fc;">WhatsApp:</strong> ${whatsapp}</p>
    <p><strong style="color:#c084fc;">Portfólio:</strong> <a href="${portfolio}" style="color:#a855f7;">${portfolio}</a></p>
    <p><strong style="color:#c084fc;">Data da solicitação:</strong> ${dataFormatted}</p>
  </div>
  <div style="background:#2a2a3e;padding:25px;border-radius:8px;margin:20px 0;border:1px solid #a855f7;">
    <h2 style="color:#a855f7;font-size:16px;margin:0 0 8px;">📋 TERMO DE COMPROMISSO ACEITO</h2>
    <p style="color:#22c55e;font-size:13px;margin:0 0 20px;"><strong>✅ Aceito em:</strong> ${aceiteFormatted}</p>
    <p style="color:#c084fc;font-weight:bold;font-size:14px;">TERMO DE COMPROMISSO E LICENÇA DE USO — COLABORADOR ARCANO</p>
    <p style="font-size:12px;line-height:1.6;color:#ccc;">Ao submeter este formulário e marcar a caixa de aceite, o Colaborador <strong>${nome}</strong> (e-mail: ${email}) declarou ter lido, compreendido e concordado integralmente com os termos a seguir, celebrado com ARCANO / VOXVISUAL ("Plataforma").</p>
    <p style="color:#c084fc;font-weight:bold;font-size:13px;margin-top:16px;">1. AUTORIA E ORIGINALIDADE</p>
    <p style="font-size:12px;line-height:1.6;color:#ccc;">O Colaborador declara que todos os conteúdos enviados à Plataforma — incluindo prompts, descrições, imagens, vídeos e quaisquer outros materiais ("Conteúdo") — são de sua criação original e autoral. Fica expressamente vedado o envio de: conteúdo copiado, adaptado ou derivado de terceiros sem autorização; imagens provenientes de bancos genéricos; prompts gerados por outra pessoa; qualquer material que viole direitos autorais ou propriedade intelectual de terceiros.</p>
    <p style="color:#c084fc;font-weight:bold;font-size:13px;margin-top:16px;">2. LICENÇA À PLATAFORMA</p>
    <p style="font-size:12px;line-height:1.6;color:#ccc;">Ao publicar Conteúdo na Plataforma, o Colaborador concede à Arcano/VoxVisual uma licença não exclusiva, irrevogável, global, gratuita e sublicenciável para usar, reproduzir, adaptar, distribuir, exibir e criar trabalhos derivados do Conteúdo para fins operacionais, promocionais e de marketing da Plataforma.</p>
    <p style="color:#c084fc;font-weight:bold;font-size:13px;margin-top:16px;">3. COPROPRIEDADE PARA USO INSTITUCIONAL</p>
    <p style="font-size:12px;line-height:1.6;color:#ccc;">O Colaborador reconhece e aceita que a Plataforma passa a ter copropriedade sobre o Conteúdo publicado exclusivamente para fins de uso interno, campanhas institucionais, divulgação da plataforma e materiais de marketing. Tal copropriedade não transfere a titularidade criativa do Colaborador sobre sua obra original.</p>
    <p style="color:#c084fc;font-weight:bold;font-size:13px;margin-top:16px;">4. RESPONSABILIDADE DO COLABORADOR</p>
    <p style="font-size:12px;line-height:1.6;color:#ccc;">O Colaborador é integralmente responsável pelo Conteúdo que publica. Em caso de reclamação ou ação judicial por parte de terceiros, o Colaborador se compromete a responder por eventuais danos, isentando a Plataforma de qualquer responsabilidade.</p>
    <p style="color:#c084fc;font-weight:bold;font-size:13px;margin-top:16px;">5. REMUNERAÇÃO</p>
    <p style="font-size:12px;line-height:1.6;color:#ccc;">A remuneração ao Colaborador é condicionada ao uso efetivo de seu Conteúdo por usuários da Plataforma, conforme política de remuneração vigente. A Plataforma se reserva o direito de ajustar os valores e critérios de remuneração mediante comunicação prévia de 15 dias.</p>
    <p style="color:#c084fc;font-weight:bold;font-size:13px;margin-top:16px;">6. SUSPENSÃO E REMOÇÃO DE CONTEÚDO</p>
    <p style="font-size:12px;line-height:1.6;color:#ccc;">A Plataforma se reserva o direito de remover qualquer Conteúdo que viole estes termos, as leis brasileiras vigentes ou as diretrizes editoriais. A violação reiterada poderá resultar no encerramento da conta do Colaborador e cancelamento dos ganhos pendentes.</p>
    <p style="color:#c084fc;font-weight:bold;font-size:13px;margin-top:16px;">7. PRIVACIDADE</p>
    <p style="font-size:12px;line-height:1.6;color:#ccc;">Os dados pessoais fornecidos no cadastro serão tratados conforme a LGPD (Lei nº 13.709/2018) e utilizados exclusivamente para fins operacionais da Plataforma.</p>
    <p style="color:#c084fc;font-weight:bold;font-size:13px;margin-top:16px;">8. FORO</p>
    <p style="font-size:12px;line-height:1.6;color:#ccc;">Fica eleito o foro da Comarca de Almenara/MG para dirimir quaisquer controvérsias decorrentes deste Termo.</p>
    <div style="margin-top:20px;padding-top:15px;border-top:1px solid #444;">
      <p style="font-size:12px;color:#22c55e;"><strong>✅ Aceite digital registrado em:</strong> ${aceiteFormatted}</p>
      <p style="font-size:11px;color:#999;">Colaborador: ${nome} — E-mail: ${email}</p>
    </div>
  </div>
  <p style="text-align:center;color:#999;font-size:12px;">Arcano — Plataforma de IA</p>
</div>`;

    const htmlBase64 = btoa(unescape(encodeURIComponent(html)));

    const emailResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        email: {
          subject: "Nova solicitação de colaborador — Arcano",
          from: { name: "Arcano App", email: "contato@voxvisual.com.br" },
          to: [{ name: "Admin Arcano", email: "jonathandesigner1993@gmail.com" }],
          html: htmlBase64,
          encoding: "base64",
        },
      }),
    });

    const responseText = await emailResponse.text();
    console.log(`[notify-new-collaborator] SendPulse response: ${emailResponse.status} - ${responseText}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[notify-new-collaborator] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});