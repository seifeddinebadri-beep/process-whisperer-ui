import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ChevronRight, Plus, Building2, ArrowLeft, Wrench } from "lucide-react";
import { mockCompanies, Company, Department, Entity, Activity, Tool } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { useLang } from "@/lib/i18n";

type View = "companies" | "departments" | "entities" | "activities";

const KnowledgeBase = () => {
  const { t } = useLang();
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [view, setView] = useState<View>("companies");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);
  const [detailTool, setDetailTool] = useState<Tool | null>(null);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddDept, setShowAddDept] = useState(false);
  const [showAddEntity, setShowAddEntity] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);

  const breadcrumb = () => {
    const parts: { label: string; onClick?: () => void }[] = [{ label: t.kb.companies, onClick: () => { setView("companies"); setSelectedCompany(null); } }];
    if (selectedCompany) parts.push({ label: selectedCompany.name, onClick: () => { setView("departments"); setSelectedDept(null); } });
    if (selectedDept) parts.push({ label: selectedDept.name, onClick: () => { setView("entities"); setSelectedEntity(null); } });
    if (selectedEntity) parts.push({ label: selectedEntity.name });
    return parts;
  };

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
          <div className="grid gap-4 sm:grid-cols-2">
            {companies.map((c) => (
              <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedCompany(c); setView("departments"); }}>
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
                    <Badge variant="secondary">{c.departments.length} {t.kb.depEntities.replace("activités","départements").replace("activities","departments")}</Badge>
                    <Badge variant="secondary">{c.tools.length} {t.kb.tools.toLowerCase()}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Departments View */}
      {view === "departments" && selectedCompany && (
        <>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setView("companies"); setSelectedCompany(null); }}><ArrowLeft className="h-4 w-4" /></Button>
              <h2 className="text-lg font-semibold">{t.kb.departments} — {selectedCompany.name}</h2>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setDetailTool(selectedCompany.tools[0] || null)}>
                <Wrench className="h-4 w-4 mr-1" /> {t.kb.viewTools} ({selectedCompany.tools.length})
              </Button>
              <Button size="sm" onClick={() => setShowAddDept(true)}><Plus className="h-4 w-4 mr-1" /> {t.kb.addDepartment}</Button>
            </div>
          </div>
          <div className="grid gap-3">
            {selectedCompany.departments.map((d) => (
              <Card key={d.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedDept(d); setView("entities"); }}>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{d.name}</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{d.entities.length} {t.kb.entities.toLowerCase()}</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Entities View */}
      {view === "entities" && selectedDept && (
        <>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setView("departments"); setSelectedDept(null); }}><ArrowLeft className="h-4 w-4" /></Button>
              <h2 className="text-lg font-semibold">{t.kb.entities} — {selectedDept.name}</h2>
            </div>
            <Button size="sm" onClick={() => setShowAddEntity(true)}><Plus className="h-4 w-4 mr-1" /> {t.kb.addEntity}</Button>
          </div>
          <div className="grid gap-3">
            {selectedDept.entities.map((e) => (
              <Card key={e.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedEntity(e); setView("activities"); }}>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{e.name}</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{e.activities.length} {t.kb.activities.toLowerCase()}</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Activities View */}
      {view === "activities" && selectedEntity && (
        <>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setView("entities"); setSelectedEntity(null); }}><ArrowLeft className="h-4 w-4" /></Button>
              <h2 className="text-lg font-semibold">{t.kb.activities} — {selectedEntity.name}</h2>
            </div>
            <Button size="sm" onClick={() => setShowAddActivity(true)}><Plus className="h-4 w-4 mr-1" /> {t.kb.addActivity}</Button>
          </div>
          <div className="grid gap-3">
            {selectedEntity.activities.map((a) => (
              <Card key={a.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailActivity(a)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{a.name}</CardTitle>
                  <CardDescription className="text-xs">{a.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">🎯 {a.businessObjective}</Badge>
                    {a.tools.map((tId) => {
                      const tool = selectedCompany?.tools.find((t) => t.id === tId);
                      return tool ? <Badge key={tId} variant="secondary" className="text-xs">{tool.name}</Badge> : null;
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
              <div><Label className="text-xs text-muted-foreground">{t.kb.businessObjective}</Label><p className="text-sm mt-1">{detailActivity.businessObjective}</p></div>
              <div>
                <Label className="text-xs text-muted-foreground">{t.kb.toolsUsed}</Label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {detailActivity.tools.map((tId) => {
                    const tool = selectedCompany?.tools.find((t) => t.id === tId);
                    return tool ? <Badge key={tId} variant="secondary">{tool.name} ({tool.type})</Badge> : null;
                  })}
                </div>
              </div>
              {detailActivity.documentation && (
                <div><Label className="text-xs text-muted-foreground">{t.kb.documentation}</Label>
                  <div className="mt-1">{detailActivity.documentation.map((d, i) => <Badge key={i} variant="outline" className="text-xs mr-1">{d}</Badge>)}</div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Tool Detail Sheet */}
      <Sheet open={!!detailTool} onOpenChange={() => setDetailTool(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t.kb.tools} — {selectedCompany?.name}</SheetTitle>
            <SheetDescription>{t.kb.allTools}</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            {selectedCompany?.tools.map((tool) => (
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
          <form onSubmit={(e) => { e.preventDefault(); toast({ title: t.kb.companyAdded }); setShowAddCompany(false); }} className="space-y-3">
            <div><Label>{t.kb.name}</Label><Input placeholder={t.kb.companyName} required /></div>
            <div><Label>{t.kb.industry}</Label><Input placeholder="ex. Industrie manufacturière" required /></div>
            <div><Label>{t.kb.size}</Label><Input placeholder="ex. 500-1 000 employés" /></div>
            <div><Label>{t.kb.strategyNotes}</Label><Textarea placeholder="Contexte stratégique..." /></div>
            <DialogFooter><Button type="submit">{t.kb.addCompany}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog open={showAddDept} onOpenChange={setShowAddDept}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.kb.addDepartment}</DialogTitle><DialogDescription>{t.kb.addNewDepartment}</DialogDescription></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); toast({ title: t.kb.departmentAdded }); setShowAddDept(false); }} className="space-y-3">
            <div><Label>{t.kb.name}</Label><Input placeholder={t.kb.departmentName} required /></div>
            <DialogFooter><Button type="submit">{t.kb.add}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Entity Dialog */}
      <Dialog open={showAddEntity} onOpenChange={setShowAddEntity}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.kb.addEntity}</DialogTitle><DialogDescription>{t.kb.addNewEntity}</DialogDescription></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); toast({ title: t.kb.entityAdded }); setShowAddEntity(false); }} className="space-y-3">
            <div><Label>{t.kb.name}</Label><Input placeholder={t.kb.entityName} required /></div>
            <DialogFooter><Button type="submit">{t.kb.add}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog open={showAddActivity} onOpenChange={setShowAddActivity}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.kb.addActivity}</DialogTitle><DialogDescription>{t.kb.addNewActivity}</DialogDescription></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); toast({ title: t.kb.activityAdded }); setShowAddActivity(false); }} className="space-y-3">
            <div><Label>{t.kb.name}</Label><Input placeholder={t.kb.activityName} required /></div>
            <div><Label>{t.kb.description}</Label><Textarea placeholder="Décrire l'activité..." required /></div>
            <div><Label>{t.kb.businessObjective}</Label><Input placeholder="ex. Réduire le temps de traitement" /></div>
            <DialogFooter><Button type="submit">{t.kb.add}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeBase;
