import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { mockProcesses, mockAnalyses, ProcessStep } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
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

  const initial = useMemo(() => analysis ? stepsToNodesEdges(analysis.steps) : { nodes: [], edges: [] }, [selectedProcessId]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [editNode, setEditNode] = useState<Node | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [approved, setApproved] = useState(process?.status === "approved");

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)), [setEdges]);

  const handleNodeClick = useCallback((_: any, node: Node) => {
    setEditNode(node);
    setEditLabel(node.data.label as string);
  }, []);

  const handleSaveNode = () => {
    if (editNode) {
      setNodes((nds) => nds.map((n) => n.id === editNode.id ? { ...n, data: { ...n.data, label: editLabel } } : n));
      setEditNode(null);
      toast({ title: "Step updated" });
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setEditNode(null);
    toast({ title: "Step removed" });
  };

  const handleAddNode = () => {
    const id = `s-new-${Date.now()}`;
    const lastNode = nodes[nodes.length - 1];
    const newNode: Node = {
      id,
      position: { x: 250, y: lastNode ? lastNode.position.y + 120 : 0 },
      data: { label: "New Step" },
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
    };
    setNodes((nds) => [...nds, newNode]);
    if (lastNode) {
      setEdges((eds) => [...eds, { id: `e-${lastNode.id}-${id}`, source: lastNode.id, target: id, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "hsl(215.4, 16.3%, 46.9%)" } }]);
    }
    toast({ title: "Step added" });
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
    <div className="max-w-6xl space-y-6">
      {/* Process Selector */}
      <div className="flex items-center gap-4">
        <Select value={selectedProcessId} onValueChange={(v) => { setSelectedProcessId(v); setApproved(mockProcesses.find(p => p.id === v)?.status === "approved"); }}>
          <SelectTrigger className="w-[300px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {analysisProcesses.map((p) => <SelectItem key={p.id} value={p.id}>{p.fileName}</SelectItem>)}
          </SelectContent>
        </Select>
        {approved && <Badge className="bg-green-100 text-green-800">Approved</Badge>}
      </div>

      {/* As-Is Description */}
      <Card>
        <CardHeader><CardTitle className="text-base">As-Is Process Description</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {analysis.steps.map((s, i) => (
              <div key={s.id} className="flex gap-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground w-6 pt-0.5">{i + 1}.</span>
                <div>
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground"> — {s.description}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 pt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Roles</Label>
              <div className="flex gap-1 mt-1 flex-wrap">{analysis.roles.map((r) => <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>)}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tools</Label>
              <div className="flex gap-1 mt-1 flex-wrap">{analysis.toolsUsed.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flowchart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Process Flowchart</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleAddNode}><Plus className="h-4 w-4 mr-1" /> Add Step</Button>
            {!approved && (
              <Button size="sm" onClick={() => { setApproved(true); toast({ title: "Process approved!", description: "Automation discovery is now available." }); }}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve As-Is
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] rounded-lg border bg-muted/20">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
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

      {/* Edit Node Dialog */}
      <Dialog open={!!editNode} onOpenChange={() => setEditNode(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Step</DialogTitle><DialogDescription>Modify or remove this process step</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Step Name</Label><Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} /></div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" size="sm" onClick={() => editNode && handleDeleteNode(editNode.id)}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
            <Button onClick={handleSaveNode}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProcessAnalysis;
