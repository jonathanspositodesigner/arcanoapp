import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Play, RefreshCw, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

const TesteIframe = () => {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showIframe, setShowIframe] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const runningHubUrl = "https://www.runninghub.ai/post/1976744965550358529";

  const addLog = (type: LogEntry['type'], message: string) => {
    const now = new Date();
    const timestamp = `${now.toLocaleTimeString('pt-BR')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    setLogs(prev => [...prev, { timestamp, type, message }]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Listen for global errors (CSP/X-Frame-Options violations)
  useEffect(() => {
    const handleSecurityError = (event: SecurityPolicyViolationEvent) => {
      addLog('error', `❌ CSP Violation: ${event.violatedDirective} - ${event.blockedURI}`);
    };

    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('frame') || event.message.includes('blocked')) {
        addLog('error', `❌ Erro Global: ${event.message}`);
      }
    };

    document.addEventListener('securitypolicyviolation', handleSecurityError);
    window.addEventListener('error', handleError);

    return () => {
      document.removeEventListener('securitypolicyviolation', handleSecurityError);
      window.removeEventListener('error', handleError);
    };
  }, []);

  const handleLoadIframe = () => {
    clearLogs();
    setIsLoading(true);
    setShowIframe(true);
    
    addLog('info', `🔄 Iniciando carregamento do iframe...`);
    addLog('info', `📍 URL: ${runningHubUrl}`);
    
    // Set timeout for 15 seconds
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        addLog('warning', `⚠️ Timeout de 15 segundos atingido - O carregamento pode estar bloqueado silenciosamente`);
        setIsLoading(false);
      }
    }, 15000);

    // Store timeout ID to clear it on successful load
    (window as any).__iframeTimeout = timeoutId;
  };

  const handleIframeLoad = () => {
    const timeoutId = (window as any).__iframeTimeout;
    if (timeoutId) clearTimeout(timeoutId);
    
    setIsLoading(false);
    addLog('info', `📦 Evento onLoad disparado no iframe`);
    
    // Try to access iframe content to check if it's truly loaded
    try {
      const iframe = iframeRef.current;
      if (iframe) {
        // This will throw an error if cross-origin access is blocked
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          addLog('success', `✅ Iframe carregado com sucesso! Conteúdo acessível.`);
        }
      }
    } catch (error: any) {
      // Cross-origin access is blocked, but the page might still be visible
      addLog('warning', `⚠️ Cross-origin: Não foi possível acessar o conteúdo do iframe (normal para sites externos)`);
      addLog('info', `👁️ Verifique visualmente se a ferramenta está aparecendo abaixo`);
    }
  };

  const handleIframeError = () => {
    const timeoutId = (window as any).__iframeTimeout;
    if (timeoutId) clearTimeout(timeoutId);
    
    setIsLoading(false);
    addLog('error', `❌ Evento onError disparado - O iframe falhou ao carregar`);
    addLog('error', `❌ Provável causa: X-Frame-Options ou Content-Security-Policy bloqueando`);
  };

  const openInNewTab = () => {
    window.open(runningHubUrl, '_blank');
    addLog('info', `🔗 Link aberto em nova aba para comparação`);
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <span className="w-4 h-4 text-blue-400">ℹ️</span>;
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-blue-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-950/20 to-black p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="text-purple-300 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          🧪 Teste de Iframe - Running Hub
        </h1>
        <p className="text-gray-400 text-sm md:text-base">
          Este teste verifica se a Running Hub pode ser carregada dentro de um iframe para esconder a URL.
        </p>
      </div>

      {/* Controls */}
      <div className="max-w-6xl mx-auto mb-6 flex flex-wrap gap-3">
        <Button 
          onClick={handleLoadIframe}
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          {showIframe ? 'Recarregar Iframe' : 'Carregar no Iframe'}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={openInNewTab}
          className="border-purple-500 text-purple-300 hover:bg-purple-900/30"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Abrir em Nova Aba (comparação)
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={clearLogs}
          className="text-gray-400 hover:text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Limpar Logs
        </Button>
      </div>

      {/* URL Display */}
      <div className="max-w-6xl mx-auto mb-6 bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
        <p className="text-gray-400 text-sm mb-1">URL sendo testada:</p>
        <code className="text-purple-300 text-sm break-all">{runningHubUrl}</code>
      </div>

      {/* Debug Logs */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-white font-semibold flex items-center gap-2">
              📋 Logs de Debug
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
            </h2>
            <span className="text-gray-400 text-sm">{logs.length} entradas</span>
          </div>
          
          <div className="p-4 max-h-60 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500 italic">
                Clique em "Carregar no Iframe" para iniciar o teste...
              </p>
            ) : (
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div key={index} className={`flex items-start gap-2 ${getLogColor(log.type)}`}>
                    <span className="text-gray-500 flex-shrink-0">[{log.timestamp}]</span>
                    {getLogIcon(log.type)}
                    <span className="break-all">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interpretation Guide */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-blue-300 font-semibold mb-3">📖 Como interpretar os resultados:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-300">
                <strong className="text-green-400">Sucesso:</strong> A ferramenta aparece no iframe abaixo = Pode implementar em todo o app!
              </span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-300">
                <strong className="text-red-400">Erro (tela branca):</strong> X-Frame-Options ou CSP bloqueando = Precisa usar Capacitor/WebView
              </span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-300">
                <strong className="text-yellow-400">Timeout:</strong> Carregamento demorou muito = Provavelmente bloqueado silenciosamente
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Iframe Container */}
      {showIframe && (
        <div className="max-w-6xl mx-auto">
          <div className="bg-gray-900 border border-purple-500/50 rounded-lg overflow-hidden">
            <div className="bg-purple-900/30 px-4 py-2 border-b border-purple-500/30">
              <h2 className="text-purple-300 font-semibold">
                🖼️ Área do Iframe (Running Hub)
              </h2>
            </div>
            
            <div className="relative" style={{ minHeight: '600px' }}>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-2" />
                    <p className="text-purple-300">Carregando...</p>
                  </div>
                </div>
              )}
              
              <iframe
                ref={iframeRef}
                src={runningHubUrl}
                className="w-full h-[600px] bg-white"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TesteIframe;
