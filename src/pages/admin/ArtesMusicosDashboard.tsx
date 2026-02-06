import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";
import AdminSimpleMetrics from "@/components/AdminSimpleMetrics";

const ArtesMusicosDashboard = () => {
  return (
    <AdminLayoutPlatform platform="artes-musicos">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard - Artes Músicos</h1>
        <p className="text-muted-foreground mb-6">Métricas essenciais da plataforma</p>
        
        <AdminSimpleMetrics />
      </div>
    </AdminLayoutPlatform>
  );
};

export default ArtesMusicosDashboard;
