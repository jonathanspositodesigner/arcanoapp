import { useState, useEffect, useRef, useCallback } from "react";
import { useProcessingButton } from "@/hooks/useProcessingButton";
import { X, CreditCard, QrCode, ArrowRight, Shield, Zap, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getMetaCookies } from "@/lib/metaCookies";
import { getSanitizedUtms } from "@/lib/utmUtils";

interface PreCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
  userId?: string | null;
  productSlug?: string;
  modalTitle?: string;
  colorScheme?: 'fuchsia' | 'orange';
}

interface SavedCard {
  id: string;
  card_last_four: string;
  card_brand: string;
}

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const validateCPF = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  for (let t = 9; t < 11; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += parseInt(digits[i]) * (t + 1 - i);
    const remainder = (sum * 10) % 11;
    if ((remainder === 10 ? 0 : remainder) !== parseInt(digits[t])) return false;
  }
  return true;
};

const brandDisplay: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  elo: 'Elo',
  amex: 'Amex',
  hipercard: 'Hipercard',
  unknown: 'Cartão',
};

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

// Error messages for detailed feedback

const ERROR_MESSAGES: Record<string, string> = {
  'RATE_LIMITED': 'Muitas tentativas. Aguarde 1 minuto e tente novamente.',
  'GATEWAY_UNREACHABLE': 'Gateway de pagamento temporariamente indisponível.',
  'INVALID_CPF': 'CPF inválido. Verifique os dígitos informados.',
  'INVALID_PHONE': 'Celular inválido. Informe DDD + número.',
  'INVALID_EMAIL': 'Email inválido. Verifique o endereço.',
  'PRODUCT_NOT_FOUND': 'Produto não encontrado. Recarregue a página.',
  'CONFIG_ERROR': 'Erro de configuração. Tente novamente em instantes.',
};

const PreCheckoutModal = ({ isOpen, onClose, userEmail, userId, productSlug = 'upscaller-arcano-vitalicio', modalTitle, colorScheme = 'fuchsia' }: PreCheckoutModalProps) => {
  const isOrange = colorScheme === 'orange';
  const accentBorder = isOrange ? 'border-[#EF672C]' : 'border-fuchsia-500';
  const accentBorderLight = isOrange ? 'border-[#EF672C]/30' : 'border-fuchsia-500/30';
  const accentBg = isOrange ? 'bg-[#EF672C]/10' : 'bg-fuchsia-500/10';
  const accentText = isOrange ? 'text-[#EF672C]' : 'text-fuchsia-400';
  const accentTextLight = isOrange ? 'text-[#EF672C]/80' : 'text-fuchsia-300';
  const btnGradient = isOrange ? 'from-[#EF672C] to-[#f65928]' : 'from-fuchsia-500 to-purple-600';
  const btnGradientHover = isOrange ? 'hover:from-[#d55a24] hover:to-[#e04e1f]' : 'hover:from-fuchsia-600 hover:to-purple-700';
  const btnShadow = isOrange ? 'shadow-[#EF672C]/25' : 'shadow-fuchsia-500/25';
  const modalBg = isOrange ? 'from-[#1a0a0a] to-[#150a05]' : 'from-[#1a0f25] to-[#150a1a]';
  const modalShadow = isOrange ? 'shadow-[#EF672C]/10' : 'shadow-fuchsia-500/10';
  const focusBorder = isOrange ? 'focus:border-[#EF672C]/50 focus:ring-[#EF672C]/20' : 'focus:border-fuchsia-500/50 focus:ring-fuchsia-500/20';
  const titleText = modalTitle || 'Finalizar Compra';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [loading, setLoading] = useState(false);
  const { isSubmitting: isFormSubmitting, startSubmit: startFormSubmit, endSubmit: endFormSubmit } = useProcessingButton();
  const { isSubmitting: isOneClickSubmitting, startSubmit: startOneClick, endSubmit: endOneClick } = useProcessingButton();

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailConfirmError, setEmailConfirmError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [cpfError, setCpfError] = useState('');

  // One-click state
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [oneClickLoading, setOneClickLoading] = useState(false);
  const [showFullForm, setShowFullForm] = useState(false);

  // Race control ref
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (userEmail) {
      setEmail(userEmail);
      setEmailConfirm(userEmail);
    }
  }, [userEmail]);

  // Fetch saved cards for logged-in users
  useEffect(() => {
    if (!isOpen || !userId) {
      setSavedCards([]);
      return;
    }

    const fetchCards = async () => {
      const { data, error } = await supabase
        .from('pagarme_saved_cards')
        .select('id, card_last_four, card_brand')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setSavedCards(data);
        setSelectedCardId(data[0].id);
      } else {
        setSavedCards([]);
      }
    };

    fetchCards();
  }, [isOpen, userId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setShowFullForm(false);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const validate = () => {
    let valid = true;
    setNameError(''); setEmailError(''); setEmailConfirmError(''); setPhoneError(''); setCpfError('');

    if (!name.trim() || name.trim().length < 3) {
      setNameError('Digite seu nome completo');
      valid = false;
    }

    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) {
      setEmailError('Digite seu email');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setEmailError('Email inválido');
      valid = false;
    }

    if (!userEmail) {
      const confirmTrimmed = emailConfirm.trim().toLowerCase();
      if (emailTrimmed !== confirmTrimmed) {
        setEmailConfirmError('Os emails não coincidem');
        valid = false;
      }
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneDigits) {
      setPhoneError('Digite seu celular');
      valid = false;
    } else if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setPhoneError('Celular inválido (DDD + número)');
      valid = false;
    }

    const cpfDigits = cpf.replace(/\D/g, '');
    if (!cpfDigits) {
      setCpfError('Digite seu CPF');
      valid = false;
    } else if (!validateCPF(cpfDigits)) {
      setCpfError('CPF inválido');
      valid = false;
    }

    return valid;
  };

  const handleOneClickBuy = async () => {
    if (!selectedCardId) return;
    if (!startOneClick()) return;

    setOneClickLoading(true);
    try {
      const utmData = getSanitizedUtms();

      const { fbp, fbc } = getMetaCookies();
      const response = await supabase.functions.invoke('pagarme-one-click', {
        body: {
          product_slug: productSlug,
          saved_card_id: selectedCardId,
          utm_data: utmData,
          fbp,
          fbc,
        }
      });

      if (response.error) {
        console.error('Erro one-click:', response.error);
        alert('Erro ao processar pagamento. Tente outro método de pagamento.');
        setOneClickLoading(false);
        return;
      }

      const { is_paid, status } = response.data;

      if (is_paid) {
        // Redirecionar para sucesso baseado no produto
        const successPage = productSlug?.includes('upscaler-arcano') || productSlug === 'upscaller-arcano'
          ? '/sucesso-upscaler-arcano'
          : '/sucesso-compra';
        window.location.href = `https://arcanoapp.voxvisual.com.br${successPage}`;
      } else {
        // Pagamento pendente — webhook vai processar
        alert('Pagamento em processamento. Você receberá uma confirmação em instantes.');
        onClose();
      }
    } catch (error) {
      console.error('Erro one-click:', error);
      alert('Erro ao processar. Tente outro método de pagamento.');
    }
    setOneClickLoading(false);
    endOneClick();
  };

  const handleRemoveCard = async (cardId: string) => {
    const confirmed = window.confirm('Deseja remover este cartão salvo?');
    if (!confirmed) return;

    await supabase
      .from('pagarme_saved_cards')
      .update({ is_active: false })
      .eq('id', cardId);

    setSavedCards(prev => prev.filter(c => c.id !== cardId));
    if (selectedCardId === cardId) {
      setSelectedCardId(null);
    }
  };

  const showErrorToast = useCallback((errorCode?: string) => {
    const message = (errorCode && ERROR_MESSAGES[errorCode]) || 
      `Erro ao criar checkout. ${errorCode ? `(${errorCode})` : 'Tente novamente.'}`;
    
    toast({
      title: "Erro no checkout",
      description: message,
      variant: "destructive",
    });
  }, []);

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!productSlug) {
      console.error('[PreCheckoutModal] productSlug inválido:', productSlug);
      toast({ title: "Erro", description: "Produto não identificado. Feche e tente novamente.", variant: "destructive" });
      return;
    }
    if (!startFormSubmit()) return;

    setLoading(true);
    redirectedRef.current = false;

    try {
      const utmData = getSanitizedUtms();
      const { fbp, fbc } = getMetaCookies();
      
      const fullPayload = {
        product_slug: productSlug,
        user_email: email.trim().toLowerCase(),
        user_phone: phone.replace(/\D/g, ''),
        user_name: name.trim(),
        user_cpf: cpf.replace(/\D/g, ''),
        billing_type: paymentMethod,
        utm_data: utmData,
        fbp,
        fbc,
      };

      const lightweightPayload = {
        product_slug: productSlug,
        user_email: email.trim().toLowerCase(),
        user_name: name.trim(),
        billing_type: paymentMethod,
        utm_data: utmData,
        fbp,
        fbc,
        lightweight: true,
      };

      // Dual-fire: race full vs lightweight checkout
      const fullCall = supabase.functions.invoke('create-pagarme-checkout', { body: fullPayload });
      const lightCall = supabase.functions.invoke('create-pagarme-checkout', { body: lightweightPayload });

      const tryRedirect = (response: any, label: string): boolean => {
        if (redirectedRef.current) return true;
        if (response.error) {
          console.warn(`[${label}] Erro:`, response.error);
          return false;
        }
        const { checkout_url, event_id } = response.data || {};
        if (checkout_url) {
          redirectedRef.current = true;
          console.log(`[${label}] ✅ Redirect: ${checkout_url.substring(0, 60)}...`);
          if (typeof window !== 'undefined' && (window as any).fbq && event_id) {
            (window as any).fbq('track', 'InitiateCheckout', {}, { eventID: event_id });
          }
          window.location.href = checkout_url;
          return true;
        }
        return false;
      };

      // Race: first successful checkout_url wins
      const results = await Promise.allSettled([fullCall, lightCall]);
      
      for (const [i, result] of results.entries()) {
        if (result.status === 'fulfilled' && tryRedirect(result.value, i === 0 ? 'Full' : 'Lightweight')) {
          return; // Redirected successfully
        }
      }

      // Both failed - show detailed error
      let errorCode = 'UNKNOWN';
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value?.data?.error_code) {
          errorCode = result.value.data.error_code;
          break;
        }
        if (result.status === 'fulfilled' && result.value?.error) {
          try {
            const errBody = typeof result.value.error === 'object' ? result.value.error : JSON.parse(String(result.value.error));
            errorCode = errBody?.error_code || errBody?.context?.error_code || 'UNKNOWN';
          } catch {}
          if (errorCode !== 'UNKNOWN') break;
        }
      }
      showErrorToast(errorCode);
    } catch (error) {
      console.error('Erro dual-fire:', error);
      showErrorToast();
    }
    setLoading(false);
    endFormSubmit();
  };

  if (!isOpen) return null;

  const hasSavedCards = savedCards.length > 0 && userId;
  const showOneClick = hasSavedCards && !showFullForm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-sm" onClick={loading ? undefined : onClose}>
      <div
        className={`relative w-full max-w-md bg-gradient-to-br ${modalBg} border ${accentBorderLight} rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-2xl ${modalShadow} max-h-[95vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close - disabled while loading */}
        <button onClick={loading ? undefined : onClose} disabled={loading} className={`absolute top-3 right-3 md:top-4 md:right-4 p-1.5 md:p-2 text-white/50 hover:text-white transition-colors z-10 ${loading ? 'opacity-30 cursor-not-allowed' : ''}`}>
          <X className="h-4 w-4 md:h-5 md:w-5" />
        </button>

        {/* Title */}
        <h3 className="font-bebas text-xl md:text-3xl text-white text-center mb-0.5 md:mb-1 tracking-wide">
          {titleText.includes(' ') ? (
            <>{titleText.split(' ').slice(0, -1).join(' ')} <span className={accentText}>{titleText.split(' ').slice(-1)}</span></>
          ) : (
            <span className={accentText}>{titleText}</span>
          )}
        </h3>
        <p className="text-white/50 text-xs md:text-sm text-center mb-3 md:mb-6">
          {showOneClick ? 'Compre de forma rápida e segura' : 'Preencha seus dados para continuar'}
        </p>

        {/* ===== ONE-CLICK BUY SECTION ===== */}
        {showOneClick && (
          <div className="space-y-4">
            <label className="text-white/70 text-sm mb-2 block">💳 Cartão salvo</label>
            <div className="space-y-2">
              {savedCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => setSelectedCardId(card.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    selectedCardId === card.id
                      ? `${accentBorder} ${accentBg}`
                      : 'border-white/15 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className={`h-5 w-5 ${accentText}`} />
                    <div>
                      <span className="text-white text-sm font-medium">
                        •••• {card.card_last_four}
                      </span>
                      <span className="text-white/50 text-xs ml-2">
                        {brandDisplay[card.card_brand] || card.card_brand}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedCardId === card.id && (
                      <span className={`${accentText} text-xs`}>✓</span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveCard(card.id); }}
                      className="p-1 text-white/30 hover:text-red-400 transition-colors"
                      title="Remover cartão"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* One-click buy button */}
            <button
              onClick={handleOneClickBuy}
              disabled={oneClickLoading || !selectedCardId || isOneClickSubmitting}
              className={`w-full mt-4 py-4 text-base font-bold rounded-full bg-gradient-to-r ${btnGradient} ${btnGradientHover} text-white shadow-xl ${btnShadow} transition-all duration-300 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2`}
            >
              {oneClickLoading ? (
                'Processando...'
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Comprar com 1 Clique
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/30 text-xs">ou</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Switch to full form */}
            <button
              onClick={() => setShowFullForm(true)}
              className="w-full text-center text-white/50 hover:text-white text-sm transition-colors py-2"
            >
              Usar outro método de pagamento →
            </button>

            <div className="flex items-center justify-center gap-2 mt-2 text-white/40 text-xs">
              <Shield className="h-3 w-3" />
              <span>Pagamento 100% seguro</span>
            </div>
          </div>
        )}

        {/* ===== FULL FORM (default or fallback) ===== */}
        {!showOneClick && (
          <>
            {/* Back to one-click if available */}
            {hasSavedCards && showFullForm && (
              <button
                onClick={() => setShowFullForm(false)}
                className={`${accentText} text-sm mb-4 hover:underline`}
              >
                ← Voltar para compra rápida
              </button>
            )}

            <div className="space-y-2.5 md:space-y-4">
              {/* Nome */}
              <div>
                <label className="text-white/70 text-xs md:text-sm mb-1 md:mb-1.5 block">Nome completo</label>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(''); }}
                  className={`w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none ${focusBorder} focus:ring-2 transition-all`}
                />
                {nameError && <p className="text-red-400 text-xs mt-1">{nameError}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="text-white/70 text-xs md:text-sm mb-1 md:mb-1.5 block">Email</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  disabled={!!userEmail}
                  className={`w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none ${focusBorder} focus:ring-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                />
                {emailError && <p className="text-red-400 text-xs mt-1">{emailError}</p>}
              </div>

              {/* Email Confirm */}
              {!userEmail && (
                <div>
                  <label className="text-white/70 text-xs md:text-sm mb-1 md:mb-1.5 block">Confirme seu email</label>
                  <input
                    type="email"
                    placeholder="Digite novamente seu email"
                    value={emailConfirm}
                    onChange={(e) => { setEmailConfirm(e.target.value); setEmailConfirmError(''); }}
                    className={`w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none ${focusBorder} focus:ring-2 transition-all`}
                  />
                  {emailConfirmError && <p className="text-red-400 text-xs mt-1">{emailConfirmError}</p>}
                </div>
              )}

              {/* Celular */}
              <div>
                <label className="text-white/70 text-xs md:text-sm mb-1 md:mb-1.5 block">Celular (com DDD)</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => { setPhone(formatPhone(e.target.value)); setPhoneError(''); }}
                  className={`w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none ${focusBorder} focus:ring-2 transition-all`}
                />
                {phoneError && <p className="text-red-400 text-xs mt-1">{phoneError}</p>}
              </div>

              {/* CPF */}
              <div>
                <label className="text-white/70 text-xs md:text-sm mb-1 md:mb-1.5 block">CPF</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => { setCpf(formatCpf(e.target.value)); setCpfError(''); }}
                  className={`w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none ${focusBorder} focus:ring-2 transition-all`}
                />
                {cpfError && <p className="text-red-400 text-xs mt-1">{cpfError}</p>}
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-white/70 text-xs md:text-sm mb-1.5 md:mb-2 block">Forma de pagamento</label>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PIX')}
                    className={`flex flex-col items-center gap-1.5 md:gap-2 p-3 md:p-4 rounded-xl border-2 transition-all duration-200 ${
                      paymentMethod === 'PIX'
                        ? `${accentBorder} ${accentBg} text-white`
                        : 'border-white/15 bg-white/5 text-white/60 hover:border-white/30'
                    }`}
                  >
                    <QrCode className="h-5 w-5 md:h-6 md:w-6" />
                    <span className="text-xs md:text-sm font-medium">PIX</span>
                    {paymentMethod === 'PIX' && (
                      <span className={`text-[10px] ${accentTextLight}`}>Aprovação instantânea</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CREDIT_CARD')}
                    className={`flex flex-col items-center gap-1.5 md:gap-2 p-3 md:p-4 rounded-xl border-2 transition-all duration-200 ${
                      paymentMethod === 'CREDIT_CARD'
                        ? `${accentBorder} ${accentBg} text-white`
                        : 'border-white/15 bg-white/5 text-white/60 hover:border-white/30'
                    }`}
                  >
                    <CreditCard className="h-5 w-5 md:h-6 md:w-6" />
                    <span className="text-xs md:text-sm font-medium">Cartão</span>
                    {paymentMethod === 'CREDIT_CARD' && (
                      <span className={`text-[10px] ${accentTextLight}`}>Até 3x sem juros</span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading || isFormSubmitting}
              className={`w-full mt-4 md:mt-6 py-3 md:py-4 text-sm md:text-base font-bold rounded-full bg-gradient-to-r ${btnGradient} ${btnGradientHover} text-white shadow-xl ${btnShadow} transition-all duration-300 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2`}
            >
              {loading ? 'Gerando checkout...' : 'Finalizar e Pagar'}
              {!loading && <ArrowRight className="h-5 w-5" />}
            </button>

            {/* Fallback checkout button - appears after 2s or on error */}
            {showFallback && FALLBACK_CHECKOUT_URLS[productSlug || ''] && (
              <div className="mt-3 space-y-2 animate-in fade-in duration-300">
                <button
                  onClick={handleFallbackClick}
                  className="w-full py-3 text-sm font-semibold rounded-full border-2 border-yellow-500/50 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {loading ? 'Checkout Reserva (enquanto carrega)' : 'Abrir Checkout Alternativo'}
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                {loading && (
                  <p className="text-white/40 text-[10px] text-center">
                    O checkout principal ainda está sendo gerado...
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 mt-4 text-white/40 text-xs">
              <Shield className="h-3 w-3" />
              <span>Pagamento 100% seguro</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PreCheckoutModal;
