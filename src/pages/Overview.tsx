import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Upload, GitBranch, Lightbulb, Loader2, Brain, Bot, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AgentMessage } from "@/components/agents/AgentMessage";
import type { AgentName } from "@/components/agents/AgentMessage";

const Overview = () => {
  const navigate = useNavigate();
  const { t, lang } = useLang();

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");

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
        .select("id, file_name, status, upload_date, company_id, companies(name)")
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

  const { data: agentLogs = [] } = useQuery({
    queryKey: ["overview-agent-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_logs")
        .select("id, agent_name, action, status, message, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Derived
  const totalProcesses = processes.length;
  const statusCounts = {
    uploaded: processes.filter((p) => p.status === "uploaded").length,
    analyzed: processes.filter((p) => p.status === "analyzed").length,
    approved: processes.filter((p) => p.status === "approved").length,
    discovered: processes.filter((p) => p.status === "discovered").length,
  };

  const uniqueCompanies = useMemo(() => {
    const map = new Map<string, string>();
    processes.forEach((p: any) => {
      if (p.companies?.name && p.company_id) map.set(p.company_id, p.companies.name);
    });
    return [...map.entries()];
  }, [processes]);

  const filteredProcesses = useMemo(() => {
    return processes.filter((p: any) => {
      if (filterSearch && !p.file_name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterCompany !== "all") {
        if (filterCompany === "none" && p.company_id) return false;
        if (filterCompany !== "none" && p.company_id !== filterCompany) return false;
      }
      return true;
    });
  }, [processes, filterSearch, filterStatus, filterCompany]);

  const activeFilterCount = [filterSearch, filterStatus !== "all", filterCompany !== "all"].filter(Boolean).length;

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

      {/* Activity Feed with Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t.overview.recentActivity}</CardTitle>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => { setFilterSearch(""); setFilterStatus("all"); setFilterCompany("all"); }}>
                <X className="h-3 w-3 mr-1" /> Réinitialiser ({activeFilterCount})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 pb-2 border-b">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} className="pl-8 h-9 text-sm" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="uploaded">{stageLabels.uploaded}</SelectItem>
                <SelectItem value="analyzed">{stageLabels.analyzed}</SelectItem>
                <SelectItem value="approved">{stageLabels.approved}</SelectItem>
                <SelectItem value="discovered">{stageLabels.discovered}</SelectItem>
              </SelectContent>
            </Select>
            {uniqueCompanies.length > 0 && (
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Entreprise" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="none">Sans entreprise</SelectItem>
                  {uniqueCompanies.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filteredProcesses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {processes.length === 0 ? "Aucune activité récente" : "Aucun résultat pour ces filtres"}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredProcesses.slice(0, 10).map((item: any) => (
                <div key={item.id} className="flex items-start gap-3 text-sm">
                  <span className="text-lg leading-none mt-0.5">{typeIcons[item.status] || "📄"}</span>
                  <div className="flex-1">
                    <p className="text-foreground">{item.file_name}{item.companies?.name ? ` — ${item.companies.name}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.upload_date).toLocaleDateString("fr-FR", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs capitalize">{stageLabels[item.status] ?? item.status}</Badge>
                </div>
              ))}
              {processes.length > 0 && (
                <p className="text-xs text-muted-foreground text-right">{filteredProcesses.length} / {processes.length} processus</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Activity */}
      {agentLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              {lang === "fr" ? "Activité des Agents" : "Agent Activity"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 divide-y divide-border/50">
            {agentLogs.map((log: any) => (
              <AgentMessage
                key={log.id}
                agent={log.agent_name as AgentName}
                status={log.status === "completed" ? "done" : log.status === "error" ? "error" : "working"}
                message={log.message || log.action}
                timestamp={new Date(log.created_at)}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Overview;
