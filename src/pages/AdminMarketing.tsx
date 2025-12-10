import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Mail, Share2, Target, Calendar } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

const AdminMarketing = () => {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Marketing</h1>
        <p className="text-muted-foreground mb-8">Ferramentas de divulgação e campanhas</p>

        {/* Active Tools */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
          <Card 
            className="p-3 sm:p-8 cursor-pointer hover:shadow-hover transition-all hover:scale-105" 
            onClick={() => navigate('/admin-email-marketing')}
          >
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-gradient-to-r from-primary to-purple-600 rounded-full">
                <Mail className="h-6 w-6 sm:h-12 sm:w-12 text-white" />
              </div>
              <h2 className="text-xs sm:text-2xl font-bold text-foreground">E-mail Marketing</h2>
              <p className="text-muted-foreground hidden sm:block">Crie e envie campanhas de email</p>
            </div>
          </Card>
        </div>

        {/* Upcoming Features */}
        <h3 className="text-lg font-semibold text-foreground mb-4">Em breve</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <Card className="p-3 sm:p-8 opacity-60">
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-green-500/20 rounded-full">
                <Share2 className="h-6 w-6 sm:h-10 sm:w-10 text-green-500" />
              </div>
              <h2 className="text-xs sm:text-lg font-bold text-foreground">Links de Afiliados</h2>
              <p className="text-sm text-muted-foreground hidden sm:block">Gerencie programa de afiliados</p>
            </div>
          </Card>

          <Card className="p-3 sm:p-8 opacity-60">
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-orange-500/20 rounded-full">
                <Target className="h-6 w-6 sm:h-10 sm:w-10 text-orange-500" />
              </div>
              <h2 className="text-xs sm:text-lg font-bold text-foreground">Campanhas</h2>
              <p className="text-sm text-muted-foreground hidden sm:block">Crie e acompanhe campanhas promocionais</p>
            </div>
          </Card>

          <Card className="p-3 sm:p-8 opacity-60">
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-4 bg-purple-500/20 rounded-full">
                <Calendar className="h-6 w-6 sm:h-10 sm:w-10 text-purple-500" />
              </div>
              <h2 className="text-xs sm:text-lg font-bold text-foreground">Agendamento</h2>
              <p className="text-sm text-muted-foreground hidden sm:block">Agende publicações e promoções</p>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMarketing;
