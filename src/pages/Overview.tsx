import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, Upload, GitBranch, Lightbulb, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Overview = () => {
  const navigate = useNavigate();
  const { t } = useLang();

  const { data: companiesCount = 0 } = useQuery({
    queryKey: ["overview-companies-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("companies").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: departmentsCount = 0 } = useQuery({
    queryKey: ["overview-departments-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("departments").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: processes = [], isLoading } = useQuery({
    queryKey: ["overview-processes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("uploaded_processes")
        .select("id, file_name, status, upload_date, companies(name)")
        .order("upload_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: useCasesCount = 0 } = useQuery({
    queryKey: ["overview-usecases-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("automation_use_cases").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const totalProcesses = processes.length;
  const statusCounts = {
    uploaded: processes.filter((p) => p.status === "uploaded").length,
    analyzed: processes.filter((p) => p.status === "analyzed").length,
    approved: processes.filter((p) => p.status === "approved").length,
    discovered: processes.filter((p) => p.status === "discovered").length,
  };

  const stats = [
    { label: t.overview.companies, value: companiesCount, icon: Building2, color: "text-primary" },
    { label: t.overview.departments, value: departmentsCount, icon: Building2, color: "text-primary" },
    { label: t.overview.processes, value: totalProcesses, icon: GitBranch, color: "text-primary" },
    { label: t.overview.useCasesFound, value: useCasesCount, icon: Lightbulb, color: "text-primary" },
  ];

  const stageLabels: Record<string, string> = {
    uploaded: t.overview.uploaded,
    analyzed: t.overview.analyzed,
    approved: t.overview.approved,
    discovered: t.overview.discovered,
  };

  const typeIcons: Record<string, string> = {
    uploaded: "📤",
    analyzed: "🔍",
    approved: "✅",
    discovered: "💡",
  };

  const recentActivity = processes.slice(0, 8);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions + Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.overview.quickActions}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/knowledge-base")} size="sm">
              <Building2 className="mr-1 h-4 w-4" /> {t.overview.addCompany}
            </Button>
            <Button onClick={() => navigate("/process-upload")} size="sm" variant="outline">
              <Upload className="mr-1 h-4 w-4" /> {t.overview.uploadProcess}
            </Button>
            <Button onClick={() => navigate("/automation-discovery")} size="sm" variant="outline">
              <Lightbulb className="mr-1 h-4 w-4" /> {t.overview.viewDiscoveries}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.overview.processPipeline}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["uploaded", "analyzed", "approved", "discovered"] as const).map((stage) => (
              <div key={stage} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{stageLabels[stage]}</span>
                  <span className="font-medium">{statusCounts[stage]}</span>
                </div>
                <Progress value={totalProcesses > 0 ? (statusCounts[stage] / totalProcesses) * 100 : 0} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.overview.recentActivity}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune activité récente</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item: any) => (
                <div key={item.id} className="flex items-start gap-3 text-sm">
                  <span className="text-lg leading-none mt-0.5">{typeIcons[item.status] || "📄"}</span>
                  <div className="flex-1">
                    <p className="text-foreground">{item.file_name}{item.companies?.name ? ` — ${item.companies.name}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.upload_date).toLocaleDateString("fr-FR", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs capitalize">{stageLabels[item.status] ?? item.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;
