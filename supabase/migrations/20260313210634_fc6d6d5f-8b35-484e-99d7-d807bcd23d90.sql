
-- Seed body_html for all 6 templates with placeholder variables
-- Placeholders: {{USER_NAME}}, {{PLAN_NAME}}, {{PLAN_VALUE}}, {{DUE_DATE}}, {{BENEFITS_LIST}}, {{LOSSES_LIST}}

UPDATE public.renewal_email_templates SET body_html = '<h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0 0 20px;text-align:center;">⏰ Seu plano vence hoje</h1>
<p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Olá, <strong style="color:#f5e27a;">{{USER_NAME}}</strong>.</p>
<p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">O seu plano <strong style="color:#f5e27a;">{{PLAN_NAME}}</strong> vence hoje, <strong>{{DUE_DATE}}</strong>.</p>
<p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 20px;">Para continuar com acesso normal à plataforma, basta realizar o pagamento da sua renovação no valor de <strong style="color:#f5e27a;">{{PLAN_VALUE}}</strong>.</p>
<p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Com a assinatura ativa, você continua tendo acesso a:</p>
<ul style="list-style:none;padding:0;margin:0 0 24px;">{{BENEFITS_LIST}}</ul>
<p style="color:#e2d8f0;font-size:15px;margin:0 0 8px;text-align:center;">Evite interrupções no seu acesso e mantenha sua assinatura ativa normalmente.</p>' WHERE day_offset = 0;

UPDATE public.renewal_email_templates SET body_html = '<h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0 0 20px;text-align:center;">⚠️ Pagamento pendente</h1>
<p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Olá, <strong style="color:#f5e27a;">{{USER_NAME}}</strong>.</p>
<p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Identificamos que o pagamento da sua assinatura <strong style="color:#f5e27a;">{{PLAN_NAME}}</strong> ainda não foi concluído.</p>
<p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Seu plano inclui recursos importantes como:</p>
<ul style="list-style:none;padding:0;margin:0 0 24px;">{{BENEFITS_LIST}}</ul>
<p style="color:#e2d8f0;font-size:15px;line-height:1.6;margin:0 0 8px;">Para evitar qualquer impacto no seu acesso, faça a regularização agora por Pix:</p>
<p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Valor da renovação: <strong style="color:#f5e27a;">{{PLAN_VALUE}}</strong></p>
<p style="color:#e2d8f0;font-size:15px;margin:0 0 8px;text-align:center;">Quanto antes você regularizar, mais fácil será continuar usando a plataforma sem pausas e sem perder o ritmo.</p>' WHERE day_offset = 1;

UPDATE public.renewal_email_templates SET body_html = '<h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0 0 20px;text-align:center;">🔴 Risco de perda de acesso</h1>
<p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Olá, <strong style="color:#f5e27a;">{{USER_NAME}}</strong>.</p>
<p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Seu plano <strong style="color:#f5e27a;">{{PLAN_NAME}}</strong> está com pagamento pendente há 2 dias.</p>
<p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 20px;">A partir daqui, o problema não é só uma cobrança em aberto. É o risco de perder o acesso ao que já faz parte da sua rotina dentro da plataforma.</p>
<p style="color:#fca5a5;font-size:14px;font-weight:600;margin:0 0 8px;">Sem a renovação, você pode deixar de ter acesso a:</p>
<ul style="list-style:none;padding:0;margin:0 0 16px;">{{LOSSES_LIST}}</ul>
<p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Isso pode significar perder recursos como:</p>
<ul style="list-style:none;padding:0;margin:0 0 24px;">{{BENEFITS_LIST}}</ul>
<p style="color:#e2d8f0;font-size:15px;line-height:1.6;margin:0 0 8px;">Se você já usa esse plano no dia a dia, interromper agora significa abrir mão de algo que já estava disponível.</p>
<p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Valor: <strong style="color:#f5e27a;">{{PLAN_VALUE}}</strong></p>' WHERE day_offset = 2;

UPDATE public.renewal_email_templates SET body_html = '<h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0 0 20px;text-align:center;">💸 O custo de não renovar</h1>
<p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Olá, <strong style="color:#f5e27a;">{{USER_NAME}}</strong>.</p>
<p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Seu pagamento do plano <strong style="color:#f5e27a;">{{PLAN_NAME}}</strong> continua pendente.</p>
<p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 20px;">Muita gente deixa para depois e só percebe o custo real quando perde acesso ao que já estava usando.</p>
<p style="color:#fca5a5;font-size:14px;font-weight:600;margin:0 0 8px;">Ao não renovar, você corre o risco de ficar sem:</p>
<ul style="list-style:none;padding:0;margin:0 0 16px;">{{BENEFITS_LIST}}</ul>
<p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Na prática, isso pode significar:</p>
<ul style="list-style:none;padding:0;margin:0 0 24px;">
<li style="color:#e2d8f0;font-size:15px;padding:4px 0;">⚠️ Interromper sua rotina dentro da plataforma</li>
<li style="color:#e2d8f0;font-size:15px;padding:4px 0;">⚠️ Perder velocidade no que já vinha fazendo</li>
<li style="color:#e2d8f0;font-size:15px;padding:4px 0;">⚠️ Deixar de usar vantagens já liberadas no seu plano</li>
<li style="color:#e2d8f0;font-size:15px;padding:4px 0;">⚠️ Voltar a ter limitações justamente quando precisa continuar</li>
</ul>
<p style="color:#e2d8f0;font-size:15px;line-height:1.6;margin:0 0 8px;">O valor para manter tudo ativo é <strong style="color:#f5e27a;">{{PLAN_VALUE}}</strong>, mas o custo de perder o acesso pode ser ainda maior em tempo, atraso e oportunidade desperdiçada.</p>' WHERE day_offset = 3;

UPDATE public.renewal_email_templates SET body_html = '<h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0 0 20px;text-align:center;">👀 Não fique para trás</h1>
<p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Olá, <strong style="color:#f5e27a;">{{USER_NAME}}</strong>.</p>
<p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Seu plano <strong style="color:#f5e27a;">{{PLAN_NAME}}</strong> ainda não foi renovado.</p>
<p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 20px;">Enquanto assinantes ativos continuam usando normalmente os recursos disponíveis, seu acesso corre o risco de ser interrompido por falta de pagamento.</p>
<p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Com a assinatura ativa, você segue com acesso a:</p>
<ul style="list-style:none;padding:0;margin:0 0 16px;">{{BENEFITS_LIST}}</ul>
<p style="color:#fca5a5;font-size:14px;font-weight:600;margin:0 0 8px;">Sem renovar, você pode ficar de fora de:</p>
<ul style="list-style:none;padding:0;margin:0 0 24px;">{{LOSSES_LIST}}</ul>
<p style="color:#e2d8f0;font-size:15px;line-height:1.6;margin:0 0 8px;">Se você pretende continuar usando a plataforma, o melhor momento para regularizar é agora.</p>
<p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Valor: <strong style="color:#f5e27a;">{{PLAN_VALUE}}</strong></p>' WHERE day_offset = 4;

UPDATE public.renewal_email_templates SET body_html = '<h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0 0 20px;text-align:center;">🚨 Último aviso</h1>
<p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Olá, <strong style="color:#f5e27a;">{{USER_NAME}}</strong>.</p>
<p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Este é o <strong style="color:#fca5a5;">último aviso</strong> sobre a pendência da sua assinatura <strong style="color:#f5e27a;">{{PLAN_NAME}}</strong>.</p>
<p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 20px;">Seu pagamento via Pix ainda não foi identificado e, sem a regularização, você poderá perder o acesso aos benefícios do seu plano, incluindo:</p>
<ul style="list-style:none;padding:0;margin:0 0 16px;">{{BENEFITS_LIST}}</ul>
<p style="color:#fca5a5;font-size:14px;font-weight:600;margin:0 0 8px;">Resumo do que você deixa de ter sem renovar:</p>
<ul style="list-style:none;padding:0;margin:0 0 24px;">{{LOSSES_LIST}}</ul>
<p style="color:#e2d8f0;font-size:15px;line-height:1.6;margin:0 0 8px;">Se você quer continuar com seu plano ativo, faça o pagamento agora:</p>
<p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Valor: <strong style="color:#f5e27a;">{{PLAN_VALUE}}</strong></p>
<p style="color:#9ca3af;font-size:13px;margin:16px 0 0;text-align:center;font-style:italic;">Após isso, a assinatura poderá seguir o fluxo normal de expiração da plataforma.</p>' WHERE day_offset = 5;
