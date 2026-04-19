import AdminSidebar from '@/components/admin/AdminSidebar';
import '../admin.css';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-body">
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <AdminSidebar />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
