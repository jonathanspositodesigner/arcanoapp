import React, { useEffect } from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';

/**
 * UpscalerRunpod - DESATIVADO
 * 
 * Esta página foi desativada para reduzir custos de Cloud.
 * O polling a cada 5 segundos estava causando milhares de invocações desnecessárias.
 * 
 * Use o UpscalerArcanoTool (/ferramentas-ia/upscaler) que usa Realtime.
 */
const UpscalerRunpod: React.FC = () => {
  const navigate = useNavigate();
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia' });

  // Redirect to the working upscaler after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/ferramentas-ia/upscaler');
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0221] via-[#1A0A2E] to-[#16082A] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0D0221]/80 backdrop-blur-lg border-b border-purple-500/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="text-purple-300 hover:text-white hover:bg-purple-500/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Upscaler Runpod
          </h1>
          <span className="ml-auto text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">
            ⚠️ DESATIVADO
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-amber-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">
            Ferramenta Temporariamente Desativada
          </h2>
          
          <p className="text-purple-300/70 mb-6 max-w-md mx-auto">
            O Upscaler Runpod foi desativado para otimização de recursos. 
            Use o <strong>Upscaler Arcano</strong> que oferece a mesma qualidade 
            com melhor performance.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/ferramentas-ia/upscaler')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Ir para Upscaler Arcano
            </Button>
            <Button
              onClick={goBack}
              variant="outline"
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:text-white"
            >
              Voltar
            </Button>
          </div>

          <p className="text-xs text-purple-300/50 mt-8">
            Redirecionando automaticamente em 5 segundos...
          </p>
        </Card>
      </div>
    </div>
  );
};

export default UpscalerRunpod;
