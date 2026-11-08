// src/app/(app)/layout.tsx
import MobileBottomBar from "@/components/layouts/sidebar/MobileBottomBar";

export default function AppLayout({
  children,
  header,
  sidebar,
  footer,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  sidebar: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {sidebar}
      <div className="flex-1 min-w-0">
        {header}
        <main className="flex-1 p-3 pb-24 lg:p-6 max-w-7xl mx-auto">
          {children}
        </main>
        {footer}
      </div>
      <MobileBottomBar />
    </div>
  );
}
