import { useSearchParams } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import EmailMarketingContent from "@/components/EmailMarketingContent";

const AdminEmailMarketing = () => {
  const [searchParams] = useSearchParams();
  const platform = searchParams.get('platform');

  return (
    <AdminLayout>
      <EmailMarketingContent platform={platform} />
    </AdminLayout>
  );
};

export default AdminEmailMarketing;
