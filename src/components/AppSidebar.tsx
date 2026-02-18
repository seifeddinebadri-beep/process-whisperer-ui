import { LayoutDashboard, Building2, Upload, GitBranch, Lightbulb, Globe } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useLang } from "@/lib/i18n";
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

export function AppSidebar() {
  const location = useLocation();
  const { t, lang, setLang } = useLang();

  const navItems = [
    { title: t.nav.overview, url: "/", icon: LayoutDashboard },
    { title: t.nav.knowledgeBase, url: "/knowledge-base", icon: Building2 },
    { title: t.nav.processUpload, url: "/process-upload", icon: Upload },
    { title: t.nav.processAnalysis, url: "/process-analysis", icon: GitBranch },
    { title: t.nav.automationDiscovery, url: "/automation-discovery", icon: Lightbulb },
  ];

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
          <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">{t.appName}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t.appSubtitle}</p>
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
        <div className="mt-auto p-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">{t.journey}</p>
            <div className="flex flex-col gap-1">
              {t.journeySteps.map((step: string, i: number) => (
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

          {/* Language Switcher */}
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> {t.language}
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setLang("fr")}
                className={`flex-1 text-xs px-2 py-1.5 rounded border transition-colors ${
                  lang === "fr"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                🇫🇷 FR
              </button>
              <button
                onClick={() => setLang("en")}
                className={`flex-1 text-xs px-2 py-1.5 rounded border transition-colors ${
                  lang === "en"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                🇬🇧 EN
              </button>
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
