import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Plus } from "lucide-react";
import { mockProcesses, mockAnalyses, ProcessStep, ProcessContext } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { StepCard } from "@/components/process-analysis/StepCard";
import { StepEditModal } from "@/components/process-analysis/StepEditModal";
import { ProcessContextCard } from "@/components/process-analysis/ProcessContextCard";
import { EditableBadges } from "@/components/process-analysis/EditableBadges";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const analysisProcesses = mockProcesses.filter((p) => p.status === "analyzed" || p.status === "approved");

function stepsToNodesEdges(steps: ProcessStep[]) {
  const nodes: Node[] = steps.map((s, i) => ({
    id: s.id,
    position: { x: 250, y: i * 120 },
    data: { label: s.name },
    style: {
      padding: "12px 20px",
      borderRadius: 8,
      border: "1px solid hsl(214.3, 31.8%, 91.4%)",
      background: "white",
      fontSize: 13,
      fontWeight: 500,
      minWidth: 180,
      textAlign: "center" as const,
    },
  }));
  const edges: Edge[] = steps.slice(0, -1).map((s, i) => ({
    id: `e-${s.id}-${steps[i + 1].id}`,
    source: s.id,
    target: steps[i + 1].id,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "hsl(215.4, 16.3%, 46.9%)" },
  }));
  return { nodes, edges };
}

const ProcessAnalysis = () => {
  const [selectedProcessId, setSelectedProcessId] = useState(analysisProcesses[0]?.id || "");
  const analysis = mockAnalyses[selectedProcessId];
  const process = mockProcesses.find((p) => p.id === selectedProcessId);

  // Editable state
  const [steps, setSteps] = useState<ProcessStep[]>(analysis?.steps || []);
  const [roles, setRoles] = useState<string[]>(analysis?.roles || []);
  const [tools, setTools] = useState<string[]>(analysis?.toolsUsed || []);
  const [context, setContext] = useState<ProcessContext>(analysis?.context || {});
  const [approved, setApproved] = useState(process?.status === "approved");

  // Modal state
  const [editingStep, setEditingStep] = useState<ProcessStep | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Flowchart state
  const initial = useMemo(() => stepsToNodesEdges(steps), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)), [setEdges]);

  // Sync flowchart when steps change
  const syncFlowchart = (newSteps: ProcessStep[]) => {
    const { nodes: n, edges: e } = stepsToNodesEdges(newSteps);
    setNodes(n);
    setEdges(e);
  };

  const handleSelectProcess = (id: string) => {
    setSelectedProcessId(id);
    const a = mockAnalyses[id];
    const p = mockProcesses.find((pr) => pr.id === id);
    setSteps(a?.steps || []);
    setRoles(a?.roles || []);
    setTools(a?.toolsUsed || []);
    setContext(a?.context || {});
    setApproved(p?.status === "approved");
    if (a) syncFlowchart(a.steps);
  };

  // Step CRUD
  const handleSaveStep = (step: ProcessStep) => {
    const newSteps = steps.map((s) => (s.id === step.id ? step : s));
    setSteps(newSteps);
    syncFlowchart(newSteps);
    setEditingStep(null);
    toast({ title: "Step updated" });
  };

  const handleAddStep = (step: ProcessStep) => {
    const newSteps = [...steps, step];
    setSteps(newSteps);
    syncFlowchart(newSteps);
    setIsAdding(false);
    toast({ title: "Step added" });
  };

  const handleDeleteStep = (stepId: string) => {
    const newSteps = steps.filter((s) => s.id !== stepId);
    setSteps(newSteps);
    syncFlowchart(newSteps);
    toast({ title: "Step removed" });
  };

  const handleMoveStep = (index: number, direction: -1 | 1) => {
    const newSteps = [...steps];
    const target = index + direction;
    [newSteps[index], newSteps[target]] = [newSteps[target], newSteps[index]];
    setSteps(newSteps);
    syncFlowchart(newSteps);
  };

  const newStepTemplate: ProcessStep = {
    id: `s-new-${Date.now()}`,
    name: "",
    description: "",
    role: "",
    toolUsed: "",
  };

  if (!analysis) {
    return (
      <div className="max-w-5xl">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No analyzed processes available. Upload and submit a process first.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6 pb-24">
      {/* Process Selector */}
      <div className="flex items-center gap-4">
        <Select value={selectedProcessId} onValueChange={handleSelectProcess}>
          <SelectTrigger className="w-[300px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {analysisProcesses.map((p) => <SelectItem key={p.id} value={p.id}>{p.fileName}</SelectItem>)}
          </SelectContent>
        </Select>
        {approved && <Badge className="bg-green-100 text-green-800">Approved</Badge>}
      </div>

      {/* Editable As-Is Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">As-Is Process Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((step, i) => (
            <StepCard
              key={step.id}
              step={step}
              index={i}
              total={steps.length}
              onEdit={setEditingStep}
              onDelete={handleDeleteStep}
              onMoveUp={(idx) => handleMoveStep(idx, -1)}
              onMoveDown={(idx) => handleMoveStep(idx, 1)}
            />
          ))}
          <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Step
          </Button>

          {/* Roles & Tools */}
          <div className="flex flex-wrap gap-6 pt-3 border-t">
            <EditableBadges label="Roles" items={roles} onChange={setRoles} variant="secondary" />
            <EditableBadges label="Tools" items={tools} onChange={setTools} variant="outline" />
          </div>
        </CardContent>
      </Card>

      {/* Process-Level Context */}
      <ProcessContextCard context={context} onChange={setContext} />

      {/* Flowchart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Process Flowchart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] rounded-lg border bg-muted/20">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
              className="bg-muted/10"
            >
              <Background color="hsl(214.3, 31.8%, 91.4%)" gap={20} />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>

      {/* Edit Step Modal */}
      <StepEditModal
        step={editingStep}
        open={!!editingStep}
        onClose={() => setEditingStep(null)}
        onSave={handleSaveStep}
      />

      {/* Add Step Modal */}
      <StepEditModal
        step={isAdding ? newStepTemplate : null}
        open={isAdding}
        onClose={() => setIsAdding(false)}
        onSave={handleAddStep}
        title="Add New Step"
      />

      {/* Sticky Approve Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Approve & Run Discovery</p>
            <p className="text-xs text-muted-foreground">Approving will trigger automation use case discovery based on the process and context above.</p>
          </div>
          <Button
            disabled={steps.length === 0 || approved}
            onClick={() => {
              setApproved(true);
              toast({ title: "Process approved!", description: "Automation discovery is now available." });
            }}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {approved ? "Approved" : "Approve & Run Discovery"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProcessAnalysis;
