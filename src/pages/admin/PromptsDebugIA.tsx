import React, { useState, useCallback } from 'react';
import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Bug,
  Zap,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { useAIDebug } from "@/contexts/AIDebugContext";
import AIJobsSimulator from "@/components/admin/AIJobsSimulator";

const PromptsDebugIA = () => {
  const { isDebugEnabled, toggleDebug } = useAIDebug();

  return (
    <AdminLayoutPlatform platform="prompts">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Debug & Simulação IA</h1>
          <p className="text-muted-foreground">
            Teste o sistema de fila/jobs e ative modo debug nas ferramentas
          </p>
        </div>

        {/* Debug Mode Toggle */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${isDebugEnabled ? 'bg-green-500/20' : 'bg-muted'}`}>
                {isDebugEnabled ? (
                  <Eye className="h-6 w-6 text-green-500" />
                ) : (
                  <EyeOff className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Modo Debug</h3>
                <p className="text-sm text-muted-foreground">
                  {isDebugEnabled 
                    ? 'Ativo - Informações de etapa/erro visíveis nas ferramentas' 
                    : 'Desativado - Interface normal para usuários'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${isDebugEnabled ? 'text-green-500' : 'text-muted-foreground'}`}>
                {isDebugEnabled ? 'ON' : 'OFF'}
              </span>
              <Switch 
                checked={isDebugEnabled} 
                onCheckedChange={toggleDebug}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          </div>

          {isDebugEnabled && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-400">
                ✅ <strong>Debug ativo!</strong> Agora nas ferramentas de IA você verá:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-green-400/80">
                <li>• Etapa atual do job (upload, créditos, fila, processando...)</li>
                <li>• Posição na fila em tempo real</li>
                <li>• Mensagem de erro bruta quando falhar</li>
                <li>• Botão "Ver Detalhes" para abrir o modal de debug completo</li>
              </ul>
            </div>
          )}
        </Card>

        {/* Simulation Section */}
        <Tabs defaultValue="simulator" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simulator" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Simulador de Jobs
            </TabsTrigger>
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Invariantes & Regras
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simulator" className="mt-4">
            <AIJobsSimulator />
          </TabsContent>

          <TabsContent value="info" className="mt-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Invariantes do Sistema</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">MAX 3</Badge>
                    <span className="font-medium">Concorrência Global</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Nunca mais que 3 jobs simultâneos em running/starting
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">FIFO</Badge>
                    <span className="font-medium">Ordem da Fila</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Próximo job promovido deve ser o mais antigo
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">1 POR USER</Badge>
                    <span className="font-medium">Um Job por Usuário</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mesmo usuário não pode ter 2 jobs ativos
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">TERMINAL</Badge>
                    <span className="font-medium">Erro é Final</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Jobs em failed/completed/cancelled não voltam
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">CRÉDITOS</Badge>
                    <span className="font-medium">Consistência de Créditos</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Falha/cancelamento sempre estorna, sem duplicar
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30">IDEMPOTENTE</Badge>
                    <span className="font-medium">Webhook Idempotente</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Webhook duplicado não causa duplo reembolso
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <h4 className="font-medium text-primary mb-2">Ferramentas Cobertas</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge>Upscaler Arcano</Badge>
                  <Badge>Pose Changer</Badge>
                  <Badge>Veste AI</Badge>
                  <Badge>Video Upscaler</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Todas usam o mesmo JobManager centralizado e QueueManager
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayoutPlatform>
  );
};

export default PromptsDebugIA;
