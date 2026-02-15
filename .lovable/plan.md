

# Reconfigurar Produtos Upscaler Arcano + Novo Email com Dominio Correto

## Resumo
Atualizar os 3 produtos (156954, 156957, 156960) com novas quantidades de creditos e criar email personalizado do Upscaler Arcano com link para o dominio correto: **https://arcanolab.voxvisual.com.br/**

## Alteracoes de Creditos

| Product ID | Antes | Depois | Plano |
|-----------|-------|--------|-------|
| 156954 | 1.500 | **1.800** | Starter |
| 156957 | 4.200 | **4.200** (mantem) | Pro |
| 156960 | 10.800 | **12.000** | Studio |

## Arquivos Modificados

### 1. `supabase/functions/webhook-greenn-artes/index.ts`

**Mapeamento de creditos (linhas 52-61):**
- 156954: 1500 -> 1800, nome: "Upscaler Arcano - Plano Starter"
- 156957: 4200 -> 4200, nome: "Upscaler Arcano - Plano Pro"
- 156960: 10800 -> 12000, nome: "Upscaler Arcano - Plano Studio"

**Novo mapa de planos Upscaler:**
- Objeto `UPSCALER_PLAN_NAMES` para mapear IDs aos nomes dos planos

**Funcao `sendCreditsWelcomeEmail` (linhas 413-529):**
- Recebe `productId` como parametro adicional
- Se o produto for Upscaler (156954/156957/156960), usa template novo com:
  - Link CTA: **https://arcanolab.voxvisual.com.br/** (dominio do usuario)
  - Subject: "Upscaler Arcano - Plano Starter | +1.800 Creditos!"
  - Design com gradiente roxo/rosa (identidade Upscaler)
  - Mencionando nome do plano e creditos recebidos
  - Remetente: "Arcano App" contato@voxvisual.com.br
- Se for outro produto (156946/156948/156952), mantem template atual

**Chamada da funcao (linha 682):**
- Passar `productId` como parametro extra

### 2. `supabase/functions/webhook-greenn-creditos/index.ts`

**Mapeamento (linhas 21-25):**
- Adicionar os 3 IDs: 156954=1800, 156957=4200, 156960=12000
- Manter os existentes (156946, 156948, 156952)

## Exemplo do Email (Plano Starter)

```text
+--------------------------------------------------+
|          UPSCALER ARCANO                         |
|         Plano Starter                            |
|                                                  |
| Ola [Nome]!                                      |
|                                                  |
| Sua compra do Upscaler Arcano - Plano Starter    |
| foi confirmada com sucesso!                      |
|                                                  |
| +----------------------------------------------+ |
| |          +1.800 CREDITOS                      | |
| |     adicionados a sua conta                   | |
| +----------------------------------------------+ |
|                                                  |
| Use seus creditos nas ferramentas de IA:         |
| Upscaler Arcano, Forja de Selos 3D, e mais!     |
|                                                  |
| Dados do primeiro acesso:                        |
| Email: usuario@email.com                         |
| Senha: usuario@email.com                         |
| (troque sua senha no primeiro acesso)            |
|                                                  |
| [======= ACESSAR MINHA CONTA =======]            |
|   -> https://arcanolab.voxvisual.com.br/         |
|                                                  |
| Duvidas? Responda este email!                    |
|              (c) Arcano App                      |
+--------------------------------------------------+
```

**Subject:** "Upscaler Arcano - Plano Starter | +1.800 Creditos Adicionados!"
**From:** Arcano App (contato@voxvisual.com.br)
**CTA:** Botao levando para **https://arcanolab.voxvisual.com.br/**

## Detalhes Tecnicos

- O link atual `arcanoapp.voxvisual.com.br/ferramentas-ia` sera substituido por `arcanolab.voxvisual.com.br/` para produtos Upscaler
- Produtos de creditos puros (156946/156948/156952) continuam com o template e link atuais
- Deploy automatico das 2 Edge Functions apos as alteracoes

