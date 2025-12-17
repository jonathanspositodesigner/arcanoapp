import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";
import AdminAnalyticsDashboard from "@/components/AdminAnalyticsDashboard";

const PromptsDashboard = () => {
  return (
    <AdminLayoutPlatform platform="prompts">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard - PromptClub</h1>
        <p className="text-muted-foreground mb-6">Métricas e análise de comportamento dos usuários</p>
        
        <AdminAnalyticsDashboard />
      </div>
    </AdminLayoutPlatform>
  );
};

export default PromptsDashboard;