import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";
import AdminAnalyticsDashboard from "@/components/AdminAnalyticsDashboard";
import AdminGoalsCard from "@/components/AdminGoalsCard";

const ArtesEventosDashboard = () => {
  return (
    <AdminLayoutPlatform platform="artes-eventos">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard - Artes Eventos</h1>
        <p className="text-muted-foreground mb-4">Métricas e análise de comportamento dos usuários</p>
        
        <AdminGoalsCard />
        
        <div className="mt-6">
          <AdminAnalyticsDashboard />
        </div>
      </div>
    </AdminLayoutPlatform>
  );
};

export default ArtesEventosDashboard;
