import { Outlet, useLocation } from "react-router-dom";
import { AchievementUnlockNotifications } from "@/components/progression/AchievementUnlockNotifications";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";
import { useIsSmallDevice } from "@/hooks/use-mobile";

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <AppLayoutInner />
      <AchievementUnlockNotifications />
    </SidebarProvider>
  );
}

function AppLayoutInner() {
  const location = useLocation();
  const isSmallDevice = useIsSmallDevice();
  const isLifeCounter = location.pathname === "/life-counter";
  const isFullscreen = isLifeCounter && isSmallDevice;

  if (isFullscreen) {
    return (
      <main className="h-svh w-full overflow-hidden">
        <Outlet />
      </main>
    );
  }

  return (
    <SidebarInset className="min-w-0">
      <header className="flex h-14 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <span className="text-sm font-medium text-muted-foreground">Seasons Past</span>
      </header>
      <main className="flex-1 min-w-0 px-3 py-4 sm:p-6">
        <Outlet />
      </main>
    </SidebarInset>
  );
}
