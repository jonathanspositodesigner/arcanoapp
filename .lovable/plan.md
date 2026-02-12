
# Plano: Secao "Ainda na duvida? Faca um teste gratuito!"

## Resumo
Substituir a secao "BENEFICIOS (O QUE FAZ)" por uma secao interativa com o upscaler real embutido, porem desfocado e bloqueado. O visitante insere nome + email, recebe um codigo de 6 digitos, e ao validar, desbloqueia 3 usos reais do upscaler -- tudo isolado do sistema de creditos existente.

## O que o usuario vai ver

1. **Estado inicial**: Titulo "Ainda na duvida? Faca um teste gratuito!", abaixo disso a interface do upscaler renderizada com blur forte + overlay escuro + pointer-events desabilitado. No centro do overlay, botao grande "Fazer Teste Gratis".

2. **Modal de cadastro**: Ao clicar, abre modal com titulo "Libere 3 Testes Gratis", campos Nome Completo e Email, botao "Enviar Codigo".

3. **Tela de codigo**: Apos envio, modal muda para 6 inputs de digitos (estilo OTP). O usuario cola/digita o codigo recebido por email.

4. **Sucesso**: Mensagem de sucesso, blur removido, ferramenta liberada. O botao de gerar mostra "3 testes restantes" (e vai decrementando: 2, 1).

5. **Teste concluido**: Apos 3 usos, a ferramenta volta a ficar borrada com overlay "Teste Concluido! Voce viu o poder do Upscaler Arcano. Garanta acesso completo!" + botao "Comprar Agora" que rola para a secao de precos.

---

## Detalhes Tecnicos

### 1. Nova tabela no banco de dados: `landing_page_trials`

```text
id              uuid (PK, default gen_random_uuid())
email           text (NOT NULL, UNIQUE)
name            text (NOT NULL)
code            text (NOT NULL)       -- codigo 6 digitos
code_verified   boolean (default false)
uses_remaining  integer (default 3)
uses_total      integer (default 3)
created_at      timestamptz (default now())
verified_at     timestamptz
expires_at      timestamptz (default now() + 24h)
```

- RLS: Service role full access. Sem acesso direto do cliente (tudo via Edge Functions).

### 2. Nova Edge Function: `landing-trial-code`

Endpoints (via router interno):

- **POST /send**: Recebe `{ email, name }`. Gera codigo 6 digitos, salva na tabela, envia via SendPulse SMTP. Rate limit: 1 envio por email a cada 2 minutos.

- **POST /verify**: Recebe `{ email, code }`. Valida o codigo. Se correto, marca `code_verified = true`. Retorna `{ success: true, uses_remaining: 3 }`.

- **POST /consume**: Recebe `{ email }`. Decrementa `uses_remaining` em 1. Retorna `{ uses_remaining }`. Se ja zerou, retorna erro.

### 3. Novo componente: `UpscalerTrialSection`

Componente isolado que:
- Renderiza a UI real do upscaler (area de upload + selecao de modo + botao gerar) dentro de um container com `filter: blur(8px)` e `pointer-events: none`
- Overlay absoluto com botao CTA por cima
- Gerencia todo o estado do trial via `localStorage` (para persistencia entre refreshes):
  - `trial_email`, `trial_verified`, `trial_uses_remaining`
- Ao desbloquear, remove blur/overlay e habilita interacao
- Substitui o display de creditos pelo contador de usos restantes (ex: "2 testes restantes")
- Ao esgotar os 3 usos, reaplica blur + mostra tela de conclusao

### 4. Mockup do Upscaler (versao simplificada)

Em vez de importar o componente real do upscaler (que tem dependencias complexas de auth, creditos, queue, etc.), vamos criar um **mockup visual estatico** que replica a aparencia da ferramenta:
- Area de upload com icone e texto "Arraste ou clique para enviar"
- Seletores de modo (Standard / PRO)
- Seletores de categoria (Foto, Logo, etc.)
- Botao "Melhorar Imagem"

Quando o trial for ativado, o sistema usara o fluxo real do upscaler mas com o controle de usos gerenciado pela Edge Function `landing-trial-code/consume` em vez do sistema de creditos.

### 5. Fluxo de processamento do trial

Quando o usuario com trial ativo clica em "Melhorar Imagem":
1. Frontend chama `landing-trial-code/consume` para verificar/decrementar usos
2. Se tem usos, chama `runninghub-upscaler/run` normalmente (sem debito de creditos -- o custo e absorvido pela plataforma como custo de aquisicao)
3. O resultado e exibido normalmente
4. Contador atualiza (localStorage + DB)

### 6. Integracao na pagina

- Remove a secao "BENEFICIOS (O QUE FAZ)" (linhas 920-946 do `PlanosUpscalerCreditos.tsx`)
- Insere `<UpscalerTrialSection />` no lugar
- O componente e auto-contido e nao interfere com nenhum outro sistema

### 7. Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| `src/components/upscaler/trial/UpscalerTrialSection.tsx` | Criar - Componente principal |
| `src/components/upscaler/trial/TrialSignupModal.tsx` | Criar - Modal nome+email+codigo |
| `src/components/upscaler/trial/UpscalerMockup.tsx` | Criar - UI mockup do upscaler |
| `src/components/upscaler/trial/useTrialState.ts` | Criar - Hook de estado do trial |
| `supabase/functions/landing-trial-code/index.ts` | Criar - Edge Function |
| `src/pages/PlanosUpscalerCreditos.tsx` | Modificar - Trocar secao |
| Migration SQL | Criar tabela `landing_page_trials` |

### 8. Seguranca

- Rate limit no envio de codigos (1 por email a cada 2 min)
- Codigo expira em 24h
- Validacao de email e nome no backend
- Maximo de 3 usos por email (enforced no DB)
- Nao cria conta no sistema -- totalmente isolado
