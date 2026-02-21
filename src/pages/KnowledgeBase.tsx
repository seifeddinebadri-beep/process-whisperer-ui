import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ChevronRight, Plus, Building2, ArrowLeft, Wrench, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";

type View = "companies" | "departments" | "entities" | "activities";

const KnowledgeBase = () => {
  const { t } = useLang();
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>("companies");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [detailActivity, setDetailActivity] = useState<Tables<"activities"> | null>(null);
  const [showTools, setShowTools] = useState(false);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddDept, setShowAddDept] = useState(false);
  const [showAddEntity, setShowAddEntity] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);

  // Form refs
  const companyFormRef = useRef<HTMLFormElement>(null);
  const deptFormRef = useRef<HTMLFormElement>(null);
  const entityFormRef = useRef<HTMLFormElement>(null);
  const activityFormRef = useRef<HTMLFormElement>(null);

  // ---- Queries ----
  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ["departments", selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*").eq("company_id", selectedCompanyId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });

  const { data: entities = [], isLoading: loadingEntities } = useQuery({
    queryKey: ["entities", selectedDeptId],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("*").eq("department_id", selectedDeptId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDeptId,
  });

  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ["activities", selectedEntityId],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("*").eq("entity_id", selectedEntityId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEntityId,
  });

  const { data: tools = [] } = useQuery({
    queryKey: ["tools", selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tools").select("*").eq("company_id", selectedCompanyId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });

  // For activity detail: fetch linked tool IDs
  const { data: activityToolIds = [] } = useQuery({
    queryKey: ["activity_tools", detailActivity?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_tools").select("tool_id").eq("activity_id", detailActivity!.id);
      if (error) throw error;
      return data.map((r) => r.tool_id);
    },
    enabled: !!detailActivity,
  });

  // Department/entity counts for display
  const { data: deptCounts = {} } = useQuery({
    queryKey: ["dept_entity_counts", selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("department_id").in(
        "department_id",
        departments.map((d) => d.id)
      );
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((e) => { counts[e.department_id] = (counts[e.department_id] || 0) + 1; });
      return counts;
    },
    enabled: departments.length > 0,
  });

  const { data: entityActivityCounts = {} } = useQuery({
    queryKey: ["entity_activity_counts", selectedDeptId],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("entity_id").in(
        "entity_id",
        entities.map((e) => e.id)
      );
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((a) => { counts[a.entity_id] = (counts[a.entity_id] || 0) + 1; });
      return counts;
    },
    enabled: entities.length > 0,
  });

  // Company card counts
  const { data: companyDeptCounts = {} } = useQuery({
    queryKey: ["company_dept_counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("company_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((d) => { counts[d.company_id] = (counts[d.company_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: companyToolCounts = {} } = useQuery({
    queryKey: ["company_tool_counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tools").select("company_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((t) => { counts[t.company_id] = (counts[t.company_id] || 0) + 1; });
      return counts;
    },
  });

  // ---- Mutations ----
  const addCompany = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("companies").insert({
        name: form.get("name") as string,
        industry: form.get("industry") as string || null,
        size: form.get("size") as string || null,
        strategy_notes: form.get("strategy_notes") as string || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company_dept_counts"] });
      toast({ title: t.kb.companyAdded });
      setShowAddCompany(false);
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const addDept = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("departments").insert({
        company_id: selectedCompanyId!,
        name: form.get("name") as string,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["company_dept_counts"] });
      toast({ title: t.kb.departmentAdded });
      setShowAddDept(false);
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const addEntity = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("entities").insert({
        department_id: selectedDeptId!,
        name: form.get("name") as string,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities", selectedDeptId] });
      queryClient.invalidateQueries({ queryKey: ["dept_entity_counts", selectedCompanyId] });
      toast({ title: t.kb.entityAdded });
      setShowAddEntity(false);
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const addActivity = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("activities").insert({
        entity_id: selectedEntityId!,
        name: form.get("name") as string,
        description: form.get("description") as string || null,
        business_objective: form.get("business_objective") as string || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", selectedEntityId] });
      queryClient.invalidateQueries({ queryKey: ["entity_activity_counts", selectedDeptId] });
      toast({ title: t.kb.activityAdded });
      setShowAddActivity(false);
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // ---- Navigation helpers ----
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const selectedDept = departments.find((d) => d.id === selectedDeptId);
  const selectedEntity = entities.find((e) => e.id === selectedEntityId);

  const breadcrumb = () => {
    const parts: { label: string; onClick?: () => void }[] = [
      { label: t.kb.companies, onClick: () => { setView("companies"); setSelectedCompanyId(null); setSelectedDeptId(null); setSelectedEntityId(null); } },
    ];
    if (selectedCompany) parts.push({ label: selectedCompany.name, onClick: () => { setView("departments"); setSelectedDeptId(null); setSelectedEntityId(null); } });
    if (selectedDept) parts.push({ label: selectedDept.name, onClick: () => { setView("entities"); setSelectedEntityId(null); } });
    if (selectedEntity) parts.push({ label: selectedEntity.name });
    return parts;
  };

  const LoadingSpinner = () => <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-5xl space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        {breadcrumb().map((b, i, arr) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            <button
              onClick={b.onClick}
              className={`hover:text-foreground ${i === arr.length - 1 ? "text-foreground font-medium" : ""}`}
              disabled={!b.onClick}
            >
              {b.label}
            </button>
          </span>
        ))}
      </div>

      {/* Companies View */}
      {view === "companies" && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">{t.kb.companies}</h2>
            <Button size="sm" onClick={() => setShowAddCompany(true)}><Plus className="h-4 w-4 mr-1" /> {t.kb.addCompany}</Button>
          </div>
          {loadingCompanies ? <LoadingSpinner /> : (
            <div className="grid gap-4 sm:grid-cols-2">
              {companies.map((c) => (
                <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedCompanyId(c.id); setView("departments"); }}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{c.name}</CardTitle>
                    </div>
                    <CardDescription>{c.industry}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{c.size}</Badge>
                      <Badge variant="secondary">{companyDeptCounts[c.id] || 0} depts</Badge>
                      <Badge variant="secondary">{companyToolCounts[c.id] || 0} {t.kb.tools.toLowerCase()}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Departments View */}
      {view === "departments" && selectedCompany && (
        <>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setView("companies"); setSelectedCompanyId(null); }}><ArrowLeft className="h-4 w-4" /></Button>
              <h2 className="text-lg font-semibold">{t.kb.departments} — {selectedCompany.name}</h2>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowTools(true)}>
                <Wrench className="h-4 w-4 mr-1" /> {t.kb.viewTools} ({tools.length})
              </Button>
              <Button size="sm" onClick={() => setShowAddDept(true)}><Plus className="h-4 w-4 mr-1" /> {t.kb.addDepartment}</Button>
            </div>
          </div>
          {loadingDepts ? <LoadingSpinner /> : (
            <div className="grid gap-3">
              {departments.map((d) => (
                <Card key={d.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedDeptId(d.id); setView("entities"); }}>
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{d.name}</CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{deptCounts[d.id] || 0} {t.kb.entities.toLowerCase()}</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Entities View */}
      {view === "entities" && selectedDept && (
        <>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setView("departments"); setSelectedDeptId(null); }}><ArrowLeft className="h-4 w-4" /></Button>
              <h2 className="text-lg font-semibold">{t.kb.entities} — {selectedDept.name}</h2>
            </div>
            <Button size="sm" onClick={() => setShowAddEntity(true)}><Plus className="h-4 w-4 mr-1" /> {t.kb.addEntity}</Button>
          </div>
          {loadingEntities ? <LoadingSpinner /> : (
            <div className="grid gap-3">
              {entities.map((e) => (
                <Card key={e.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedEntityId(e.id); setView("activities"); }}>
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{e.name}</CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{entityActivityCounts[e.id] || 0} {t.kb.activities.toLowerCase()}</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Activities View */}
      {view === "activities" && selectedEntity && (
        <>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setView("entities"); setSelectedEntityId(null); }}><ArrowLeft className="h-4 w-4" /></Button>
              <h2 className="text-lg font-semibold">{t.kb.activities} — {selectedEntity.name}</h2>
            </div>
            <Button size="sm" onClick={() => setShowAddActivity(true)}><Plus className="h-4 w-4 mr-1" /> {t.kb.addActivity}</Button>
          </div>
          {loadingActivities ? <LoadingSpinner /> : (
            <div className="grid gap-3">
              {activities.map((a) => (
                <Card key={a.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailActivity(a)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{a.name}</CardTitle>
                    <CardDescription className="text-xs">{a.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {a.business_objective && <Badge variant="outline" className="text-xs">🎯 {a.business_objective}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Activity Detail Sheet */}
      <Sheet open={!!detailActivity} onOpenChange={() => setDetailActivity(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{detailActivity?.name}</SheetTitle>
            <SheetDescription>{t.kb.activityDetails}</SheetDescription>
          </SheetHeader>
          {detailActivity && (
            <div className="space-y-4 mt-4">
              <div><Label className="text-xs text-muted-foreground">{t.kb.description}</Label><p className="text-sm mt-1">{detailActivity.description}</p></div>
              <div><Label className="text-xs text-muted-foreground">{t.kb.businessObjective}</Label><p className="text-sm mt-1">{detailActivity.business_objective}</p></div>
              <div>
                <Label className="text-xs text-muted-foreground">{t.kb.toolsUsed}</Label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {activityToolIds.map((toolId) => {
                    const tool = tools.find((t) => t.id === toolId);
                    return tool ? <Badge key={toolId} variant="secondary">{tool.name} ({tool.type})</Badge> : null;
                  })}
                  {activityToolIds.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                </div>
              </div>
              {detailActivity.documentation && detailActivity.documentation.length > 0 && (
                <div><Label className="text-xs text-muted-foreground">{t.kb.documentation}</Label>
                  <div className="mt-1">{detailActivity.documentation.map((d, i) => <Badge key={i} variant="outline" className="text-xs mr-1">{d}</Badge>)}</div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Tool List Sheet */}
      <Sheet open={showTools} onOpenChange={setShowTools}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t.kb.tools} — {selectedCompany?.name}</SheetTitle>
            <SheetDescription>{t.kb.allTools}</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            {tools.map((tool) => (
              <Card key={tool.id}>
                <CardHeader className="py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm">{tool.name}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">{tool.purpose}</CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">{tool.type}</Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Company Dialog */}
      <Dialog open={showAddCompany} onOpenChange={setShowAddCompany}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.kb.addCompany}</DialogTitle><DialogDescription>{t.kb.enterCompanyDetails}</DialogDescription></DialogHeader>
          <form ref={companyFormRef} onSubmit={(e) => { e.preventDefault(); addCompany.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
            <div><Label>{t.kb.name}</Label><Input name="name" placeholder={t.kb.companyName} required /></div>
            <div><Label>{t.kb.industry}</Label><Input name="industry" placeholder="ex. Industrie manufacturière" /></div>
            <div><Label>{t.kb.size}</Label><Input name="size" placeholder="ex. 500-1 000 employés" /></div>
            <div><Label>{t.kb.strategyNotes}</Label><Textarea name="strategy_notes" placeholder="Contexte stratégique..." /></div>
            <DialogFooter><Button type="submit" disabled={addCompany.isPending}>{addCompany.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}{t.kb.addCompany}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog open={showAddDept} onOpenChange={setShowAddDept}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.kb.addDepartment}</DialogTitle><DialogDescription>{t.kb.addNewDepartment}</DialogDescription></DialogHeader>
          <form ref={deptFormRef} onSubmit={(e) => { e.preventDefault(); addDept.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
            <div><Label>{t.kb.name}</Label><Input name="name" placeholder={t.kb.departmentName} required /></div>
            <DialogFooter><Button type="submit" disabled={addDept.isPending}>{addDept.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}{t.kb.add}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Entity Dialog */}
      <Dialog open={showAddEntity} onOpenChange={setShowAddEntity}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.kb.addEntity}</DialogTitle><DialogDescription>{t.kb.addNewEntity}</DialogDescription></DialogHeader>
          <form ref={entityFormRef} onSubmit={(e) => { e.preventDefault(); addEntity.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
            <div><Label>{t.kb.name}</Label><Input name="name" placeholder={t.kb.entityName} required /></div>
            <DialogFooter><Button type="submit" disabled={addEntity.isPending}>{addEntity.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}{t.kb.add}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog open={showAddActivity} onOpenChange={setShowAddActivity}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.kb.addActivity}</DialogTitle><DialogDescription>{t.kb.addNewActivity}</DialogDescription></DialogHeader>
          <form ref={activityFormRef} onSubmit={(e) => { e.preventDefault(); addActivity.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
            <div><Label>{t.kb.name}</Label><Input name="name" placeholder={t.kb.activityName} required /></div>
            <div><Label>{t.kb.description}</Label><Textarea name="description" placeholder="Décrire l'activité..." /></div>
            <div><Label>{t.kb.businessObjective}</Label><Input name="business_objective" placeholder="ex. Réduire le temps de traitement" /></div>
            <DialogFooter><Button type="submit" disabled={addActivity.isPending}>{addActivity.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}{t.kb.add}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeBase;
