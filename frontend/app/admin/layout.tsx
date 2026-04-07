import { AdminAccessGate } from "@/components/AdminAccessGate";
import { AdminSidebar } from "@/components/AdminSidebar";
import { TopBar } from "@/components/TopBar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      <AdminSidebar />
      <AdminAccessGate>{children}</AdminAccessGate>
    </div>
  );
}
