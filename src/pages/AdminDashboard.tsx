import AdminLayout from "@/components/AdminLayout";
import AdminAnalyticsDashboard from "@/components/AdminAnalyticsDashboard";

const AdminDashboard = () => {
  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground mb-4">Métricas e análise de comportamento dos usuários</p>
        
        <AdminAnalyticsDashboard />
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
