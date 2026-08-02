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
    <div className=" min-h-screen flex ">
      {sidebar}
      <div>
        {header}
        <main className="flex-1 p-3 lg:p-6 max-w-7xl mx-auto">{children}</main>
        {footer}
      </div>
      <MobileBottomBar />
    </div>
  );
}
