import { SidebarNav } from '@/components/sidebar-nav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <SidebarNav />
      <main className="h-screen flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-[1360px] px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
