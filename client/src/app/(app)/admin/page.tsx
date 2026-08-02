// src/app/(app)/admin/dashboard/page.tsx
import AdminDashboard from "@/components/pages/admin/AdminDashboard";

export const metadata = {
  title: "Admin Dashboard | Fortress",
  description: "Administrative override and user management.",
};

export default function Page() {
  return <AdminDashboard />;
}
