import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Loader2, CheckCircle, XCircle, ArrowRight, Sparkles, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type PageState = 'email' | 'login' | 'signup' | 'blocked' | 'claiming' | 'success' | 'email_sent';

const TesteGratis = () => {
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const checkEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Digite seu email'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { toast.error('Digite um email válido'); return; }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-free-trial-eligibility`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ email: email.trim() })
        }
      );
      const result = await response.json();

      if (!result.eligible) {
        setPageState('blocked');
      } else if (result.has_account) {
        setPageState('login');
      } else {
        setPageState('signup');
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { toast.error('Digite sua senha'); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        toast.error('Senha incorreta. Tente novamente.');
        setLoading(false);
        return;
      }

      // Check email_verified
      const { data: profile } = await supabase
        .from('profiles')
        .select('email_verified')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!profile || !profile.email_verified) {
        toast.error('Seu email ainda não foi confirmado. Verifique sua caixa de entrada.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Claim free trial
      setPageState('claiming');
      const session = data.session;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim-free-trial`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      const result = await response.json();

      if (result.already_claimed) {
        setPageState('blocked');
        setLoading(false);
        return;
      }

      if (result.success) {
        setPageState('success');
        toast.success('300 créditos adicionados!');
        setTimeout(() => navigate('/ferramentas-ia-aplicativo'), 2500);
      } else {
        toast.error(result.error || 'Erro ao resgatar créditos');
        setPageState('login');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Digite seu nome'); return; }
    if (!password || password.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return; }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Create auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { name: name.trim() } }
      });

      if (signUpError) {
        toast.error(signUpError.message || 'Erro ao criar conta');
        setLoading(false);
        return;
      }

      if (!signUpData.user) {
        toast.error('Erro ao criar conta');
        setLoading(false);
        return;
      }

      // Create profile with email_verified=false
      const { error: profileError } = await supabase.from('profiles').insert({
        id: signUpData.user.id,
        name: name.trim(),
        email: normalizedEmail,
        email_verified: false,
        password_changed: true,
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      // Send confirmation email via SendPulse
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-confirmation-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            email: normalizedEmail,
            user_id: signUpData.user.id,
          })
        }
      );

      // Sign out immediately
      await supabase.auth.signOut();

      setPageState('email_sent');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510] flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <div className="relative z-10 mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-fuchsia-400" />
          ArcanoApp
        </h1>
      </div>

      {/* Main Card */}
      <Card className="relative z-10 w-full max-w-md bg-[#1a1025] border-2 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)] p-6 sm:p-8">

        {/* EMAIL STATE */}
        {(pageState === 'email') && (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 mb-4 shadow-lg shadow-fuchsia-500/30">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Teste Grátis</h2>
              <p className="text-purple-300 text-sm">Ganhe 300 créditos para usar nas Ferramentas de IA</p>
              <p className="text-purple-400/80 text-xs mt-1">⏳ Créditos válidos por 1 mês</p>
            </div>
            <form onSubmit={checkEligibility} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fuchsia-400" />
                <Input
                  type="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="pl-10 h-12 bg-[#0d0912] border-2 border-purple-600/50 text-white placeholder:text-purple-400/60 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold text-base shadow-lg shadow-fuchsia-500/25"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Verificando...</>
                ) : (
                  <>Verificar<ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>
            </form>
          </>
        )}

        {/* LOGIN STATE */}
        {pageState === 'login' && (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 mb-4 shadow-lg shadow-fuchsia-500/30">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Faça Login</h2>
              <p className="text-purple-300 text-sm">Digite sua senha para resgatar seus 300 créditos</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label className="text-purple-300 text-sm">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fuchsia-400" />
                  <Input
                    type="email"
                    value={email}
                    readOnly
                    className="pl-10 h-12 bg-[#0d0912] border-2 border-purple-600/30 text-purple-300 opacity-70"
                  />
                </div>
              </div>
              <div>
                <Label className="text-purple-300 text-sm">Senha</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fuchsia-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pl-10 pr-10 h-12 bg-[#0d0912] border-2 border-purple-600/50 text-white placeholder:text-purple-400/60 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold text-base shadow-lg shadow-fuchsia-500/25"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Entrando...</>
                ) : (
                  <>Entrar e Resgatar<ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>
              <button type="button" onClick={() => { setPageState('email'); setPassword(''); }} className="w-full text-sm text-purple-400 hover:text-purple-300 mt-2">
                ← Voltar
              </button>
            </form>
          </>
        )}

        {/* SIGNUP STATE */}
        {pageState === 'signup' && (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 mb-4 shadow-lg shadow-fuchsia-500/30">
                <User className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Crie sua Conta</h2>
              <p className="text-purple-300 text-sm">Cadastre-se para ganhar 300 créditos grátis</p>
              <p className="text-purple-400/80 text-xs mt-1">⏳ Créditos válidos por 1 mês</p>
            </div>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <Label className="text-purple-300 text-sm">Nome</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fuchsia-400" />
                  <Input
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    className="pl-10 h-12 bg-[#0d0912] border-2 border-purple-600/50 text-white placeholder:text-purple-400/60 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                  />
                </div>
              </div>
              <div>
                <Label className="text-purple-300 text-sm">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fuchsia-400" />
                  <Input
                    type="email"
                    value={email}
                    readOnly
                    className="pl-10 h-12 bg-[#0d0912] border-2 border-purple-600/30 text-purple-300 opacity-70"
                  />
                </div>
              </div>
              <div>
                <Label className="text-purple-300 text-sm">Senha</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fuchsia-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pl-10 pr-10 h-12 bg-[#0d0912] border-2 border-purple-600/50 text-white placeholder:text-purple-400/60 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold text-base shadow-lg shadow-fuchsia-500/25"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Criando conta...</>
                ) : (
                  <>Criar Conta<ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>
              <button type="button" onClick={() => { setPageState('email'); setPassword(''); setName(''); }} className="w-full text-sm text-purple-400 hover:text-purple-300 mt-2">
                ← Voltar
              </button>
            </form>
          </>
        )}

        {/* BLOCKED STATE */}
        {pageState === 'blocked' && (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 mb-4">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Promoção já resgatada</h2>
            <p className="text-red-400 text-sm mb-6">Você já resgatou uma promoção anteriormente.</p>
            <Button
              onClick={() => navigate('/ferramentas-ia-aplicativo')}
              className="w-full h-12 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold"
            >
              Ir para as Ferramentas de IA
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}

        {/* CLAIMING STATE */}
        {pageState === 'claiming' && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-fuchsia-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Resgatando créditos...</h2>
            <p className="text-purple-300 text-sm">Aguarde um momento</p>
          </div>
        )}

        {/* SUCCESS STATE */}
        {pageState === 'success' && (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-4 shadow-lg shadow-green-500/30">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Parabéns! 🎉</h2>
            <p className="text-green-400 text-lg font-semibold mb-2">300 créditos adicionados!</p>
            <p className="text-purple-300 text-sm mb-6">Redirecionando para as Ferramentas de IA...</p>
            <Loader2 className="w-6 h-6 text-fuchsia-400 animate-spin mx-auto" />
          </div>
        )}

        {/* EMAIL SENT STATE */}
        {pageState === 'email_sent' && (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg shadow-blue-500/30">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Verifique seu Email</h2>
            <p className="text-purple-300 text-sm mb-2">
              Enviamos um link de confirmação para:
            </p>
            <p className="text-fuchsia-400 font-semibold mb-4">{email}</p>
            <p className="text-purple-400 text-xs mb-6">
              Após confirmar seu email, faça login nesta página para resgatar seus 300 créditos.
            </p>
            <Button
              onClick={() => { setPageState('email'); setPassword(''); setName(''); }}
              variant="outline"
              className="w-full h-10 border-purple-500/50 bg-purple-900/50 text-white hover:bg-purple-800/70"
            >
              Voltar para o início
            </Button>
          </div>
        )}
      </Card>

      {/* Footer */}
      <p className="relative z-10 text-purple-400/50 text-xs mt-8">
        © {new Date().getFullYear()} ArcanoApp
      </p>
    </div>
  );
};

export default TesteGratis;
