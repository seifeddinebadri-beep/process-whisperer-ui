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
import { ChevronRight, Plus, Building2, ArrowLeft, Pencil, Wrench } from "lucide-react";
import { mockCompanies, Company, Department, Entity, Activity, Tool } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

type View = "companies" | "departments" | "entities" | "activities";

const KnowledgeBase = () => {
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
    const parts: { label: string; onClick?: () => void }[] = [{ label: "Companies", onClick: () => { setView("companies"); setSelectedCompany(null); } }];
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
            <h2 className="text-lg font-semibold">Companies</h2>
            <Button size="sm" onClick={() => setShowAddCompany(true)}><Plus className="h-4 w-4 mr-1" /> Add Company</Button>
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
                    <Badge variant="secondary">{c.departments.length} departments</Badge>
                    <Badge variant="secondary">{c.tools.length} tools</Badge>
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
              <h2 className="text-lg font-semibold">Departments — {selectedCompany.name}</h2>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setDetailTool(selectedCompany.tools[0] || null)}>
                <Wrench className="h-4 w-4 mr-1" /> View Tools ({selectedCompany.tools.length})
              </Button>
              <Button size="sm" onClick={() => setShowAddDept(true)}><Plus className="h-4 w-4 mr-1" /> Add Department</Button>
            </div>
          </div>
          <div className="grid gap-3">
            {selectedCompany.departments.map((d) => (
              <Card key={d.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedDept(d); setView("entities"); }}>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{d.name}</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{d.entities.length} entities</span>
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
              <h2 className="text-lg font-semibold">Entities — {selectedDept.name}</h2>
            </div>
            <Button size="sm" onClick={() => setShowAddEntity(true)}><Plus className="h-4 w-4 mr-1" /> Add Entity</Button>
          </div>
          <div className="grid gap-3">
            {selectedDept.entities.map((e) => (
              <Card key={e.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedEntity(e); setView("activities"); }}>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{e.name}</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{e.activities.length} activities</span>
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
              <h2 className="text-lg font-semibold">Activities — {selectedEntity.name}</h2>
            </div>
            <Button size="sm" onClick={() => setShowAddActivity(true)}><Plus className="h-4 w-4 mr-1" /> Add Activity</Button>
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
            <SheetDescription>Activity details</SheetDescription>
          </SheetHeader>
          {detailActivity && (
            <div className="space-y-4 mt-4">
              <div><Label className="text-xs text-muted-foreground">Description</Label><p className="text-sm mt-1">{detailActivity.description}</p></div>
              <div><Label className="text-xs text-muted-foreground">Business Objective</Label><p className="text-sm mt-1">{detailActivity.businessObjective}</p></div>
              <div>
                <Label className="text-xs text-muted-foreground">Tools Used</Label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {detailActivity.tools.map((tId) => {
                    const tool = selectedCompany?.tools.find((t) => t.id === tId);
                    return tool ? <Badge key={tId} variant="secondary">{tool.name} ({tool.type})</Badge> : null;
                  })}
                </div>
              </div>
              {detailActivity.documentation && (
                <div><Label className="text-xs text-muted-foreground">Documentation</Label>
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
            <SheetTitle>Tools — {selectedCompany?.name}</SheetTitle>
            <SheetDescription>All tools in use</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            {selectedCompany?.tools.map((t) => (
              <Card key={t.id}>
                <CardHeader className="py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm">{t.name}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">{t.purpose}</CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">{t.type}</Badge>
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
          <DialogHeader><DialogTitle>Add Company</DialogTitle><DialogDescription>Enter company details</DialogDescription></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); toast({ title: "Company added" }); setShowAddCompany(false); }} className="space-y-3">
            <div><Label>Name</Label><Input placeholder="Company name" required /></div>
            <div><Label>Industry</Label><Input placeholder="e.g. Manufacturing" required /></div>
            <div><Label>Size</Label><Input placeholder="e.g. 500-1,000 employees" /></div>
            <div><Label>Strategy Notes</Label><Textarea placeholder="Strategic context..." /></div>
            <DialogFooter><Button type="submit">Add Company</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog open={showAddDept} onOpenChange={setShowAddDept}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Department</DialogTitle><DialogDescription>Add a new department</DialogDescription></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); toast({ title: "Department added" }); setShowAddDept(false); }} className="space-y-3">
            <div><Label>Department Name</Label><Input placeholder="e.g. Finance" required /></div>
            <DialogFooter><Button type="submit">Add</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Entity Dialog */}
      <Dialog open={showAddEntity} onOpenChange={setShowAddEntity}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Entity</DialogTitle><DialogDescription>Add a new entity</DialogDescription></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); toast({ title: "Entity added" }); setShowAddEntity(false); }} className="space-y-3">
            <div><Label>Entity Name</Label><Input placeholder="e.g. Accounts Payable" required /></div>
            <DialogFooter><Button type="submit">Add</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog open={showAddActivity} onOpenChange={setShowAddActivity}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Activity</DialogTitle><DialogDescription>Add a new activity</DialogDescription></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); toast({ title: "Activity added" }); setShowAddActivity(false); }} className="space-y-3">
            <div><Label>Name</Label><Input placeholder="Activity name" required /></div>
            <div><Label>Description</Label><Textarea placeholder="Describe the activity..." required /></div>
            <div><Label>Business Objective</Label><Input placeholder="e.g. Reduce processing time" /></div>
            <DialogFooter><Button type="submit">Add</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeBase;
