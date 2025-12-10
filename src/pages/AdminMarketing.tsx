import { Card } from "@/components/ui/card";
import { Megaphone, Mail, Share2, Target, Calendar } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

const AdminMarketing = () => {
  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Marketing</h1>
        <p className="text-muted-foreground mb-8">Ferramentas de divulgação e campanhas</p>

        {/* Coming Soon Banner */}
        <Card className="p-8 bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary/20 rounded-full">
              <Megaphone className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Em Breve</h2>
              <p className="text-muted-foreground mt-1">
                Estamos preparando ferramentas poderosas para suas campanhas de marketing
              </p>
            </div>
          </div>
        </Card>

        {/* Upcoming Features */}
        <h3 className="text-lg font-semibold text-foreground mb-4">Recursos em desenvolvimento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 opacity-60">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-blue-500/20 rounded-full">
                <Mail className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground">E-mail Marketing</h3>
              <p className="text-sm text-muted-foreground">Envie campanhas para sua base de usuários</p>
            </div>
          </Card>

          <Card className="p-6 opacity-60">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-green-500/20 rounded-full">
                <Share2 className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Links de Afiliados</h3>
              <p className="text-sm text-muted-foreground">Gerencie programa de afiliados</p>
            </div>
          </Card>

          <Card className="p-6 opacity-60">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-orange-500/20 rounded-full">
                <Target className="h-10 w-10 text-orange-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Campanhas</h3>
              <p className="text-sm text-muted-foreground">Crie e acompanhe campanhas promocionais</p>
            </div>
          </Card>

          <Card className="p-6 opacity-60">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-purple-500/20 rounded-full">
                <Calendar className="h-10 w-10 text-purple-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Agendamento</h3>
              <p className="text-sm text-muted-foreground">Agende publicações e promoções</p>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMarketing;
