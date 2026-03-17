import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useProcessingButton } from "@/hooks/useProcessingButton";
import { X, CreditCard, QrCode, ArrowRight, Shield, Zap, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeCheckout } from "@/lib/checkoutFetch";
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
  const [oneClickResult, setOneClickResult] = useState<'approved' | 'declined' | null>(null);
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

  const showErrorToast = useCallback((errorCode?: string) => {
    const message = (errorCode && ERROR_MESSAGES[errorCode]) || 
      `Erro ao criar checkout. ${errorCode ? `(${errorCode})` : 'Tente novamente.'}`;
    
    toast({
      title: "Erro no checkout",
      description: message,
      variant: "destructive",
    });
  }, []);


  const validate = () => {
    let valid = true;
    setNameError(''); setEmailError(''); setEmailConfirmError(''); setPhoneError(''); setCpfError('');

    if (!name.trim() || name.trim().length < 3) {
      setNameError('Digite seu nome completo');
      valid = false;
    }

    const emailTrimmed = (email || userEmail || '').trim().toLowerCase();
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

    // CPF e celular obrigatórios para todos os métodos (antifraude)
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
        setOneClickResult('declined');
        setOneClickLoading(false);
        endOneClick();
        return;
      }

      const { is_paid, status } = response.data;

      if (is_paid) {
        setOneClickResult('approved');
      } else {
        setOneClickResult('declined');
      }
    } catch (error) {
      console.error('Erro one-click:', error);
      setOneClickResult('declined');
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
      const normalizedEmail = (email || userEmail || '').trim().toLowerCase();

      // Envia dados completos para todos os métodos (antifraude)
      const fullPayload = {
        product_slug: productSlug,
        user_email: normalizedEmail,
        user_phone: phone.replace(/\D/g, ''),
        user_name: name.trim(),
        user_cpf: cpf.replace(/\D/g, ''),
        billing_type: paymentMethod,
        utm_data: utmData,
        fbp,
        fbc,
      };

      // PIX: tenta full primeiro, fallback lightweight se necessário
      console.log('[PreCheckoutModal] Chamando checkout full...');
      const fullResponse = await invokeCheckout(fullPayload);

      if (!fullResponse.error && fullResponse.data?.checkout_url) {
        const { checkout_url, event_id } = fullResponse.data;
        console.log(`[PreCheckoutModal] ✅ Full checkout OK: ${checkout_url.substring(0, 60)}...`);
        if (typeof window !== 'undefined' && (window as any).fbq && event_id) {
          (window as any).fbq('track', 'InitiateCheckout', {}, { eventID: event_id });
        }
        window.location.href = checkout_url;
        return;
      }

      console.warn('[PreCheckoutModal] Full falhou, tentando lightweight...', fullResponse.error);
      const lightweightPayload = {
        product_slug: productSlug,
        user_email: normalizedEmail,
        user_name: name.trim(),
        billing_type: paymentMethod,
        utm_data: utmData,
        fbp,
        fbc,
        lightweight: true,
      };

      const lightResponse = await invokeCheckout(lightweightPayload);

      if (!lightResponse.error && lightResponse.data?.checkout_url) {
        const { checkout_url, event_id } = lightResponse.data;
        console.log(`[PreCheckoutModal] ✅ Lightweight checkout OK: ${checkout_url.substring(0, 60)}...`);
        if (typeof window !== 'undefined' && (window as any).fbq && event_id) {
          (window as any).fbq('track', 'InitiateCheckout', {}, { eventID: event_id });
        }
        window.location.href = checkout_url;
        return;
      }

      let errorCode = 'UNKNOWN';
      const errorSource = lightResponse.data?.error_code || fullResponse.data?.error_code;
      if (errorSource) {
        errorCode = errorSource;
      } else {
        try {
          const errBody = typeof lightResponse.error === 'object' ? lightResponse.error : JSON.parse(String(lightResponse.error));
          errorCode = errBody?.error_code || errBody?.context?.error_code || 'UNKNOWN';
        } catch {}
      }
      showErrorToast(errorCode);
    } catch (error) {
      console.error('Erro checkout:', error);
      showErrorToast();
    }
    setLoading(false);
    endFormSubmit();
  };

  if (!isOpen) return null;

  const hasSavedCards = savedCards.length > 0 && userId;
  const showOneClick = hasSavedCards && !showFullForm;

  const checkoutModal = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] bg-black/80 backdrop-blur-sm p-2 md:p-4"
      onClick={onClose}
    >
      <div className="min-h-full flex items-start md:items-center justify-center py-4 md:py-8">
        <div
          className={`relative w-full max-w-md bg-gradient-to-br ${modalBg} border ${accentBorderLight} rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-2xl ${modalShadow}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button onClick={onClose} className="absolute top-3 right-3 md:top-4 md:right-4 p-1.5 md:p-2 text-white/50 hover:text-white transition-colors z-10">
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </button>
...
        </div>
      </div>
    </div>
  );

  return (
    <>
      {typeof document !== 'undefined' ? createPortal(checkoutModal, document.body) : checkoutModal}

      {/* Modal de resultado da compra 1-clique */}
      <Dialog open={oneClickResult !== null} onOpenChange={() => {}}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogTitle className="sr-only">
            {oneClickResult === 'approved' ? 'Compra aprovada' : 'Compra recusada'}
          </DialogTitle>
          <div className="flex flex-col items-center gap-4 py-4">
            {oneClickResult === 'approved' ? (
              <>
                <CheckCircle2 className="h-16 w-16 text-green-400" />
                <h3 className="text-xl font-bold">Compra aprovada!</h3>
                <p className="text-sm text-white/60 text-center">Seu pagamento foi processado com sucesso.</p>
                <button
                  onClick={() => {
                    setOneClickResult(null);
                    onClose();
                  }}
                  className="w-full py-3 font-bold rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors"
                >
                  Entendi
                </button>
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 text-red-400" />
                <h3 className="text-xl font-bold">Compra recusada</h3>
                <p className="text-sm text-white/60 text-center">Não foi possível processar o pagamento com este cartão.</p>
                <button
                  onClick={() => setOneClickResult(null)}
                  className="w-full py-3 font-bold rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  Escolher outro meio de pagamento
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PreCheckoutModal;
