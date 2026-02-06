import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";
import AdminSimpleMetrics from "@/components/AdminSimpleMetrics";
import PromptsFerramentasContent from "@/components/admin/PromptsFerramentasContent";

const PromptsDashboard = () => {
  return (
    <AdminLayoutPlatform platform="prompts">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">PromptClub - Admin</h1>
          <p className="text-muted-foreground">Painel administrativo da plataforma</p>
        </div>
        
        {/* Ferramentas primeiro */}
        <PromptsFerramentasContent />
        
        {/* Dashboard embaixo */}
        <div className="pt-6 border-t border-border">
          <AdminSimpleMetrics />
        </div>
      </div>
    </AdminLayoutPlatform>
  );
};

export default PromptsDashboard;
