import AdminSidebar from '@/components/admin/AdminSidebar';
import '../admin.css';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-body">
      {/* 
        On desktop (≥1024px):  AdminSidebar renders as a sticky left column.
        On mobile  (<1024px):  AdminSidebar renders only a fixed top bar + overlay drawer.
                               The main content needs padding-top to clear the top bar.
      */}
      <div className="dashboard-layout">
        <AdminSidebar />
        <div className="dashboard-content">
          {children}
        </div>
      </div>
    </div>
  );
}
