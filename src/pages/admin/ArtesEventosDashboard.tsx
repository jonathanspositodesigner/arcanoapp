import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";
import AdminAnalyticsDashboard from "@/components/AdminAnalyticsDashboard";

const ArtesEventosDashboard = () => {
  return (
    <AdminLayoutPlatform platform="artes-eventos">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard - Artes Eventos</h1>
        <p className="text-muted-foreground mb-6">Métricas e análise de comportamento dos usuários</p>
        
        <AdminAnalyticsDashboard platform="artes-eventos" />
      </div>
    </AdminLayoutPlatform>
  );
};

export default ArtesEventosDashboard;