import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { mockUseCases as mockDiscoveryData } from "@/data/mockAutomationDiscoveryData";

const impactColors: Record<string, string> = {
  low: "bg-secondary text-secondary-foreground",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-green-100 text-green-800",
};

const AutomationDiscovery = () => {
  const navigate = useNavigate();
  const { t } = useLang();
  const queryClient = useQueryClient();

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

  const { data: useCases, isLoading } = useQuery({
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

  // Fetch which use cases have detail content generated
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

  const hasDetail = (ucId: string) => detailIds?.has(ucId) ?? false;

  // Use DB data if available, otherwise fallback to mock
  const displayUseCases = (useCases && useCases.length > 0) ? useCases : mockDiscoveryData;

  if (isLoading) {
    return (
      <div className="max-w-5xl flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t.discovery.title}</h2>
        <p className="text-sm text-muted-foreground">{t.discovery.subtitle}</p>
      </div>

      <Tabs defaultValue="cards">
        <TabsList>
          <TabsTrigger value="cards"><LayoutGrid className="h-4 w-4 mr-1" /> {t.discovery.cards}</TabsTrigger>
          <TabsTrigger value="table"><List className="h-4 w-4 mr-1" /> {t.discovery.table}</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {displayUseCases.map((uc) => (
              <Card key={uc.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/automation-discovery/${uc.id}`)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium">{uc.title}</CardTitle>
                    <div className="flex items-center gap-1.5">
                      {hasDetail(uc.id) && (
                        <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                          <Sparkles className="h-3 w-3" /> Détaillé
                        </Badge>
                      )}
                      {(uc as any).automation_variants?.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {(uc as any).automation_variants.length} {t.variants?.variantCount || "variantes"}
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
                      <Badge variant="outline" className="text-xs">
                        ROI: {uc.roi_estimate}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" className="text-xs p-0 h-auto text-primary">{t.discovery.viewDetails}</Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => deleteUseCase(uc.id, e)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.discovery.useCase}</TableHead>
                    <TableHead>{t.discovery.description}</TableHead>
                    <TableHead>{t.discovery.potential}</TableHead>
                    <TableHead>Complexité</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayUseCases.map((uc) => (
                    <TableRow key={uc.id} className="cursor-pointer" onClick={() => navigate(`/automation-discovery/${uc.id}`)}>
                      <TableCell className="font-medium text-sm">
                        <span className="flex items-center gap-1.5">
                          {uc.title}
                          {hasDetail(uc.id) && <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{uc.description}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs capitalize ${impactColors[uc.impact || "medium"]}`}>
                          {t.discovery[(uc.impact || "medium") as "low" | "medium" | "high"]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{uc.complexity || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="text-xs">{t.discovery.details}</Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={(e) => deleteUseCase(uc.id, e)}
                          >
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
