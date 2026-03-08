import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { LanguageProvider } from "@/lib/i18n";
import Overview from "./pages/Overview";
import KnowledgeBase from "./pages/KnowledgeBase";
import ProcessUpload from "./pages/ProcessUpload";
import ProcessAnalysis from "./pages/ProcessAnalysis";
import AutomationDiscovery from "./pages/AutomationDiscovery";
import AutomationBacklogReport from "./pages/AutomationBacklogReport";
import UseCaseDetail from "./pages/UseCaseDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <LanguageProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Overview />} />
              <Route path="/knowledge-base" element={<KnowledgeBase />} />
              <Route path="/process-upload" element={<ProcessUpload />} />
              <Route path="/process-analysis" element={<ProcessAnalysis />} />
              <Route path="/automation-discovery" element={<AutomationDiscovery />} />
              <Route path="/automation-discovery/report" element={<AutomationBacklogReport />} />
              <Route path="/automation-discovery/:id" element={<UseCaseDetail />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </LanguageProvider>
);

export default App;
