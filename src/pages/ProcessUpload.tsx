import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileUp } from "lucide-react";
import { mockCompanies, mockProcesses } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

const ProcessUpload = () => {
  const [dragOver, setDragOver] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");

  const company = mockCompanies.find((c) => c.id === selectedCompany);
  const dept = company?.departments.find((d) => d.id === selectedDept);
  const entity = dept?.entities.find((e) => e.id === selectedEntity);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setUploaded(true);
    toast({ title: "File uploaded", description: "Ready for context assignment." });
  }, []);

  const statusColor: Record<string, string> = {
    uploaded: "bg-secondary text-secondary-foreground",
    analyzed: "bg-primary/10 text-primary",
    approved: "bg-green-100 text-green-800",
    discovered: "bg-amber-100 text-amber-800",
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader><CardTitle className="text-base">Upload Process Data</CardTitle></CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => { setUploaded(true); toast({ title: "File uploaded" }); }}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <FileUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">Drop your CSV file here or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">Supports .csv event log files</p>
          </div>
        </CardContent>
      </Card>

      {/* Context Assignment */}
      {uploaded && (
        <Card>
          <CardHeader><CardTitle className="text-base">Assign Context</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Company</Label>
                <Select value={selectedCompany} onValueChange={(v) => { setSelectedCompany(v); setSelectedDept(""); setSelectedEntity(""); setSelectedActivity(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>{mockCompanies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department</Label>
                <Select value={selectedDept} onValueChange={(v) => { setSelectedDept(v); setSelectedEntity(""); setSelectedActivity(""); }} disabled={!company}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>{company?.departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Entity</Label>
                <Select value={selectedEntity} onValueChange={(v) => { setSelectedEntity(v); setSelectedActivity(""); }} disabled={!dept}>
                  <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                  <SelectContent>{dept?.entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Activity / Project</Label>
                <Select value={selectedActivity} onValueChange={setSelectedActivity} disabled={!entity}>
                  <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
                  <SelectContent>{entity?.activities.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes & Assumptions</Label>
              <Textarea placeholder="Add any context, assumptions, or constraints..." />
            </div>
            <Button onClick={() => toast({ title: "Context assigned", description: "Process is ready for analysis." })}>
              <Upload className="h-4 w-4 mr-1" /> Submit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upload History */}
      <Card>
        <CardHeader><CardTitle className="text-base">Upload History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockProcesses.map((p) => {
                const c = mockCompanies.find((co) => co.id === p.companyId);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">{p.fileName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.uploadDate}</TableCell>
                    <TableCell className="text-sm">{c?.name}</TableCell>
                    <TableCell><Badge className={`capitalize text-xs ${statusColor[p.status]}`}>{p.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessUpload;
