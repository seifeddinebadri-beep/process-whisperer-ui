import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  Node,
  Edge,
  Handle,
  Position,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface VariantData {
  id: string;
  variant_label: string;
  consultant_name: string;
  steps: { step_name: string; step_order: number; is_skipped: boolean; is_extra: boolean; is_reordered: boolean }[];
}

// Mock data reused from panel
const mockVariantData: VariantData[] = [
  {
    id: "mock-v1", variant_label: "Variante A", consultant_name: "Marie Dupont",
    steps: [
      { step_name: "Réception facture", step_order: 0, is_skipped: false, is_extra: false, is_reordered: false },
      { step_name: "Vérification conformité", step_order: 1, is_skipped: false, is_extra: false, is_reordered: false },
      { step_name: "Saisie dans SAP", step_order: 2, is_skipped: false, is_extra: false, is_reordered: false },
      { step_name: "Rapprochement BC", step_order: 3, is_skipped: false, is_extra: false, is_reordered: false },
      { step_name: "Approbation manager", step_order: 4, is_skipped: false, is_extra: false, is_reordered: false },
      { step_name: "Mise en paiement", step_order: 5, is_skipped: false, is_extra: false, is_reordered: false },
    ],
  },
  {
    id: "mock-v2", variant_label: "Variante B", consultant_name: "Jean Martin",
    steps: [
      { step_name: "Réception facture", step_order: 0, is_skipped: false, is_extra: false, is_reordered: false },
      { step_name: "Saisie dans SAP", step_order: 1, is_skipped: false, is_extra: false, is_reordered: true },
      { step_name: "Vérification conformité", step_order: 2, is_skipped: false, is_extra: false, is_reordered: true },
      { step_name: "Rapprochement BC", step_order: 3, is_skipped: false, is_extra: false, is_reordered: false },
      { step_name: "Relance interne", step_order: 4, is_skipped: false, is_extra: true, is_reordered: false },
      { step_name: "Approbation manager", step_order: 5, is_skipped: false, is_extra: false, is_reordered: false },
      { step_name: "Mise en paiement", step_order: 6, is_skipped: false, is_extra: false, is_reordered: false },
    ],
  },
  {
    id: "mock-v3", variant_label: "Variante C", consultant_name: "Sophie Leclerc",
    steps: [
      { step_name: "Réception facture", step_order: 0, is_skipped: false, is_extra: false, is_reordered: false },
      { step_name: "Vérification conformité", step_order: 1, is_skipped: false, is_extra: false, is_reordered: false },
      { step_name: "Saisie dans SAP", step_order: 2, is_skipped: false, is_extra: false, is_reordered: false },
      { step_name: "Rapprochement BC", step_order: 3, is_skipped: true, is_extra: false, is_reordered: false },
      { step_name: "Approbation manager", step_order: 4, is_skipped: true, is_extra: false, is_reordered: false },
      { step_name: "Mise en paiement", step_order: 5, is_skipped: false, is_extra: false, is_reordered: false },
    ],
  },
];

function VariantStepNode({ data }: NodeProps) {
  const d = data as { label: string; is_skipped?: boolean; is_extra?: boolean; is_reordered?: boolean };
  const borderColor = d.is_skipped ? "border-red-400" : d.is_extra ? "border-blue-400" : d.is_reordered ? "border-orange-400" : "border-primary/30";
  const bgColor = d.is_skipped ? "bg-red-50 dark:bg-red-950/20" : d.is_extra ? "bg-blue-50 dark:bg-blue-950/20" : d.is_reordered ? "bg-orange-50 dark:bg-orange-950/20" : "bg-card";

  return (
    <div className={`relative min-w-[140px] max-w-[180px] rounded-lg border-2 ${borderColor} ${bgColor} shadow-sm px-3 py-2`}>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-1.5 !h-1.5" />
      <p className={`text-[10px] font-medium leading-tight text-center ${d.is_skipped ? "line-through text-muted-foreground" : "text-foreground"}`}>
        {d.label}
      </p>
    </div>
  );
}

function LaneHeaderNode({ data }: NodeProps) {
  const d = data as { label: string; consultant: string };
  return (
    <div className="text-center px-2 py-1">
      <p className="text-xs font-bold text-purple-600">{d.label}</p>
      <p className="text-[10px] text-muted-foreground">{d.consultant}</p>
    </div>
  );
}

const nodeTypes = { variantStep: VariantStepNode, laneHeader: LaneHeaderNode };

const LANE_WIDTH = 220;
const Y_SPACING = 70;
const Y_START = 50;

function buildComparisonGraph(variants: VariantData[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  variants.forEach((v, col) => {
    const x = col * LANE_WIDTH + 40;

    // Lane header
    nodes.push({
      id: `header-${v.id}`,
      type: "laneHeader",
      position: { x, y: 0 },
      data: { label: v.variant_label, consultant: v.consultant_name },
      draggable: false,
    });

    const activeSteps = v.steps
      .filter((s) => s.step_order < 900)
      .sort((a, b) => a.step_order - b.step_order);
    const skippedSteps = v.steps.filter((s) => s.is_skipped);
    const allSteps = [...activeSteps, ...skippedSteps];

    let prevId: string | null = null;
    allSteps.forEach((s, idx) => {
      const nodeId = `${v.id}-step-${idx}`;
      nodes.push({
        id: nodeId,
        type: "variantStep",
        position: { x, y: Y_START + idx * Y_SPACING },
        data: {
          label: s.step_name,
          is_skipped: s.is_skipped,
          is_extra: s.is_extra,
          is_reordered: s.is_reordered,
        },
      });

      if (prevId) {
        edges.push({
          id: `e-${prevId}-${nodeId}`,
          source: prevId,
          target: nodeId,
          style: { stroke: s.is_skipped ? "hsl(0 70% 70%)" : "hsl(var(--muted-foreground))", strokeDasharray: s.is_skipped ? "5 5" : undefined },
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      }
      prevId = nodeId;
    });
  });

  return { nodes, edges };
}

interface Props {
  processId: string;
}

export function VariantComparisonFlow({ processId }: Props) {
  const isMock = processId === "mock-process-1";

  const { data: variants = [] } = useQuery({
    queryKey: ["variant-comparison-data", processId],
    queryFn: async (): Promise<VariantData[]> => {
      if (isMock) return mockVariantData;
      const { data, error } = await supabase
        .from("process_variants")
        .select("*")
        .eq("process_id", processId)
        .order("frequency", { ascending: false });
      if (error || !data?.length) return [];

      const ids = data.map((v: any) => v.id);
      const { data: allSteps } = await supabase
        .from("variant_steps")
        .select("*")
        .in("variant_id", ids)
        .order("step_order");

      return data.map((v: any) => ({
        id: v.id,
        variant_label: v.variant_label || "",
        consultant_name: v.consultant_name || "",
        steps: (allSteps || [])
          .filter((s: any) => s.variant_id === v.id)
          .map((s: any) => ({
            step_name: s.step_name,
            step_order: s.step_order,
            is_skipped: s.is_skipped,
            is_extra: s.is_extra,
            is_reordered: s.is_reordered,
          })),
      }));
    },
    enabled: !!processId,
  });

  const { nodes, edges } = useMemo(() => buildComparisonGraph(variants), [variants]);

  if (variants.length === 0) return null;

  const height = Math.max(400, 80 + Math.max(...variants.map((v) => v.steps.length)) * Y_SPACING + 40);

  return (
    <div className="space-y-2">
      <div style={{ height }} className="rounded-lg border bg-muted/20">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          className="bg-muted/10"
        >
          <Background color="hsl(var(--border))" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 px-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border-2 border-primary/30 bg-card inline-block" /> Standard
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border-2 border-red-400 bg-red-50 inline-block" /> Ignorée
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border-2 border-blue-400 bg-blue-50 inline-block" /> Extra
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border-2 border-orange-400 bg-orange-50 inline-block" /> Réordonnée
        </span>
      </div>
    </div>
  );
}
