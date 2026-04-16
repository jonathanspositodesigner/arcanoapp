import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Sparkles, Shirt, PersonStanding, FileImage, Film, Users } from "lucide-react";
import AdminLayoutPlatform from "@/components/AdminLayoutPlatform";

const tools = [
  { slug: "arcano_cloner", name: "Arcano Cloner", icon: Users, color: "from-purple-500 to-indigo-600", desc: "Bib. de fotos por categoria" },
  { slug: "veste_ai", name: "Veste AI", icon: Shirt, color: "from-pink-500 to-rose-600", desc: "Bib. de roupas por categoria" },
  { slug: "pose_maker", name: "Pose Maker", icon: PersonStanding, color: "from-cyan-500 to-blue-600", desc: "Bib. de poses por categoria" },
  { slug: "flyer_maker", name: "Flyer Maker", icon: FileImage, color: "from-amber-500 to-orange-600", desc: "Artes da biblioteca" },
  { slug: "seedance2", name: "Seedance 2", icon: Film, color: "from-emerald-500 to-teal-600", desc: "Vídeos de referência" },
];

const IALibrariesHub = () => {
  const navigate = useNavigate();

  return (
    <AdminLayoutPlatform platform="prompts">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg">
            <Sparkles className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciar Ferramentas de IA</h1>
            <p className="text-muted-foreground">Selecione uma ferramenta para gerenciar sua biblioteca interna</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mt-6">
          {tools.map((tool) => (
            <Card
              key={tool.slug}
              className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105"
              onClick={() => navigate(`/admin-ia-libraries/${tool.slug}`)}
            >
              <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                <div className={`p-2 sm:p-4 bg-gradient-to-r ${tool.color} rounded-full`}>
                  <tool.icon className="h-6 w-6 sm:h-12 sm:w-12 text-foreground" />
                </div>
                <h2 className="text-xs sm:text-2xl font-bold text-foreground">{tool.name}</h2>
                <p className="text-muted-foreground hidden sm:block text-sm">{tool.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayoutPlatform>
  );
};

export default IALibrariesHub;
