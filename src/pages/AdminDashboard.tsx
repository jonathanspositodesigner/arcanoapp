import AdminLayout from "@/components/AdminLayout";
import AdminSimpleMetrics from "@/components/AdminSimpleMetrics";
import AdminGoalsCard from "@/components/AdminGoalsCard";

const AdminDashboard = () => {
  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground mb-4">Métricas essenciais</p>
        
        <AdminGoalsCard />
        
        <div className="mt-6">
          <AdminSimpleMetrics />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
