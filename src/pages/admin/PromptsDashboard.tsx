import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";
import AdminSimpleMetrics from "@/components/AdminSimpleMetrics";

const PromptsDashboard = () => {
  return (
    <AdminLayoutPlatform platform="prompts">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard - PromptClub</h1>
        <p className="text-muted-foreground mb-6">Métricas essenciais da plataforma</p>

        <AdminSimpleMetrics />
      </div>
    </AdminLayoutPlatform>
  );
};

export default PromptsDashboard;

