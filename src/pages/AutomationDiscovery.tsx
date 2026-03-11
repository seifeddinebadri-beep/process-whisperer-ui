import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List, Loader2, Sparkles, Trash2, Search, X, FileText, ArrowUpDown, Clock, BarChart3, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";

const impactColors: Record<string, string> = {
  low: "bg-secondary text-secondary-foreground",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-green-100 text-green-800",
};

const AutomationDiscovery = () => {
  const navigate = useNavigate();
  const { t } = useLang();
  const queryClient = useQueryClient();

  // Filters
  const [filterSearch, setFilterSearch] = useState("");
  const [filterImpact, setFilterImpact] = useState("all");
  const [filterComplexity, setFilterComplexity] = useState("all");
  const [filterProcess, setFilterProcess] = useState("all");
  const [filterDetailed, setFilterDetailed] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title_asc" | "title_desc" | "impact">("newest");

  const deleteUseCase = async (ucId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Supprimer ce cas d'usage et toutes ses données associées ?")) return;
    try {
      await supabase.from("use_case_details").delete().eq("use_case_id", ucId);
      await supabase.from("automation_variants").delete().eq("use_case_id", ucId);
      const { data: convs } = await supabase.from("ba_conversations").select("id").eq("use_case_id", ucId);
      if (convs && convs.length > 0) {
        const convIds = convs.map((c: any) => c.id);
        await supabase.from("ba_messages").delete().in("conversation_id", convIds);
        await supabase.from("pdd_documents").delete().in("conversation_id", convIds);
        await supabase.from("ba_conversations").delete().in("id", convIds);
      }
      await supabase.from("automation_use_cases").delete().eq("id", ucId);
      queryClient.invalidateQueries({ queryKey: ["automation-use-cases"] });
      queryClient.invalidateQueries({ queryKey: ["use-case-detail-ids"] });
      toast.success("Cas d'usage supprimé");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  const { data: useCases = [], isLoading } = useQuery({
    queryKey: ["automation-use-cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_use_cases")
        .select("*, uploaded_processes(file_name, status), automation_variants(id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: detailIds } = useQuery({
    queryKey: ["use-case-detail-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("use_case_details")
        .select("use_case_id");
      if (error) throw error;
      return new Set((data || []).map((d: any) => d.use_case_id));
    },
  });

  // Check which use cases have PDDs
  const { data: pddIds } = useQuery({
    queryKey: ["use-case-pdd-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdd_documents")
        .select("use_case_id");
      if (error) throw error;
      return new Set((data || []).map((d: any) => d.use_case_id));
    },
  });

  // Check which use cases are validated for development
  const { data: validatedUcIds } = useQuery({
    queryKey: ["validated-uc-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("validated_selections")
        .select("use_case_id");
      if (error) throw error;
      return new Set((data || []).map((d: any) => d.use_case_id));
    },
  });

  const hasPdd = (ucId: string) => pddIds?.has(ucId) ?? false;

  const hasDetail = (ucId: string) => detailIds?.has(ucId) ?? false;

  const isValidated = (ucId: string) => validatedUcIds?.has(ucId) ?? false;

  // Derive unique values for filters
  const uniqueProcesses = useMemo(() => {
    const map = new Map<string, string>();
    useCases.forEach((uc: any) => {
      if (uc.uploaded_processes?.file_name) {
        map.set(uc.process_id, uc.uploaded_processes.file_name);
      }
    });
    return [...map.entries()];
  }, [useCases]);

  const uniqueComplexities = useMemo(() => [...new Set(useCases.map((uc: any) => uc.complexity).filter(Boolean))], [useCases]);
  const uniqueImpacts = useMemo(() => [...new Set(useCases.map((uc: any) => uc.impact).filter(Boolean))], [useCases]);

  // Apply filters
  const filteredUseCases = useMemo(() => {
    const filtered = useCases.filter((uc: any) => {
      if (filterSearch && !uc.title.toLowerCase().includes(filterSearch.toLowerCase()) && !(uc.description || "").toLowerCase().includes(filterSearch.toLowerCase())) return false;
      if (filterImpact !== "all" && uc.impact !== filterImpact) return false;
      if (filterComplexity !== "all" && uc.complexity !== filterComplexity) return false;
      if (filterProcess !== "all" && uc.process_id !== filterProcess) return false;
      if (filterDetailed === "yes" && !hasDetail(uc.id)) return false;
      if (filterDetailed === "no" && hasDetail(uc.id)) return false;
      return true;
    });

    // Sort
    const impactOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "title_asc": return a.title.localeCompare(b.title);
        case "title_desc": return b.title.localeCompare(a.title);
        case "impact": return (impactOrder[b.impact] || 0) - (impactOrder[a.impact] || 0);
        default: return 0;
      }
    });

    return filtered;
  }, [useCases, filterSearch, filterImpact, filterComplexity, filterProcess, filterDetailed, detailIds, sortBy]);

  const activeFilterCount = [filterSearch, filterImpact !== "all", filterComplexity !== "all", filterProcess !== "all", filterDetailed !== "all", sortBy !== "newest"].filter(Boolean).length;

  const clearFilters = () => { setFilterSearch(""); setFilterImpact("all"); setFilterComplexity("all"); setFilterProcess("all"); setFilterDetailed("all"); setSortBy("newest"); };

  if (isLoading) {
    return (
      <div className="max-w-5xl flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t.discovery.title}</h2>
          <p className="text-sm text-muted-foreground">{t.discovery.subtitle}</p>
        </div>
        {useCases.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => navigate("/automation-discovery/report")}>
            <BarChart3 className="h-3.5 w-3.5 mr-1" /> Générer le rapport
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher un cas d'usage..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={filterImpact} onValueChange={setFilterImpact}>
              <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="Impact" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout impact</SelectItem>
                {uniqueImpacts.map((i) => <SelectItem key={i} value={i} className="capitalize">{i}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterComplexity} onValueChange={setFilterComplexity}>
              <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Complexité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toute complexité</SelectItem>
                {uniqueComplexities.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterProcess} onValueChange={setFilterProcess}>
              <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder="Processus" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les processus</SelectItem>
                {uniqueProcesses.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDetailed} onValueChange={setFilterDetailed}>
              <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="Détaillé" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="yes">✨ Détaillé</SelectItem>
                <SelectItem value="no">Non détaillé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Plus récent</SelectItem>
                <SelectItem value="oldest">Plus ancien</SelectItem>
                <SelectItem value="title_asc">Titre A→Z</SelectItem>
                <SelectItem value="title_desc">Titre Z→A</SelectItem>
                <SelectItem value="impact">Impact ↓</SelectItem>
              </SelectContent>
            </Select>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-9" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" /> Réinitialiser ({activeFilterCount})
              </Button>
            )}
          </div>
          {useCases.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">{filteredUseCases.length} / {useCases.length} cas d'usage</p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="cards">
        <TabsList>
          <TabsTrigger value="cards"><LayoutGrid className="h-4 w-4 mr-1" /> {t.discovery.cards}</TabsTrigger>
          <TabsTrigger value="table"><List className="h-4 w-4 mr-1" /> {t.discovery.table}</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-4">
          {filteredUseCases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Aucun cas d'usage ne correspond aux filtres</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredUseCases.map((uc: any) => (
                <Card key={uc.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/automation-discovery/${uc.id}`)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium">{uc.title}</CardTitle>
                      <div className="flex items-center gap-1.5">
                        {isValidated(uc.id) && (
                          <Badge variant="outline" className="text-xs gap-1 border-green-500/30 bg-green-500/10 text-green-700">
                            <CheckCircle2 className="h-3 w-3" /> Validé
                          </Badge>
                        )}
                        {hasPdd(uc.id) && (
                          <Badge variant="outline" className="text-xs gap-1 border-green-500/30 text-green-700">
                            <FileText className="h-3 w-3" /> PDD
                          </Badge>
                        )}
                        {hasDetail(uc.id) && (
                          <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                            <Sparkles className="h-3 w-3" /> Détaillé
                          </Badge>
                        )}
                        {uc.automation_variants?.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {uc.automation_variants.length} {t.variants?.variantCount || "variantes"}
                          </Badge>
                        )}
                        <Badge className={`text-xs capitalize ${impactColors[uc.impact || "medium"]}`}>
                          {t.discovery[(uc.impact || "medium") as "low" | "medium" | "high"]}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{uc.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {uc.complexity && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {t.discovery.complexity || "Complexité"}: {uc.complexity}
                        </Badge>
                      )}
                      {uc.roi_estimate && (
                        <Badge variant="outline" className="text-xs">ROI: {uc.roi_estimate}</Badge>
                      )}
                      {uc.uploaded_processes?.file_name && (
                        <Badge variant="secondary" className="text-[10px]">{uc.uploaded_processes.file_name}</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(uc.created_at), "dd MMM yyyy · HH:mm", { locale: fr })}
                      </span>
                      <Button variant="ghost" size="sm" className="text-xs p-0 h-auto text-primary">{t.discovery.viewDetails}</Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => deleteUseCase(uc.id, e)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.discovery.useCase}</TableHead>
                    <TableHead>Processus</TableHead>
                    <TableHead>{t.discovery.potential}</TableHead>
                    <TableHead>Complexité</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUseCases.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">Aucun résultat</TableCell></TableRow>
                  ) : filteredUseCases.map((uc: any) => (
                    <TableRow key={uc.id} className="cursor-pointer" onClick={() => navigate(`/automation-discovery/${uc.id}`)}>
                      <TableCell className="font-medium text-sm">
                        <span className="flex items-center gap-1.5">
                          {uc.title}
                          {isValidated(uc.id) && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                          {hasPdd(uc.id) && <FileText className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                          {hasDetail(uc.id) && <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{uc.uploaded_processes?.file_name || "—"}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs capitalize ${impactColors[uc.impact || "medium"]}`}>
                          {t.discovery[(uc.impact || "medium") as "low" | "medium" | "high"]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{uc.complexity || "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(uc.created_at), "dd MMM yyyy · HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="text-xs">{t.discovery.details}</Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => deleteUseCase(uc.id, e)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomationDiscovery;
