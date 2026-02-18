import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLang } from "@/lib/i18n";

export function AppLayout() {
  const location = useLocation();
  const { t } = useLang();

  const pageTitles: Record<string, string> = {
    "/": t.nav.overview,
    "/knowledge-base": t.nav.knowledgeBase,
    "/process-upload": t.nav.processUpload,
    "/process-analysis": t.nav.processAnalysis,
    "/automation-discovery": t.nav.automationDiscovery,
  };

  const title = pageTitles[location.pathname] || t.nav.overview;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="h-5 w-px bg-border" />
              <span className="text-sm font-medium text-foreground">{title}</span>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">JD</AvatarFallback>
            </Avatar>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
