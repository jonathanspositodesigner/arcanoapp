import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Bell, KeyRound, RefreshCw, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FirstAccessUser {
  id: string;
  email: string;
  name: string | null;
}

const AdminSimpleMetrics = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Installation stats
  const [installations, setInstallations] = useState({ total: 0, mobile: 0, desktop: 0 });
  
  // Push subscriptions
  const [pushSubscriptions, setPushSubscriptions] = useState(0);
  
  // First access stats
  const [firstAccessStats, setFirstAccessStats] = useState({
    changed: 0,
    pending: 0,
    pendingUsers: [] as FirstAccessUser[],
    changedUsers: [] as FirstAccessUser[]
  });
  
  // Modal state
  const [showFirstAccessModal, setShowFirstAccessModal] = useState(false);
  const [firstAccessModalView, setFirstAccessModalView] = useState<'changed' | 'pending'>('pending');

  const fetchMetrics = async () => {
    setIsLoading(true);

    // Fetch ALL installations with pagination
    const fetchAllInstallations = async () => {
      let allRecords: { device_type: string }[] = [];
      let from = 0;
      const batchSize = 1000;
      
      while (true) {
        const { data } = await supabase
          .from("app_installations")
          .select("device_type")
          .range(from, from + batchSize - 1);
        
        if (!data || data.length === 0) break;
        
        allRecords = [...allRecords, ...data];
        from += batchSize;
        if (data.length < batchSize) break;
      }
      
      return allRecords;
    };

    const installsData = await fetchAllInstallations();
    if (installsData) {
      const mobile = installsData.filter((i) => i.device_type === "mobile").length;
      const desktop = installsData.filter((i) => i.device_type === "desktop").length;
      setInstallations({ total: installsData.length, mobile, desktop });
    }

    // Fetch push subscriptions count
    const { count: pushCount } = await supabase
      .from("push_subscriptions")
      .select("*", { count: "exact", head: true });
    
    setPushSubscriptions(pushCount || 0);

    // Fetch first access stats with pagination
    const fetchAllProfiles = async () => {
      const allRecords: { id: string; email: string | null; name: string | null; password_changed: boolean | null }[] = [];
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data } = await supabase
          .from("profiles")
          .select("id, email, name, password_changed")
          .not("email", "is", null)
          .range(offset, offset + batchSize - 1);
        
        if (data && data.length > 0) {
          allRecords.push(...data);
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      
      return allRecords;
    };

    const allProfiles = await fetchAllProfiles();

    if (allProfiles && allProfiles.length > 0) {
      const changedUsers = allProfiles
        .filter(p => p.password_changed === true)
        .map(p => ({ id: p.id, email: p.email || '', name: p.name }));
      const pendingUsers = allProfiles
        .filter(p => p.password_changed === false || p.password_changed === null)
        .map(p => ({ id: p.id, email: p.email || '', name: p.name }));
      
      setFirstAccessStats({
        changed: changedUsers.length,
        pending: pendingUsers.length,
        pendingUsers,
        changedUsers
      });
    }

    setIsLoading(false);
    setLastUpdate(new Date());
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleRefresh = () => {
    fetchMetrics();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Métricas Essenciais</h2>
          <p className="text-xs text-muted-foreground">
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Installations Card */}
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-full">
                <Smartphone className="h-8 w-8 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Instalações do App</p>
                <p className="text-3xl font-bold text-foreground">{installations.total}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  📱 {installations.mobile} mobile · 💻 {installations.desktop} desktop
                </p>
              </div>
            </div>
          </Card>

          {/* Push Subscriptions Card */}
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-full">
                <Bell className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Notificações Push</p>
                <p className="text-3xl font-bold text-foreground">{pushSubscriptions}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Dispositivos inscritos
                </p>
              </div>
            </div>
          </Card>

          {/* First Access Card */}
          <Card 
            className="p-6 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setShowFirstAccessModal(true)}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/20 rounded-full">
                <KeyRound className="h-8 w-8 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Primeiro Acesso</p>
                <div className="flex gap-4 mt-1">
                  <div>
                    <p className="text-xl font-bold text-green-600">{firstAccessStats.changed}</p>
                    <p className="text-xs text-muted-foreground">Trocaram</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-amber-600">{firstAccessStats.pending}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* First Access Modal */}
      <Dialog open={showFirstAccessModal} onOpenChange={setShowFirstAccessModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Usuários - Primeiro Acesso
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex gap-2 mb-4">
            <Button
              variant={firstAccessModalView === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFirstAccessModalView('pending')}
            >
              <Users className="h-4 w-4 mr-2" />
              Pendentes ({firstAccessStats.pending})
            </Button>
            <Button
              variant={firstAccessModalView === 'changed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFirstAccessModalView('changed')}
            >
              <Users className="h-4 w-4 mr-2" />
              Trocaram ({firstAccessStats.changed})
            </Button>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {(firstAccessModalView === 'pending' 
                ? firstAccessStats.pendingUsers 
                : firstAccessStats.changedUsers
              ).map((user) => (
                <div 
                  key={user.id}
                  className="p-3 bg-muted rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">{user.name || 'Sem nome'}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    firstAccessModalView === 'pending' 
                      ? 'bg-amber-500/20 text-amber-600' 
                      : 'bg-green-500/20 text-green-600'
                  }`}>
                    {firstAccessModalView === 'pending' ? 'Pendente' : 'Concluído'}
                  </span>
                </div>
              ))}
              
              {(firstAccessModalView === 'pending' 
                ? firstAccessStats.pendingUsers 
                : firstAccessStats.changedUsers
              ).length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum usuário encontrado
                </p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSimpleMetrics;
