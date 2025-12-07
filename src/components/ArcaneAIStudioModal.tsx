import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Lock, LogIn, Zap, ImagePlus, UserRoundCog, Shirt } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ArcaneAIStudioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPremium: boolean;
  planType: string | null;
  isLoggedIn: boolean;
}

interface ToolCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPlan: "basico" | "pro" | "unlimited";
  link?: string;
}

const tools: ToolCard[] = [
  {
    id: "forja",
    title: "Forja de Selos 3D",
    description: "Gere um selo novo, substitua o título, deixe em 4K e anime seus selos 3D em um só lugar.",
    icon: Zap,
    requiredPlan: "unlimited",
    link: "https://youtu.be/XmPDm7ikUbU"
  },
  {
    id: "upscaler",
    title: "Upscaler Arcano",
    description: "Melhore suas imagens deixando em 4K e remova o fundo.",
    icon: ImagePlus,
    requiredPlan: "unlimited",
    link: ""
  },
  {
    id: "pose",
    title: "Mudar Pose",
    description: "Mude a pose de qualquer foto mantendo a fidelidade do rosto original.",
    icon: UserRoundCog,
    requiredPlan: "pro",
    link: ""
  },
  {
    id: "roupa",
    title: "Mudar Roupa",
    description: "Mude a roupa de qualquer foto mantendo a fidelidade do rosto original.",
    icon: Shirt,
    requiredPlan: "pro",
    link: ""
  }
];

const ArcaneAIStudioModal = ({ open, onOpenChange, isPremium, planType, isLoggedIn }: ArcaneAIStudioModalProps) => {
  const navigate = useNavigate();

  const canAccessTool = (tool: ToolCard): boolean => {
    if (!isPremium) return false;
    
    if (planType === "arcano_unlimited") {
      return true;
    }
    
    if (planType === "arcano_pro") {
      return tool.requiredPlan === "pro" || tool.requiredPlan === "basico";
    }
    
    if (planType === "arcano_basico") {
      return tool.requiredPlan === "basico";
    }
    
    return false;
  };

  const handleToolClick = (tool: ToolCard) => {
    if (canAccessTool(tool) && tool.link) {
      window.open(tool.link, "_blank");
    }
  };

  const getPlanLabel = (requiredPlan: string) => {
    switch (requiredPlan) {
      case "pro":
        return "Pro+";
      case "unlimited":
        return "Unlimited";
      default:
        return "Básico+";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Arcane AI Studio
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Acesse nossas ferramentas de IA exclusivas para potenciar seus resultados e facilitar seu dia a dia.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {tools.map((tool) => {
            const hasAccess = canAccessTool(tool);
            const IconComponent = tool.icon;
            
            return (
              <Card 
                key={tool.id}
                className={`p-4 border-border transition-all duration-300 ${
                  hasAccess && tool.link 
                    ? "hover:shadow-lg hover:scale-[1.02] cursor-pointer" 
                    : "opacity-90"
                }`}
                onClick={() => hasAccess && tool.link && handleToolClick(tool)}
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    {!hasAccess && (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-xs">
                        <Star className="h-3 w-3 mr-1" fill="currentColor" />
                        {getPlanLabel(tool.requiredPlan)}
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-foreground mb-2">{tool.title}</h3>
                  <p className="text-sm text-muted-foreground flex-grow">{tool.description}</p>
                  
                  {!isLoggedIn && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/planos");
                          onOpenChange(false);
                        }}
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white text-xs"
                      >
                        <Star className="h-3 w-3 mr-1" fill="currentColor" />
                        Torne-se Premium
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/login");
                          onOpenChange(false);
                        }}
                        size="sm"
                        variant="outline"
                        className="flex-1 border-border text-xs"
                      >
                        <LogIn className="h-3 w-3 mr-1" />
                        Fazer Login
                      </Button>
                    </div>
                  )}
                  
                  {isLoggedIn && !hasAccess && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/upgrade-plano");
                        onOpenChange(false);
                      }}
                      size="sm"
                      className="w-full mt-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white text-xs"
                    >
                      <Lock className="h-3 w-3 mr-1" />
                      Fazer Upgrade
                    </Button>
                  )}
                  
                  {hasAccess && !tool.link && (
                    <p className="text-xs text-muted-foreground mt-4 italic">Link em breve...</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ArcaneAIStudioModal;
