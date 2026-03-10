import { useState, useEffect } from "react";
import { X, CreditCard, QrCode, ArrowRight, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PreCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const PreCheckoutModal = ({ isOpen, onClose, userEmail }: PreCheckoutModalProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [cpf, setCpf] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [loading, setLoading] = useState(false);

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailConfirmError, setEmailConfirmError] = useState('');
  const [cpfError, setCpfError] = useState('');

  useEffect(() => {
    if (userEmail) {
      setEmail(userEmail);
      setEmailConfirm(userEmail);
    }
  }, [userEmail]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const validate = () => {
    let valid = true;
    setNameError(''); setEmailError(''); setEmailConfirmError(''); setCpfError('');

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

    const cpfDigits = cpf.replace(/\D/g, '');
    if (!cpfDigits) {
      setCpfError('Digite seu CPF');
      valid = false;
    } else if (cpfDigits.length !== 11) {
      setCpfError('CPF inválido (11 dígitos)');
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      let utmData: Record<string, string> | null = null;
      try {
        const raw = sessionStorage.getItem('captured_utms');
        if (raw) utmData = JSON.parse(raw);
      } catch { /* ignore */ }

      const response = await supabase.functions.invoke('create-pagarme-checkout', {
        body: {
          product_slug: 'upscaller-arcano-vitalicio',
          user_email: email.trim().toLowerCase(),
          user_cpf: cpf.replace(/\D/g, ''),
          user_name: name.trim(),
          billing_type: paymentMethod,
          utm_data: utmData
        }
      });

      if (response.error) {
        console.error('Erro ao criar checkout:', response.error);
        alert('Erro ao criar checkout. Tente novamente.');
        setLoading(false);
        return;
      }

      const { checkout_url } = response.data;
      if (checkout_url) {
        window.location.href = checkout_url;
      } else {
        alert('Erro ao gerar link de pagamento.');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao processar. Tente novamente.');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md bg-gradient-to-br from-[#1a0f25] to-[#150a1a] border border-fuchsia-500/30 rounded-3xl p-6 md:p-8 shadow-2xl shadow-fuchsia-500/10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <h3 className="font-bebas text-2xl md:text-3xl text-white text-center mb-1 tracking-wide">
          Finalizar <span className="text-fuchsia-400">Compra</span>
        </h3>
        <p className="text-white/50 text-sm text-center mb-6">Preencha seus dados para continuar</p>

        {/* Form */}
        <div className="space-y-4">
          {/* Nome */}
          <div>
            <label className="text-white/70 text-sm mb-1.5 block">Nome completo</label>
            <input
              type="text"
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20 transition-all"
            />
            {nameError && <p className="text-red-400 text-xs mt-1">{nameError}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="text-white/70 text-sm mb-1.5 block">Email</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              disabled={!!userEmail}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {emailError && <p className="text-red-400 text-xs mt-1">{emailError}</p>}
          </div>

          {/* Email Confirm */}
          {!userEmail && (
            <div>
              <label className="text-white/70 text-sm mb-1.5 block">Confirme seu email</label>
              <input
                type="email"
                placeholder="Digite novamente seu email"
                value={emailConfirm}
                onChange={(e) => { setEmailConfirm(e.target.value); setEmailConfirmError(''); }}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20 transition-all"
              />
              {emailConfirmError && <p className="text-red-400 text-xs mt-1">{emailConfirmError}</p>}
            </div>
          )}

          {/* CPF */}
          <div>
            <label className="text-white/70 text-sm mb-1.5 block">CPF</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => { setCpf(formatCpf(e.target.value)); setCpfError(''); }}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20 transition-all"
            />
            {cpfError && <p className="text-red-400 text-xs mt-1">{cpfError}</p>}
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-white/70 text-sm mb-2 block">Forma de pagamento</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('PIX')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                  paymentMethod === 'PIX'
                    ? 'border-fuchsia-500 bg-fuchsia-500/10 text-white'
                    : 'border-white/15 bg-white/5 text-white/60 hover:border-white/30'
                }`}
              >
                <QrCode className="h-6 w-6" />
                <span className="text-sm font-medium">PIX</span>
                {paymentMethod === 'PIX' && (
                  <span className="text-[10px] text-fuchsia-300">Aprovação instantânea</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CREDIT_CARD')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                  paymentMethod === 'CREDIT_CARD'
                    ? 'border-fuchsia-500 bg-fuchsia-500/10 text-white'
                    : 'border-white/15 bg-white/5 text-white/60 hover:border-white/30'
                }`}
              >
                <CreditCard className="h-6 w-6" />
                <span className="text-sm font-medium">Cartão</span>
                {paymentMethod === 'CREDIT_CARD' && (
                  <span className="text-[10px] text-fuchsia-300">Até 3x sem juros</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-6 py-4 text-base font-bold rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white shadow-xl shadow-fuchsia-500/25 transition-all duration-300 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
        >
          {loading ? 'Gerando checkout...' : 'Finalizar e Pagar'}
          {!loading && <ArrowRight className="h-5 w-5" />}
        </button>

        <div className="flex items-center justify-center gap-2 mt-4 text-white/40 text-xs">
          <Shield className="h-3 w-3" />
          <span>Pagamento 100% seguro</span>
        </div>
      </div>
    </div>
  );
};

export default PreCheckoutModal;
