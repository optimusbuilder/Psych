import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  Users,
  ClipboardList,
  BarChart3,
  Settings,
  Shield,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/provider", icon: LayoutDashboard },
  { title: "Intake Cases", url: "/provider/cases", icon: FileText },
  { title: "Urgent Alerts", url: "/provider/urgent", icon: AlertTriangle },
  { title: "Patients", url: "/provider/patients", icon: Users },
  { title: "Screenings", url: "/provider/screenings", icon: ClipboardList },
  { title: "Analytics", url: "/provider/analytics", icon: BarChart3 },
  { title: "Settings", url: "/provider/settings", icon: Settings },
];

export function ProviderSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary shrink-0" />
          {!collapsed && <span className="font-semibold text-foreground">Project Cura</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/provider"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
