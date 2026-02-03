import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";
import AdminAIToolsUsageTab from "@/components/admin/AdminAIToolsUsageTab";

const PromptsCustosIA = () => {
  return (
    <AdminLayoutPlatform platform="prompts">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Custos IA - PromptClub</h1>
        <p className="text-muted-foreground mb-6">Monitoramento de uso e custos das ferramentas de IA</p>
        
        <AdminAIToolsUsageTab />
      </div>
    </AdminLayoutPlatform>
  );
};

export default PromptsCustosIA;
