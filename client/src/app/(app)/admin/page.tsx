// src/app/(app)/admin/dashboard/page.tsx
import AdminDashboard from "@/components/pages/admin/AdminDashboard";

export const metadata = {
  title: "System Maintenance",
  description: "Maintenance mode and broadcast controls for Rotten Lab.",
};

export default function Page() {
  return <AdminDashboard />;
}
