import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";
import AdminSimpleMetrics from "@/components/AdminSimpleMetrics";
import ArtesMusicosFerramentasContent from "@/components/admin/ArtesMusicosFerramentasContent";

const ArtesMusicosDashboard = () => {
  return (
    <AdminLayoutPlatform platform="artes-musicos">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Artes Músicos - Admin</h1>
          <p className="text-muted-foreground">Painel administrativo da plataforma</p>
        </div>
        
        {/* Ferramentas primeiro */}
        <ArtesMusicosFerramentasContent />
        
        {/* Dashboard embaixo */}
        <div className="pt-6 border-t border-border">
          <AdminSimpleMetrics />
        </div>
      </div>
    </AdminLayoutPlatform>
  );
};

export default ArtesMusicosDashboard;
