/**
 * ============================================================
 * CONFIGURAÇÃO CENTRAL DE PRODUTOS — Checkout Multi-Provider
 * ============================================================
 *
 * Este arquivo centraliza todos os produtos da plataforma e
 * permite migrar qualquer um para Stripe sem alterar nenhum
 * outro arquivo do projeto.
 *
 * PASSO A PASSO PARA MIGRAR UM PRODUTO PARA STRIPE:
 *
 *   1. Acesse o Stripe Dashboard e crie um Price ID para o produto
 *      (Menu → Products → Add product → copie o Price ID, ex: price_1Abc...)
 *
 *   2. Localize o produto neste arquivo pelo seu slug
 *      (use Ctrl+F e busque pelo slug, ex: "upscaler-arcano-starter")
 *
 *   3. Altere o campo `provider` de 'pagarme' para 'stripe'
 *
 *   4. Preencha o campo `stripePriceId` com o Price ID copiado do Stripe
 *      (ex: stripePriceId: 'price_1Abc123def456')
 *
 *   5. Garanta que a variável VITE_STRIPE_PUBLISHABLE_KEY está configurada
 *      no .env com a chave pública real do Stripe
 *
 *   PRONTO! Nenhum outro arquivo precisa ser alterado.
 *   O hook useCheckout detecta automaticamente o provider e
 *   redireciona para o fluxo correto.
 *
 * ============================================================
 */

/** Provider de checkout ativo para o produto */
export type CheckoutProvider = 'pagarme' | 'stripe' | 'disabled';

/** Modo de cobrança no Stripe */
export type StripeMode = 'payment' | 'subscription';

/** Configuração de um produto para checkout */
export interface CheckoutProductConfig {
  /** Slug único do produto (idêntico ao campo slug em mp_products) */
  slug: string;
  /** Nome do produto (idêntico ao campo title em mp_products) */
  title: string;
  /** Preço em centavos (BRL). Ex: R$ 24,90 = 2490 */
  priceInCents: number;
  /** Moeda ISO 4217 */
  currency: string;
  /** Provider de checkout ativo agora */
  provider: CheckoutProvider;
  /** URL ou slug do checkout atual (Pagar.me) — usado quando provider='pagarme' */
  currentCheckoutSlug: string;
  /** Stripe Price ID — preencher quando migrar para Stripe */
  stripePriceId: string;
  /** Modo Stripe: pagamento único ou assinatura */
  stripeMode: StripeMode;
  /** Produto está ativo? */
  isActive: boolean;
  /** Tipo do produto (pack, credits, subscription, landing_bundle) */
  type: string;
}

/**
 * Lista completa dos 104 produtos mapeados da tabela mp_products.
 * Todos apontam para provider 'pagarme' (sistema atual).
 */
export const checkoutProducts: CheckoutProductConfig[] = [
  // ─── PACK AGENDAS ───
  { slug: 'agendas-1ano', title: 'Pack Agendas - 1 Ano', priceInCents: 3700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'agendas-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'agendas-6meses', title: 'Pack Agendas - 6 Meses', priceInCents: 2700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'agendas-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'agendas-membro-1ano', title: 'Pack Agendas - Membro 1 Ano', priceInCents: 2960, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'agendas-membro-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'agendas-membro-6meses', title: 'Pack Agendas - Membro 6 Meses', priceInCents: 2160, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'agendas-membro-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'agendas-membro-vitalicio', title: 'Pack Agendas - Membro Vitalício', priceInCents: 3760, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'agendas-membro-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'agendas-renov-1ano', title: 'Pack Agendas - Renovação 1 Ano', priceInCents: 2590, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'agendas-renov-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'agendas-renov-6meses', title: 'Pack Agendas - Renovação 6 Meses', priceInCents: 1890, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'agendas-renov-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'agendas-renov-vitalicio', title: 'Pack Agendas - Renovação Vitalício', priceInCents: 3290, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'agendas-renov-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'agendas-vitalicio', title: 'Pack Agendas - Vitalício', priceInCents: 4700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'agendas-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },

  // ─── PACK CARNAVAL ───
  { slug: 'carnaval-1ano', title: 'Pack Carnaval - 1 Ano', priceInCents: 3700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'carnaval-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'carnaval-6meses', title: 'Pack Carnaval - 6 Meses', priceInCents: 2700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'carnaval-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'carnaval-membro-1ano', title: 'Pack Carnaval - Membro 1 Ano', priceInCents: 2960, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'carnaval-membro-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'carnaval-membro-6meses', title: 'Pack Carnaval - Membro 6 Meses', priceInCents: 2160, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'carnaval-membro-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'carnaval-membro-vitalicio', title: 'Pack Carnaval - Membro Vitalício', priceInCents: 3760, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'carnaval-membro-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'carnaval-renov-1ano', title: 'Pack Carnaval - Renovação 1 Ano', priceInCents: 2590, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'carnaval-renov-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'carnaval-renov-6meses', title: 'Pack Carnaval - Renovação 6 Meses', priceInCents: 1890, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'carnaval-renov-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'carnaval-renov-vitalicio', title: 'Pack Carnaval - Renovação Vitalício', priceInCents: 3290, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'carnaval-renov-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'carnaval-vitalicio', title: 'Pack Carnaval - Vitalício', priceInCents: 4700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'carnaval-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },

  // ─── COMBOS ───
  { slug: 'combo-1ao3-vitalicio', title: 'Combo Packs Arcano 1 ao 3 - Vitalício', priceInCents: 5990, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'combo-1ao3-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'combo-1e2-1ano', title: 'Combo Packs Arcano 1 e 2 - 1 Ano', priceInCents: 4990, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'combo-1e2-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'combo-vol1-1ano', title: 'Combo Pack Arcano Vol.1 - 1 Ano', priceInCents: 2790, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'combo-vol1-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },

  // ─── CRÉDITOS AVULSOS ───
  { slug: 'creditos-14000', title: '14.000 Créditos Avulsos', priceInCents: 7990, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'creditos-14000', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'credits' },
  { slug: 'creditos-1500', title: '1.500 Créditos Avulsos', priceInCents: 1990, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'creditos-1500', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'credits' },
  { slug: 'creditos-4200', title: '4.200 Créditos Avulsos', priceInCents: 2990, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'creditos-4200', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'credits' },

  // ─── PACK FIM DE ANO ───
  { slug: 'fimdeano-1ano', title: 'Pack Fim de Ano - 1 Ano', priceInCents: 3700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'fimdeano-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'fimdeano-6meses', title: 'Pack Fim de Ano - 6 Meses', priceInCents: 2700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'fimdeano-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'fimdeano-membro-1ano', title: 'Pack Fim de Ano - Membro 1 Ano', priceInCents: 2960, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'fimdeano-membro-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'fimdeano-membro-6meses', title: 'Pack Fim de Ano - Membro 6 Meses', priceInCents: 2160, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'fimdeano-membro-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'fimdeano-membro-vitalicio', title: 'Pack Fim de Ano - Membro Vitalício', priceInCents: 3760, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'fimdeano-membro-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'fimdeano-renov-1ano', title: 'Pack Fim de Ano - Renovação 1 Ano', priceInCents: 2590, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'fimdeano-renov-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'fimdeano-renov-6meses', title: 'Pack Fim de Ano - Renovação 6 Meses', priceInCents: 1890, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'fimdeano-renov-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'fimdeano-renov-vitalicio', title: 'Pack Fim de Ano - Renovação Vitalício', priceInCents: 3290, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'fimdeano-renov-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'fimdeano-vitalicio', title: 'Pack Fim de Ano - Vitalício', priceInCents: 4700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'fimdeano-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },

  // ─── PACK HALLOWEEN ───
  { slug: 'halloween-1ano', title: 'Pack Halloween - 1 Ano', priceInCents: 3700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'halloween-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'halloween-6meses', title: 'Pack Halloween - 6 Meses', priceInCents: 2700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'halloween-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'halloween-membro-1ano', title: 'Pack Halloween - Membro 1 Ano', priceInCents: 2960, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'halloween-membro-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'halloween-membro-6meses', title: 'Pack Halloween - Membro 6 Meses', priceInCents: 2160, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'halloween-membro-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'halloween-membro-vitalicio', title: 'Pack Halloween - Membro Vitalício', priceInCents: 3760, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'halloween-membro-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'halloween-renov-1ano', title: 'Pack Halloween - Renovação 1 Ano', priceInCents: 2590, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'halloween-renov-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'halloween-renov-6meses', title: 'Pack Halloween - Renovação 6 Meses', priceInCents: 1890, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'halloween-renov-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'halloween-renov-vitalicio', title: 'Pack Halloween - Renovação Vitalício', priceInCents: 3290, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'halloween-renov-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'halloween-vitalicio', title: 'Pack Halloween - Vitalício', priceInCents: 4700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'halloween-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },

  // ─── LANDING BUNDLES (ARCANO CLONER) ───
  { slug: 'landing-pro-avulso', title: 'Pro - Arcano Cloner', priceInCents: 3700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'landing-pro-avulso', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'landing_bundle' },
  { slug: 'landing-starter-avulso', title: 'Starter - Arcano Cloner', priceInCents: 2490, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'landing-starter-avulso', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'landing_bundle' },
  { slug: 'landing-ultimate-avulso', title: 'Ultimate - Arcano Cloner', priceInCents: 7990, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'landing-ultimate-avulso', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'landing_bundle' },

  // ─── PACK ARCANO 4 ───
  { slug: 'pack4-1ano', title: 'Pack Arcano 4 - 1 Ano', priceInCents: 3700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'pack4-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'pack4-6meses', title: 'Pack Arcano 4 - 6 Meses', priceInCents: 2700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'pack4-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'pack4-membro-1ano', title: 'Pack Arcano 4 - Membro 1 Ano', priceInCents: 2960, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'pack4-membro-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'pack4-membro-6meses', title: 'Pack Arcano 4 - Membro 6 Meses', priceInCents: 2160, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'pack4-membro-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'pack4-membro-vitalicio', title: 'Pack Arcano 4 - Membro Vitalício', priceInCents: 3760, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'pack4-membro-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'pack4-renov-1ano', title: 'Pack Arcano 4 - Renovação 1 Ano', priceInCents: 2590, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'pack4-renov-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'pack4-renov-6meses', title: 'Pack Arcano 4 - Renovação 6 Meses', priceInCents: 1890, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'pack4-renov-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'pack4-renov-vitalicio', title: 'Pack Arcano 4 - Renovação Vitalício', priceInCents: 3290, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'pack4-renov-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'pack4-vitalicio', title: 'Pack Arcano 4 - Vitalício', priceInCents: 4700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'pack4-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'pack4lancamento', title: 'Pack Arcano 4 - Acesso Vitalício', priceInCents: 3700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'pack4lancamento', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },

  // ─── PLANOS (ASSINATURAS) ───
  { slug: 'plano-pro-anual', title: 'Plano Pro Anual', priceInCents: 40680, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'plano-pro-anual', stripePriceId: '', stripeMode: 'subscription', isActive: true, type: 'subscription' },
  { slug: 'plano-pro-mensal', title: 'Plano Pro Mensal', priceInCents: 3990, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'plano-pro-mensal', stripePriceId: '', stripeMode: 'subscription', isActive: true, type: 'subscription' },
  { slug: 'plano-starter-anual', title: 'Plano Starter Anual', priceInCents: 29880, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'plano-starter-anual', stripePriceId: '', stripeMode: 'subscription', isActive: true, type: 'subscription' },
  { slug: 'plano-starter-mensal', title: 'Plano Starter Mensal', priceInCents: 2490, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'plano-starter-mensal', stripePriceId: '', stripeMode: 'subscription', isActive: true, type: 'subscription' },
  { slug: 'plano-ultimate-anual', title: 'Plano Ultimate Anual', priceInCents: 59880, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'plano-ultimate-anual', stripePriceId: '', stripeMode: 'subscription', isActive: true, type: 'subscription' },
  { slug: 'plano-ultimate-mensal', title: 'Plano Ultimate Mensal', priceInCents: 5990, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'plano-ultimate-mensal', stripePriceId: '', stripeMode: 'subscription', isActive: true, type: 'subscription' },
  { slug: 'plano-unlimited-anual', title: 'Plano IA Unlimited Anual', priceInCents: 143880, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'plano-unlimited-anual', stripePriceId: '', stripeMode: 'subscription', isActive: true, type: 'subscription' },
  { slug: 'plano-unlimited-mensal', title: 'Plano IA Unlimited Mensal', priceInCents: 14990, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'plano-unlimited-mensal', stripePriceId: '', stripeMode: 'subscription', isActive: true, type: 'subscription' },

  // ─── PACK SÃO JOÃO ───
  { slug: 'saojoao-1ano', title: 'Pack São João - 1 Ano', priceInCents: 3700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'saojoao-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'saojoao-6meses', title: 'Pack São João - 6 Meses', priceInCents: 2700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'saojoao-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'saojoao-membro-1ano', title: 'Pack São João - Membro 1 Ano', priceInCents: 2960, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'saojoao-membro-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'saojoao-membro-6meses', title: 'Pack São João - Membro 6 Meses', priceInCents: 2160, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'saojoao-membro-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'saojoao-membro-vitalicio', title: 'Pack São João - Membro Vitalício', priceInCents: 3760, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'saojoao-membro-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'saojoao-renov-1ano', title: 'Pack São João - Renovação 1 Ano', priceInCents: 2590, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'saojoao-renov-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'saojoao-renov-6meses', title: 'Pack São João - Renovação 6 Meses', priceInCents: 1890, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'saojoao-renov-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'saojoao-renov-vitalicio', title: 'Pack São João - Renovação Vitalício', priceInCents: 3290, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'saojoao-renov-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'saojoao-vitalicio', title: 'Pack São João - Vitalício', priceInCents: 4700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'saojoao-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },

  // ─── UPSCALER ARCANO ───
  { slug: 'upscaler-arcano-v3-es', title: 'Upscaler Arcano V3 - Acceso Vitalicio (LATAM)', priceInCents: 1990, currency: 'usd', provider: 'stripe', currentCheckoutSlug: '', stripePriceId: 'price_1THYRTL0tOYcQz0tT7ay9iQh', stripeMode: 'payment', isActive: true, type: 'landing_bundle' },
  { slug: 'upscaler-arcano-starter-es', title: 'Upscaler Arcano Starter (LATAM)', priceInCents: 690, currency: 'usd', provider: 'stripe', currentCheckoutSlug: '', stripePriceId: 'price_1TJIPBL0tOYcQz0txOPZYdRG', stripeMode: 'payment', isActive: true, type: 'credits' },
  { slug: 'upscaler-arcano-pro-es', title: 'Upscaler Arcano Pro (LATAM)', priceInCents: 890, currency: 'usd', provider: 'stripe', currentCheckoutSlug: '', stripePriceId: 'price_1TJIPLL0tOYcQz0tJZVVofrD', stripeMode: 'payment', isActive: true, type: 'credits' },
  { slug: 'upscaler-arcano-ultimate-es', title: 'Upscaler Arcano Ultimate (LATAM)', priceInCents: 1690, currency: 'usd', provider: 'stripe', currentCheckoutSlug: '', stripePriceId: 'price_1TJIPML0tOYcQz0tUWzNkecR', stripeMode: 'payment', isActive: true, type: 'credits' },
  { slug: 'upscaler-arcano-pro', title: 'Upscaler Arcano - Pro', priceInCents: 3700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'upscaler-arcano-pro', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'credits' },
  { slug: 'upscaler-arcano-starter', title: 'Upscaler Arcano - Starter', priceInCents: 2490, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'upscaler-arcano-starter', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'credits' },
  { slug: 'upscaler-arcano-ultimate', title: 'Upscaler Arcano - Ultimate', priceInCents: 7990, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'upscaler-arcano-ultimate', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'credits' },
  { slug: 'upscaler-arcano-v3', title: 'Upscaler Arcano V3', priceInCents: 9990, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'upscaler-arcano-v3', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'upscaller-arcano-vitalicio', title: 'Upscaler Arcano - Acesso Vitalício', priceInCents: 9990, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'upscaller-arcano-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },

  // ─── PACK ARCANO VOL 1 ───
  { slug: 'vol1-1ano', title: 'Pack Arcano 1 - 1 Ano', priceInCents: 3700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol1-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol1-6meses', title: 'Pack Arcano 1 - 6 Meses', priceInCents: 2700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol1-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol1-membro-1ano', title: 'Pack Arcano 1 - Membro 1 Ano', priceInCents: 2960, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol1-membro-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol1-membro-6meses', title: 'Pack Arcano 1 - Membro 6 Meses', priceInCents: 2160, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol1-membro-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol1-membro-vitalicio', title: 'Pack Arcano 1 - Membro Vitalício', priceInCents: 3760, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol1-membro-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol1-renov-1ano', title: 'Pack Arcano 1 - Renovação 1 Ano', priceInCents: 2590, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol1-renov-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol1-renov-6meses', title: 'Pack Arcano 1 - Renovação 6 Meses', priceInCents: 1890, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol1-renov-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol1-renov-vitalicio', title: 'Pack Arcano 1 - Renovação Vitalício', priceInCents: 3290, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol1-renov-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol1-vitalicio', title: 'Pack Arcano 1 - Vitalício', priceInCents: 4700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol1-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },

  // ─── PACK ARCANO VOL 2 ───
  { slug: 'vol2-1ano', title: 'Pack Arcano 2 - 1 Ano', priceInCents: 3700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol2-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol2-6meses', title: 'Pack Arcano 2 - 6 Meses', priceInCents: 2700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol2-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol2-membro-1ano', title: 'Pack Arcano 2 - Membro 1 Ano', priceInCents: 2960, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol2-membro-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol2-membro-6meses', title: 'Pack Arcano 2 - Membro 6 Meses', priceInCents: 2160, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol2-membro-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol2-membro-vitalicio', title: 'Pack Arcano 2 - Membro Vitalício', priceInCents: 3760, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol2-membro-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol2-renov-1ano', title: 'Pack Arcano 2 - Renovação 1 Ano', priceInCents: 2590, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol2-renov-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol2-renov-6meses', title: 'Pack Arcano 2 - Renovação 6 Meses', priceInCents: 1890, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol2-renov-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol2-renov-vitalicio', title: 'Pack Arcano 2 - Renovação Vitalício', priceInCents: 3290, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol2-renov-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol2-vitalicio', title: 'Pack Arcano 2 - Vitalício', priceInCents: 4700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol2-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },

  // ─── PACK ARCANO VOL 3 ───
  { slug: 'vol3-1ano', title: 'Pack Arcano 3 - 1 Ano', priceInCents: 3700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol3-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol3-6meses', title: 'Pack Arcano 3 - 6 Meses', priceInCents: 2700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol3-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol3-membro-1ano', title: 'Pack Arcano 3 - Membro 1 Ano', priceInCents: 2960, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol3-membro-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol3-membro-6meses', title: 'Pack Arcano 3 - Membro 6 Meses', priceInCents: 2160, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol3-membro-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol3-membro-vitalicio', title: 'Pack Arcano 3 - Membro Vitalício', priceInCents: 3760, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol3-membro-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol3-renov-1ano', title: 'Pack Arcano 3 - Renovação 1 Ano', priceInCents: 2590, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol3-renov-1ano', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol3-renov-6meses', title: 'Pack Arcano 3 - Renovação 6 Meses', priceInCents: 1890, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol3-renov-6meses', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol3-renov-vitalicio', title: 'Pack Arcano 3 - Renovação Vitalício', priceInCents: 3290, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol3-renov-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
  { slug: 'vol3-vitalicio', title: 'Pack Arcano 3 - Vitalício', priceInCents: 4700, currency: 'brl', provider: 'pagarme', currentCheckoutSlug: 'vol3-vitalicio', stripePriceId: '', stripeMode: 'payment', isActive: true, type: 'pack' },
];

/**
 * Busca um produto pela slug.
 * Retorna undefined se não encontrado.
 */
export function getProductBySlug(slug: string): CheckoutProductConfig | undefined {
  return checkoutProducts.find((p) => p.slug === slug);
}

/**
 * Formata preço em centavos para exibição em BRL.
 * Ex: 2490 → "R$ 24,90"
 */
export function formatPrice(priceInCents: number, currency: string = 'BRL'): string {
  const locale = currency.toUpperCase() === 'BRL' ? 'pt-BR' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(priceInCents / 100);
}
