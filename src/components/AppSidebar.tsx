import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ScrollText,
  PlusCircle,
  Swords,
  BarChart3,
  Users,
  Heart,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/use-user-profile";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import logoSrc from "@/assets/Seasons-Past-Header.svg";

const navItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Game Log", path: "/games", icon: ScrollText },
  { title: "Add Game", path: "/games/new", icon: PlusCircle },
  { title: "My Commanders", path: "/commanders", icon: Swords },
  { title: "Statistics", path: "/statistics", icon: BarChart3 },
  { title: "Pod Buddies", path: "/pod-buddies", icon: Users },
  { title: "Life Counter", path: "/life-counter", icon: Heart },
  { title: "Settings", path: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { profile } = useUserProfile();

  const displayName =
    profile?.username || user?.displayName || user?.email?.split("@")[0] || "User";
  const initial = displayName.charAt(0).toUpperCase();

  async function handleSignOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-5">
        <img
          src={logoSrc}
          alt="Seasons Past"
          className="h-14 w-auto brightness-0 dark:brightness-0 dark:invert"
        />
        <p className="text-muted-foreground text-xs">EDH Game Tracker</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    size="lg"
                    isActive={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="!h-5 !w-5" />
                    <span className="text-[15px]">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        {/* Theme selector */}
        <div className="space-y-1 px-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Theme
          </span>
          <ThemeSwitcher />
        </div>

        {/* User info + Sign Out */}
        <div className="flex items-center gap-2 px-2 pt-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
            {initial}
          </div>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {displayName}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 shrink-0 gap-1 px-2 text-xs"
            onClick={handleSignOut}
          >
            <LogOut className="h-3 w-3" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
