import { LayoutDashboard, Building2, Upload, GitBranch, Lightbulb } from "lucide-react";
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
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Knowledge Base", url: "/knowledge-base", icon: Building2 },
  { title: "Process Upload", url: "/process-upload", icon: Upload },
  { title: "Process Analysis", url: "/process-analysis", icon: GitBranch },
  { title: "Automation Discovery", url: "/automation-discovery", icon: Lightbulb },
];

const steps = ["Context", "Upload", "Analyze", "Approve", "Discover"];

export function AppSidebar() {
  const location = useLocation();

  const activeIndex = (() => {
    const path = location.pathname;
    if (path === "/") return 0;
    if (path.startsWith("/knowledge-base")) return 1;
    if (path.startsWith("/process-upload")) return 2;
    if (path.startsWith("/process-analysis")) return 3;
    if (path.startsWith("/automation-discovery")) return 4;
    return 0;
  })();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="p-4 pb-2">
          <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">AutoDiscover</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Automation Discovery Platform</p>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Step indicator */}
        <div className="mt-auto p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Journey</p>
          <div className="flex flex-col gap-1">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    i <= activeIndex ? "bg-primary" : "bg-border"
                  }`}
                />
                <span
                  className={`text-xs ${
                    i <= activeIndex ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
