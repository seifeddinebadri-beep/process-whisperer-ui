import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronRight, Plus, Building2, ArrowLeft, Wrench, Loader2, Trash2, Upload, FileText, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";

type View = "companies" | "departments" | "entities" | "activities" | "services";

const KnowledgeBase = () => {
  const { t, lang } = useLang();
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>("companies");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [detailService, setDetailService] = useState<any | null>(null);
  const [showTools, setShowTools] = useState(false);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddDept, setShowAddDept] = useState(false);
  const [showAddEntity, setShowAddEntity] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddTool, setShowAddTool] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ table: string; id: string; name: string } | null>(null);

  // Tool form state
  const [toolName, setToolName] = useState("");
  const [toolType, setToolType] = useState("");
  const [toolPurpose, setToolPurpose] = useState("");
  const [toolDoc, setToolDoc] = useState("");

  // Upload state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadContext, setUploadContext] = useState<{ entityType: string; entityId: string } | null>(null);

  // Form refs
  const companyFormRef = useRef<HTMLFormElement>(null);
  const deptFormRef = useRef<HTMLFormElement>(null);
  const entityFormRef = useRef<HTMLFormElement>(null);
  const activityFormRef = useRef<HTMLFormElement>(null);
  const serviceFormRef = useRef<HTMLFormElement>(null);

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

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["services", selectedActivityId],
    queryFn: async () => {
      const { data, error } = await supabase.from("services" as any).select("*").eq("activity_id", selectedActivityId!).order("name");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedActivityId,
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

  const { data: deptCounts = {} } = useQuery({
    queryKey: ["dept_entity_counts", selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("department_id").in("department_id", departments.map((d) => d.id));
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
      const { data, error } = await supabase.from("activities").select("entity_id").in("entity_id", entities.map((e) => e.id));
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((a) => { counts[a.entity_id] = (counts[a.entity_id] || 0) + 1; });
      return counts;
    },
    enabled: entities.length > 0,
  });

  const { data: activityServiceCounts = {} } = useQuery({
    queryKey: ["activity_service_counts", selectedEntityId],
    queryFn: async () => {
      const { data, error } = await supabase.from("services" as any).select("activity_id").in("activity_id", activities.map((a) => a.id));
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data as any[]).forEach((s: any) => { counts[s.activity_id] = (counts[s.activity_id] || 0) + 1; });
      return counts;
    },
    enabled: activities.length > 0,
  });

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

  // KB Documents query
  const currentEntityType = view === "companies" ? null : view === "departments" ? "company" : view === "entities" ? "department" : view === "activities" ? "entity" : view === "services" ? "activity" : null;
  const currentEntityId = view === "departments" ? selectedCompanyId : view === "entities" ? selectedDeptId : view === "activities" ? selectedEntityId : view === "services" ? selectedActivityId : null;

  const { data: kbDocuments = [] } = useQuery({
    queryKey: ["kb_documents", currentEntityType, currentEntityId],
    queryFn: async () => {
      const { data, error } = await supabase.from("kb_documents" as any).select("*").eq("entity_type", currentEntityType!).eq("entity_id", currentEntityId!).order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!currentEntityType && !!currentEntityId,
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

  const addService = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("services" as any).insert({
        activity_id: selectedActivityId!,
        name: form.get("name") as string,
        description: form.get("description") as string || null,
        business_objective: form.get("business_objective") as string || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", selectedActivityId] });
      queryClient.invalidateQueries({ queryKey: ["activity_service_counts", selectedEntityId] });
      toast({ title: t.kb.serviceAdded });
      setShowAddService(false);
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const addToolMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tools").insert({
        company_id: selectedCompanyId!,
        name: toolName,
        type: toolType || null,
        purpose: toolPurpose || null,
        documentation: toolDoc || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["company_tool_counts"] });
      toast({ title: lang === "fr" ? "Outil ajouté" : "Tool added" });
      setShowAddTool(false);
      setToolName("");
      setToolType("");
      setToolPurpose("");
      setToolDoc("");
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ table, id }: { table: string; id: string }) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t.kb.deleted });
      queryClient.invalidateQueries();
      setDeleteTarget(null);
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // Document upload
  const handleDocUpload = async (file: File, entityType: string, entityId: string) => {
    setUploading(true);
    try {
      const filePath = `kb/${entityType}/${entityId}/${file.name}`;
      const { error: uploadError } = await supabase.storage.from("process-files").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from("kb_documents" as any).insert({
        file_name: file.name,
        file_path: filePath,
        entity_type: entityType,
        entity_id: entityId,
      } as any);
      if (dbError) throw dbError;
      queryClient.invalidateQueries({ queryKey: ["kb_documents", entityType, entityId] });
      toast({ title: t.kb.documentUploaded });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadContext(null);
    }
  };

  const deleteDocument = useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      await supabase.storage.from("process-files").remove([filePath]);
      const { error } = await supabase.from("kb_documents" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t.kb.documentDeleted });
      queryClient.invalidateQueries({ queryKey: ["kb_documents"] });
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // ---- Navigation helpers ----
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const selectedDept = departments.find((d) => d.id === selectedDeptId);
  const selectedEntity = entities.find((e) => e.id === selectedEntityId);
  const selectedActivity = activities.find((a) => a.id === selectedActivityId);

  const breadcrumb = () => {
    const parts: { label: string; onClick?: () => void }[] = [
      { label: t.kb.companies, onClick: () => { setView("companies"); setSelectedCompanyId(null); setSelectedDeptId(null); setSelectedEntityId(null); setSelectedActivityId(null); } },
    ];
    if (selectedCompany) parts.push({ label: selectedCompany.name, onClick: () => { setView("departments"); setSelectedDeptId(null); setSelectedEntityId(null); setSelectedActivityId(null); } });
    if (selectedDept) parts.push({ label: selectedDept.name, onClick: () => { setView("entities"); setSelectedEntityId(null); setSelectedActivityId(null); } });
    if (selectedEntity) parts.push({ label: selectedEntity.name, onClick: () => { setView("activities"); setSelectedActivityId(null); } });
    if (selectedActivity) parts.push({ label: selectedActivity.name });
    return parts;
  };

  const LoadingSpinner = () => <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  // Delete button component
  const DeleteButton = ({ table, id, name }: { table: string; id: string; name: string }) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-destructive"
      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ table, id, name }); }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  // Document section component
  const DocumentSection = ({ entityType, entityId }: { entityType: string; entityId: string }) => {
    const { data: docs = [] } = useQuery({
      queryKey: ["kb_documents", entityType, entityId],
      queryFn: async () => {
        const { data, error } = await supabase.from("kb_documents" as any).select("*").eq("entity_type", entityType).eq("entity_id", entityId).order("uploaded_at", { ascending: false });
        if (error) throw error;
        return data as any[];
      },
    });

    return (
      <div className="mt-3 space-y-2">
        {docs.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {docs.map((doc: any) => (
              <Badge key={doc.id} variant="outline" className="text-xs gap-1">
                <FileText className="h-3 w-3" />
                {doc.file_name}
                <button onClick={(e) => { e.stopPropagation(); deleteDocument.mutate({ id: doc.id, filePath: doc.file_path }); }}>
                  <X className="h-3 w-3 hover:text-destructive" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            setUploadContext({ entityType, entityId });
            fileInputRef.current?.click();
          }}
        >
          <Upload className="h-3 w-3 mr-1" /> {t.kb.uploadDocument}
        </Button>
      </div>
    );
  };

  return (
    <div className="max-w-5xl space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadContext) {
            handleDocUpload(file, uploadContext.entityType, uploadContext.entityId);
          }
          e.target.value = "";
        }}
      />

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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{c.name}</CardTitle>
                      </div>
                      <DeleteButton table="companies" id={c.id} name={c.name} />
                    </div>
                    <CardDescription>{c.industry}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{c.size}</Badge>
                      <Badge variant="secondary">{companyDeptCounts[c.id] || 0} depts</Badge>
                      <Badge variant="secondary">{companyToolCounts[c.id] || 0} {t.kb.tools.toLowerCase()}</Badge>
                    </div>
                    <DocumentSection entityType="company" entityId={c.id} />
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
                        <DeleteButton table="departments" id={d.id} name={d.name} />
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <DocumentSection entityType="department" entityId={d.id} />
                  </CardContent>
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
                        <DeleteButton table="entities" id={e.id} name={e.name} />
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <DocumentSection entityType="entity" entityId={e.id} />
                  </CardContent>
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
                <Card key={a.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedActivityId(a.id); setView("services"); }}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{a.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{activityServiceCounts[a.id] || 0} {t.kb.activityServices}</span>
                        <DeleteButton table="activities" id={a.id} name={a.name} />
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <CardDescription className="text-xs">{a.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {a.business_objective && <Badge variant="outline" className="text-xs">🎯 {a.business_objective}</Badge>}
                    </div>
                    <DocumentSection entityType="activity" entityId={a.id} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Services View */}
      {view === "services" && selectedActivity && (
        <>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setView("activities"); setSelectedActivityId(null); }}><ArrowLeft className="h-4 w-4" /></Button>
              <h2 className="text-lg font-semibold">{t.kb.services} — {selectedActivity.name}</h2>
            </div>
            <Button size="sm" onClick={() => setShowAddService(true)}><Plus className="h-4 w-4 mr-1" /> {t.kb.addService}</Button>
          </div>
          {loadingServices ? <LoadingSpinner /> : (
            <div className="grid gap-3">
              {services.map((s: any) => (
                <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailService(s)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{s.name}</CardTitle>
                      <DeleteButton table="services" id={s.id} name={s.name} />
                    </div>
                    <CardDescription className="text-xs">{s.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {s.business_objective && <Badge variant="outline" className="text-xs">🎯 {s.business_objective}</Badge>}
                    </div>
                    <DocumentSection entityType="service" entityId={s.id} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Service Detail Sheet */}
      <Sheet open={!!detailService} onOpenChange={() => setDetailService(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{detailService?.name}</SheetTitle>
            <SheetDescription>{t.kb.serviceDetails}</SheetDescription>
          </SheetHeader>
          {detailService && (
            <div className="space-y-4 mt-4">
              <div><Label className="text-xs text-muted-foreground">{t.kb.description}</Label><p className="text-sm mt-1">{detailService.description}</p></div>
              <div><Label className="text-xs text-muted-foreground">{t.kb.businessObjective}</Label><p className="text-sm mt-1">{detailService.business_objective}</p></div>
              {detailService.documentation && detailService.documentation.length > 0 && (
                <div><Label className="text-xs text-muted-foreground">{t.kb.documentation}</Label>
                  <div className="mt-1">{detailService.documentation.map((d: string, i: number) => <Badge key={i} variant="outline" className="text-xs mr-1">{d}</Badge>)}</div>
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
            <Button size="sm" className="w-full" onClick={() => setShowAddTool(true)}>
              <Plus className="h-4 w-4 mr-1" /> {lang === "fr" ? "Ajouter un outil" : "Add Tool"}
            </Button>
            {tools.map((tool) => (
              <Card key={tool.id}>
                <CardHeader className="py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm">{tool.name}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">{tool.purpose}</CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs capitalize">{tool.type}</Badge>
                      <DeleteButton table="tools" id={tool.id} name={tool.name} />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.kb.delete} — {deleteTarget?.name}</AlertDialogTitle>
            <AlertDialogDescription>{t.kb.confirmDelete}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.kb.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate({ table: deleteTarget.table, id: deleteTarget.id })}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {t.kb.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Add Service Dialog */}
      <Dialog open={showAddService} onOpenChange={setShowAddService}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.kb.addService}</DialogTitle><DialogDescription>{t.kb.addNewService}</DialogDescription></DialogHeader>
          <form ref={serviceFormRef} onSubmit={(e) => { e.preventDefault(); addService.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
            <div><Label>{t.kb.name}</Label><Input name="name" placeholder={t.kb.serviceName} required /></div>
            <div><Label>{t.kb.description}</Label><Textarea name="description" placeholder={lang === "fr" ? "Décrire le service..." : "Describe the service..."} /></div>
            <div><Label>{t.kb.businessObjective}</Label><Input name="business_objective" placeholder="ex. Réduire le temps de traitement" /></div>
            <DialogFooter><Button type="submit" disabled={addService.isPending}>{addService.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}{t.kb.add}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Tool Dialog */}
      <Dialog open={showAddTool} onOpenChange={setShowAddTool}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lang === "fr" ? "Ajouter un outil" : "Add Tool"}</DialogTitle>
            <DialogDescription>{lang === "fr" ? "Référencez un outil utilisé dans l'entreprise" : "Register a tool used in the company"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t.kb.name}</Label>
              <Input value={toolName} onChange={(e) => setToolName(e.target.value)} placeholder="ex. SAP ERP, Salesforce" required />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={toolType} onValueChange={setToolType}>
                <SelectTrigger><SelectValue placeholder={lang === "fr" ? "Sélectionner un type" : "Select type"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{lang === "fr" ? "Manuel" : "Manual"}</SelectItem>
                  <SelectItem value="semi-automated">{lang === "fr" ? "Semi-automatisé" : "Semi-automated"}</SelectItem>
                  <SelectItem value="system">{lang === "fr" ? "Système" : "System"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{lang === "fr" ? "Usage / Objectif" : "Purpose"}</Label>
              <Input value={toolPurpose} onChange={(e) => setToolPurpose(e.target.value)} placeholder={lang === "fr" ? "ex. Gestion des commandes" : "e.g. Order management"} />
            </div>
            <div>
              <Label>{t.kb.documentation}</Label>
              <Textarea value={toolDoc} onChange={(e) => setToolDoc(e.target.value)} placeholder={lang === "fr" ? "Lien ou notes..." : "Link or notes..."} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => addToolMutation.mutate()} disabled={!toolName || addToolMutation.isPending}>
              {addToolMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {t.kb.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeBase;
