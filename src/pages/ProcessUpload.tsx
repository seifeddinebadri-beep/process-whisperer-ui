import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Upload, FileUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useLang } from "@/lib/i18n";

const ProcessUpload = () => {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");

  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch departments for selected company
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", selectedCompany],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name").eq("company_id", selectedCompany).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany,
  });

  // Fetch entities for selected department
  const { data: entities = [] } = useQuery({
    queryKey: ["entities", selectedDept],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("id, name").eq("department_id", selectedDept).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDept,
  });

  // Fetch activities for selected entity
  const { data: activities = [] } = useQuery({
    queryKey: ["activities", selectedEntity],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("id, name").eq("entity_id", selectedEntity).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEntity,
  });

  // Fetch upload history
  const { data: uploadHistory = [] } = useQuery({
    queryKey: ["uploaded_processes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("uploaded_processes")
        .select("id, file_name, upload_date, status, company_id, companies(name)")
        .order("upload_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    toast({ title: t.upload.fileUploaded, description: file.name });
  }, [t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");

      setUploading(true);
      setUploadProgress(10);
      setUploadStage("Uploading file...");

      // 1. Upload file to storage
      const filePath = `${crypto.randomUUID()}/${selectedFile.name}`;
      const { error: storageError } = await supabase.storage
        .from("process-files")
        .upload(filePath, selectedFile);

      if (storageError) throw storageError;
      setUploadProgress(25);
      setUploadStage("Saving record...");

      // 2. Insert record in uploaded_processes
      const { data: process, error: insertError } = await supabase
        .from("uploaded_processes")
        .insert({
          file_name: selectedFile.name,
          file_path: filePath,
          company_id: selectedCompany || null,
          department_id: selectedDept || null,
          entity_id: selectedEntity || null,
          activity_id: selectedActivity || null,
          notes: notes || null,
          status: "uploaded",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      setUploadProgress(40);
      setUploadStage("Parsing document...");

      // 3. Call parse-document edge function
      const { error: parseError } = await supabase.functions.invoke("parse-document", {
        body: { process_id: process.id },
      });

      if (parseError) {
        console.error("parse-document error:", parseError);
        toast({ title: "Parsing warning", description: "File uploaded but parsing encountered an issue.", variant: "destructive" });
      }

      setUploadProgress(60);
      setUploadStage("Generating embeddings...");

      // 4. Trigger embeddings generation
      try {
        await supabase.functions.invoke("generate-embeddings", {
          body: { process_id: process.id },
        });
      } catch (e) {
        console.error("generate-embeddings error:", e);
      }

      setUploadProgress(80);
      setUploadStage("Extracting process steps (AI)...");

      // 5. Extract structured steps via LLM
      try {
        const { data: extractData, error: extractError } = await supabase.functions.invoke("extract-steps", {
          body: { process_id: process.id },
        });
        if (extractError) {
          console.error("extract-steps error:", extractError);
          toast({ title: "Step extraction warning", description: "Steps could not be auto-extracted. You can add them manually.", variant: "destructive" });
        } else {
          console.log("extract-steps result:", extractData);
        }
      } catch (e) {
        console.error("extract-steps error:", e);
      }

      setUploadProgress(100);
      setUploadStage("Complete!");
      return process;
    },
    onSuccess: () => {
      toast({ title: t.upload.contextAssigned, description: t.upload.readyForAnalysis });
      queryClient.invalidateQueries({ queryKey: ["uploaded_processes"] });
      queryClient.invalidateQueries({ queryKey: ["overview-processes"] });
      // Reset form
      setSelectedFile(null);
      setSelectedCompany("");
      setSelectedDept("");
      setSelectedEntity("");
      setSelectedActivity("");
      setNotes("");
      setUploading(false);
      setUploadProgress(0);
      setUploadStage("");
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setUploading(false);
      setUploadProgress(0);
      setUploadStage("");
    },
  });

  const statusColor: Record<string, string> = {
    uploaded: "bg-secondary text-secondary-foreground",
    analyzed: "bg-primary/10 text-primary",
    approved: "bg-green-100 text-green-800",
    discovered: "bg-amber-100 text-amber-800",
  };

  const statusLabel: Record<string, string> = {
    uploaded: t.overview.uploaded,
    analyzed: t.overview.analyzed,
    approved: t.overview.approved,
    discovered: t.overview.discovered,
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t.upload.title}</CardTitle></CardHeader>
        <CardContent>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv,.txt,.json"
            onChange={handleFileChange}
          />
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={handleClickUpload}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <FileUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">
              {selectedFile ? selectedFile.name : t.upload.dropHere}
            </p>
            <p className="text-xs text-muted-foreground mt-1">CSV, TXT, JSON</p>
          </div>
        </CardContent>
      </Card>

      {/* Context Assignment */}
      {selectedFile && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t.upload.assignContext}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{t.upload.company}</Label>
                <Select value={selectedCompany} onValueChange={(v) => { setSelectedCompany(v); setSelectedDept(""); setSelectedEntity(""); setSelectedActivity(""); }}>
                  <SelectTrigger><SelectValue placeholder={t.upload.selectCompany} /></SelectTrigger>
                  <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.upload.department}</Label>
                <Select value={selectedDept} onValueChange={(v) => { setSelectedDept(v); setSelectedEntity(""); setSelectedActivity(""); }} disabled={!selectedCompany}>
                  <SelectTrigger><SelectValue placeholder={t.upload.selectDept} /></SelectTrigger>
                  <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.upload.entity}</Label>
                <Select value={selectedEntity} onValueChange={(v) => { setSelectedEntity(v); setSelectedActivity(""); }} disabled={!selectedDept}>
                  <SelectTrigger><SelectValue placeholder={t.upload.selectEntity} /></SelectTrigger>
                  <SelectContent>{entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.upload.activity}</Label>
                <Select value={selectedActivity} onValueChange={setSelectedActivity} disabled={!selectedEntity}>
                  <SelectTrigger><SelectValue placeholder={t.upload.selectActivity} /></SelectTrigger>
                  <SelectContent>{activities.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t.upload.notes}</Label>
              <Textarea placeholder={t.upload.notesPlaceholder} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {uploading && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">{uploadStage}</p>
              </div>
            )}

            <Button onClick={() => submitMutation.mutate()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              {t.upload.submit}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upload History */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t.upload.uploadHistory}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.upload.file}</TableHead>
                <TableHead>{t.upload.date}</TableHead>
                <TableHead>{t.upload.company}</TableHead>
                <TableHead>{t.upload.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploadHistory.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-sm">{p.file_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(p.upload_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm">{p.companies?.name ?? "—"}</TableCell>
                  <TableCell><Badge className={`capitalize text-xs ${statusColor[p.status]}`}>{statusLabel[p.status] ?? p.status}</Badge></TableCell>
                </TableRow>
              ))}
              {uploadHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-8">No uploads yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessUpload;
