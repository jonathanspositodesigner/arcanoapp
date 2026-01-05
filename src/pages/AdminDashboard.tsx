import AdminLayout from "@/components/AdminLayout";
import AdminAnalyticsDashboard from "@/components/AdminAnalyticsDashboard";
import AdminGoalsCard from "@/components/AdminGoalsCard";
import CloudUsageDashboard from "@/components/CloudUsageDashboard";

const AdminDashboard = () => {
  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground mb-4">Métricas e análise de comportamento dos usuários</p>
        
        <AdminGoalsCard />
        
        <div className="mt-6">
          <CloudUsageDashboard />
        </div>
        
        <div className="mt-6">
          <AdminAnalyticsDashboard />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
