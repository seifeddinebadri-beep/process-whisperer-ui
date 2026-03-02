import { useMemo, useCallback } from "react";
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
  Handle,
  Position,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, User, Wrench } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ProcessStep } from "./types";

/* ── Custom BPMN node components ── */

function StartEventNode(_props: NodeProps) {
  return (
    <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-green-600 bg-green-50">
      <Handle type="source" position={Position.Bottom} className="!bg-green-600 !w-2 !h-2" />
      <span className="text-[10px] font-semibold text-green-700">START</span>
    </div>
  );
}

function EndEventNode(_props: NodeProps) {
  return (
    <div className="flex items-center justify-center w-12 h-12 rounded-full border-[3px] border-red-600 bg-red-50">
      <Handle type="target" position={Position.Top} className="!bg-red-600 !w-2 !h-2" />
      <span className="text-[10px] font-semibold text-red-700">END</span>
    </div>
  );
}

function TaskNode({ data }: NodeProps) {
  const d = data as {
    label: string;
    role?: string;
    toolUsed?: string;
    painPoints?: string;
    source?: string;
  };
  const sourceBadge: Record<string, { className: string; label: string }> = {
    event_log: { className: "bg-blue-100 text-blue-800 border-blue-200", label: "EL" },
    knowledge_base: { className: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "KB" },
    merged: { className: "bg-purple-100 text-purple-800 border-purple-200", label: "M" },
    manual: { className: "bg-muted text-muted-foreground", label: "Man" },
  };
  const sb = d.source ? sourceBadge[d.source] : null;

  return (
    <TooltipProvider>
      <div className="relative min-w-[200px] max-w-[260px] rounded-lg border-2 border-primary/30 bg-card shadow-sm px-4 py-3">
        <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2" />
        <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" />

        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold leading-tight text-foreground">{d.label}</p>
          {sb && (
            <Badge variant="outline" className={`text-[9px] px-1 py-0 shrink-0 ${sb.className}`}>
              {sb.label}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {d.role && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <User className="h-3 w-3" /> {d.role}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">Rôle</TooltipContent>
            </Tooltip>
          )}
          {d.toolUsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Wrench className="h-3 w-3" /> {d.toolUsed}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">Outil</TooltipContent>
            </Tooltip>
          )}
          {d.painPoints && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="h-3 w-3 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                {d.painPoints}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function GatewayNode({ data }: NodeProps) {
  const d = data as { label: string; gatewayType: string; businessRules?: string };
  const isManual = d.gatewayType === "manual_judgment";

  return (
    <TooltipProvider>
      <div className="relative flex flex-col items-center">
        <Handle type="target" position={Position.Top} className="!bg-amber-600 !w-2 !h-2" />
        {/* Diamond shape */}
        <div
          className={`w-14 h-14 rotate-45 border-2 flex items-center justify-center ${
            isManual
              ? "border-orange-500 bg-orange-50"
              : "border-amber-500 bg-amber-50"
          }`}
        >
          <span className="text-[18px] -rotate-45">{isManual ? "?" : "×"}</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-[10px] mt-1 text-center font-medium text-muted-foreground max-w-[140px] leading-tight cursor-help">
              {d.label}
            </p>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[220px]">
            <p className="text-xs font-semibold mb-1">
              {isManual ? "Décision manuelle" : "Règle métier"}
            </p>
            {d.businessRules && <p className="text-xs">{d.businessRules}</p>}
          </TooltipContent>
        </Tooltip>
        <Handle type="source" position={Position.Bottom} className="!bg-amber-600 !w-2 !h-2" />
      </div>
    </TooltipProvider>
  );
}

const nodeTypes = {
  startEvent: StartEventNode,
  endEvent: EndEventNode,
  bpmnTask: TaskNode,
  gateway: GatewayNode,
};

/* ── Layout helpers ── */

const X_CENTER = 300;
const Y_SPACING = 140;
const GATEWAY_BRANCH_X = 160;

function buildBpmnGraph(steps: ProcessStep[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Start event
  nodes.push({
    id: "bpmn-start",
    type: "startEvent",
    position: { x: X_CENTER, y: 0 },
    data: {},
  });

  let y = Y_SPACING;
  let prevId = "bpmn-start";

  steps.forEach((step) => {
    const isGateway =
      step.decisionType === "manual_judgment" || step.decisionType === "rule_based";

    if (isGateway) {
      // Gateway diamond
      const gwId = `gw-${step.id}`;
      nodes.push({
        id: gwId,
        type: "gateway",
        position: { x: X_CENTER - 7, y },
        data: {
          label: step.name,
          gatewayType: step.decisionType,
          businessRules: step.businessRules,
        },
      });
      edges.push({
        id: `e-${prevId}-${gwId}`,
        source: prevId,
        target: gwId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "hsl(var(--muted-foreground))" },
      });

      // After gateway, the next task will connect from it
      // We also place a "task" node for the actual work described by this step
      y += Y_SPACING;
      const taskId = `task-${step.id}`;
      nodes.push({
        id: taskId,
        type: "bpmnTask",
        position: { x: X_CENTER - 100, y },
        data: {
          label: step.name,
          role: step.role,
          toolUsed: step.toolUsed,
          painPoints: step.painPoints,
          source: step.source,
        },
      });
      edges.push({
        id: `e-${gwId}-${taskId}`,
        source: gwId,
        target: taskId,
        label: "Oui",
        style: { stroke: "hsl(var(--muted-foreground))" },
        markerEnd: { type: MarkerType.ArrowClosed },
      });
      prevId = taskId;
    } else {
      // Normal task
      const taskId = `task-${step.id}`;
      nodes.push({
        id: taskId,
        type: "bpmnTask",
        position: { x: X_CENTER - 100, y },
        data: {
          label: step.name,
          role: step.role,
          toolUsed: step.toolUsed,
          painPoints: step.painPoints,
          source: step.source,
        },
      });
      edges.push({
        id: `e-${prevId}-${taskId}`,
        source: prevId,
        target: taskId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "hsl(var(--muted-foreground))" },
      });
      prevId = taskId;
    }

    y += Y_SPACING;
  });

  // End event
  nodes.push({
    id: "bpmn-end",
    type: "endEvent",
    position: { x: X_CENTER, y },
    data: {},
  });
  edges.push({
    id: `e-${prevId}-end`,
    source: prevId,
    target: "bpmn-end",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "hsl(var(--muted-foreground))" },
  });

  return { nodes, edges };
}

/* ── Main component ── */

interface BpmnFlowViewProps {
  steps: ProcessStep[];
}

export function BpmnFlowView({ steps }: BpmnFlowViewProps) {
  const initial = useMemo(() => buildBpmnGraph(steps), [steps]);
  const [nodes, , onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)
      ),
    [setEdges]
  );

  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground text-sm">
        Aucune étape à afficher
      </div>
    );
  }

  return (
    <div className="h-[600px] rounded-lg border bg-muted/20">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        className="bg-muted/10"
      >
        <Background color="hsl(var(--border))" gap={20} />
        <Controls />
        <MiniMap
          nodeStrokeColor="hsl(var(--muted-foreground))"
          nodeColor={(n) => {
            if (n.type === "startEvent") return "#22c55e";
            if (n.type === "endEvent") return "#ef4444";
            if (n.type === "gateway") return "#f59e0b";
            return "hsl(var(--card))";
          }}
        />
      </ReactFlow>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full border-2 border-green-600 inline-block" /> Début
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-primary/40 bg-card inline-block" /> Tâche
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rotate-45 border border-amber-500 bg-amber-50 inline-block" /> Décision
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full border-[3px] border-red-600 inline-block" /> Fin
        </span>
      </div>
    </div>
  );
}
