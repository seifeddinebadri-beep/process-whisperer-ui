import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Edit2, Trash2, ImageIcon, ChevronRight, Monitor, Plus, Upload, X, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import type { ProcessStep, StepSource, StepAction } from "./types";

interface StepCardProps {
  step: ProcessStep;
  index: number;
  total: number;
  onEdit: (step: ProcessStep) => void;
  onDelete: (stepId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  hideActions?: boolean;
  screenshotUrl?: string;
  onScreenshotPageClick?: (page: number) => void;
  onUpdateAction?: (action: StepAction) => void;
  onDeleteAction?: (actionId: string) => void;
  onAddAction?: (stepId: string) => void;
  onUploadStepScreenshot?: (stepId: string, file: File) => void;
  onDeleteStepScreenshot?: (stepId: string) => void;
  onUploadActionScreenshot?: (actionId: string, file: File) => void;
  onDeleteActionScreenshot?: (actionId: string) => void;
  onReorderActions?: (stepId: string, actionIds: string[]) => void;
}

const decisionLabels: Record<string, string> = {
  manual_judgment: "Manual Judgment",
  rule_based: "Rule-Based",
  no_decision: "No Decision",
};

const sourceConfig: Record<StepSource, { label: string; className: string }> = {
  event_log: { label: "Event Log", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  knowledge_base: { label: "KB", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  manual: { label: "Manual", className: "bg-muted text-muted-foreground" },
  merged: { label: "Merged", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
};

export const StepCard = ({
  step, index, total, onEdit, onDelete, onMoveUp, onMoveDown, hideActions, screenshotUrl,
  onScreenshotPageClick, onUpdateAction, onDeleteAction, onAddAction,
  onUploadStepScreenshot, onDeleteStepScreenshot, onUploadActionScreenshot, onDeleteActionScreenshot,
  onReorderActions
}: StepCardProps) => {
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(true);
  const stepFileRef = useRef<HTMLInputElement>(null);
  const imgUrl = screenshotUrl || step.screenshotUrl;
  const actions = step.actions || [];

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const actionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleActionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = actions.findIndex(a => a.id === active.id);
    const newIdx = actions.findIndex(a => a.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(actions, oldIdx, newIdx);
    onReorderActions?.(step.id, reordered.map(a => a.id));
  };

  return (
    <>
      <div ref={setNodeRef} style={style}>
        <Card className="border-l-4 border-l-primary/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-1 flex-1 min-w-0">
                {/* Drag handle for step */}
                <button
                  {...attributes}
                  {...listeners}
                  className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 touch-none"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <span className="font-mono text-xs text-muted-foreground mt-1 w-6 shrink-0">{index + 1}.</span>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm">{step.name}</div>
                    {actions.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {actions.length} action{actions.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                    {imgUrl && (
                      <button
                        onClick={() => setShowScreenshot(true)}
                        className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                      >
                        <ImageIcon className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>

                  {/* Step screenshot with upload/delete */}
                  <div className="flex items-center gap-2 mt-1">
                    {imgUrl && (
                      <div className="relative group">
                        <div
                          className="cursor-pointer rounded overflow-hidden border w-24 h-16 bg-muted/30 hover:ring-2 hover:ring-primary/40 transition-all"
                          onClick={() => setShowScreenshot(true)}
                        >
                          <img src={imgUrl} alt="Screenshot" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        {onDeleteStepScreenshot && (
                          <button
                            onClick={() => onDeleteStepScreenshot(step.id)}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                    {onUploadStepScreenshot && (
                      <>
                        <input
                          ref={stepFileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onUploadStepScreenshot(step.id, f);
                            e.target.value = "";
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => stepFileRef.current?.click()}
                          title="Upload screenshot"
                        >
                          <Upload className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {step.source && step.source !== "manual" && sourceConfig[step.source as StepSource] && (
                      <Badge className={`text-[10px] border-0 ${sourceConfig[step.source as StepSource].className}`}>
                        {sourceConfig[step.source as StepSource].label}
                      </Badge>
                    )}
                    {step.role && <Badge variant="secondary" className="text-[10px]">{step.role}</Badge>}
                    {step.toolUsed && <Badge variant="outline" className="text-[10px]">{step.toolUsed}</Badge>}
                    {step.decisionType && (
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                        {decisionLabels[step.decisionType]}
                      </Badge>
                    )}
                    {step.frequency && <Badge variant="outline" className="text-[10px]">{step.frequency}</Badge>}
                  </div>
                  {step.painPoints && (
                    <p className="text-[11px] text-destructive/80 mt-1">⚠ {step.painPoints}</p>
                  )}
                  {step.businessRules && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">📋 {step.businessRules}</p>
                  )}

                  {/* Collapsible Actions with DnD */}
                  {actions.length > 0 && (
                    <Collapsible open={actionsOpen} onOpenChange={setActionsOpen}>
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-primary/5 hover:bg-primary/10 border border-primary/15 transition-colors">
                          <ChevronRight className={`h-3 w-3 text-primary transition-transform ${actionsOpen ? "rotate-90" : ""}`} />
                          <span className="text-[11px] font-semibold text-primary">{actions.length}</span>
                          <span className="text-[11px] font-medium text-foreground/80">action{actions.length > 1 ? "s" : ""}</span>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2 ml-1 space-y-1.5 border-l-2 border-primary/20 pl-3 py-1.5 bg-muted/30 rounded-r-md">
                          <DndContext sensors={actionSensors} collisionDetection={closestCenter} onDragEnd={handleActionDragEnd}>
                            <SortableContext items={actions.map(a => a.id)} strategy={verticalListSortingStrategy}>
                              {actions.map((action, aIdx) => (
                                <SortableActionItem
                                  key={action.id || aIdx}
                                  action={action}
                                  index={aIdx}
                                  onScreenshotPageClick={onScreenshotPageClick}
                                  onUpdate={onUpdateAction}
                                  onDelete={onDeleteAction}
                                  onUploadScreenshot={onUploadActionScreenshot}
                                  onDeleteScreenshot={onDeleteActionScreenshot}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                          {onAddAction && (
                            <button
                              onClick={() => onAddAction(step.id)}
                              className="flex items-center gap-1 text-[10px] text-primary hover:underline mt-1 ml-4"
                            >
                              <Plus className="h-3 w-3" /> Ajouter une action
                            </button>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                  {actions.length === 0 && onAddAction && (
                    <button
                      onClick={() => onAddAction(step.id)}
                      className="flex items-center gap-1 text-[10px] text-primary hover:underline mt-2"
                    >
                      <Plus className="h-3 w-3" /> Ajouter une action
                    </button>
                  )}
                </div>
              </div>
              {!hideActions && (
                <div className="flex flex-col gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(step)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(step.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full-size screenshot modal */}
      <Dialog open={showScreenshot} onOpenChange={setShowScreenshot}>
        <DialogContent className="max-w-4xl p-2">
          {imgUrl && <img src={imgUrl} alt="Screenshot" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </>
  );
};

const SortableActionItem = (props: {
  action: StepAction;
  index: number;
  onScreenshotPageClick?: (page: number) => void;
  onUpdate?: (action: StepAction) => void;
  onDelete?: (actionId: string) => void;
  onUploadScreenshot?: (actionId: string, file: File) => void;
  onDeleteScreenshot?: (actionId: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.action.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ActionItem {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
};

const ActionItem = ({
  action, index, onScreenshotPageClick, onUpdate, onDelete, onUploadScreenshot, onDeleteScreenshot, dragHandleProps
}: {
  action: StepAction;
  index: number;
  onScreenshotPageClick?: (page: number) => void;
  onUpdate?: (action: StepAction) => void;
  onDelete?: (actionId: string) => void;
  onUploadScreenshot?: (actionId: string, file: File) => void;
  onDeleteScreenshot?: (actionId: string) => void;
  dragHandleProps?: Record<string, any>;
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(action.description);
  const [showImg, setShowImg] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = () => {
    if (editValue.trim() && editValue !== action.description && onUpdate) {
      onUpdate({ ...action, description: editValue.trim() });
    }
    setEditing(false);
  };

  return (
    <>
      <div className="flex items-start gap-1 text-[11px] group">
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground shrink-0 touch-none"
          >
            <GripVertical className="h-3 w-3" />
          </button>
        )}
        <span className="font-mono text-muted-foreground mt-0.5 w-4 shrink-0">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
              className="h-6 text-[11px] px-1.5 py-0"
              autoFocus
            />
          ) : (
            <span
              className={`text-foreground ${onUpdate ? "cursor-pointer hover:bg-primary/5 rounded px-0.5 -mx-0.5" : ""}`}
              onClick={() => { if (onUpdate) { setEditValue(action.description); setEditing(true); } }}
            >
              {action.description}
            </span>
          )}
          <div className="flex items-center gap-1.5 mt-0.5">
            {action.systemUsed && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                <Monitor className="h-2.5 w-2.5 mr-0.5" />
                {action.systemUsed}
              </Badge>
            )}
            {action.screenshotPage != null && (
              <button
                onClick={() => onScreenshotPageClick?.(action.screenshotPage!)}
                className="flex items-center gap-0.5 text-[9px] text-primary hover:underline"
              >
                <ImageIcon className="h-2.5 w-2.5" />
                p.{action.screenshotPage}
              </button>
            )}
            {action.screenshotUrl && (
              <div className="relative group/img">
                <div
                  className="cursor-pointer rounded overflow-hidden border w-12 h-8 bg-muted/30 hover:ring-1 hover:ring-primary/40"
                  onClick={() => setShowImg(true)}
                >
                  <img src={action.screenshotUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
                {onDeleteScreenshot && (
                  <button
                    onClick={() => onDeleteScreenshot(action.id)}
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            )}
            {onUploadScreenshot && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadScreenshot(action.id, f);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-[9px] text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Upload screenshot"
                >
                  <Upload className="h-2.5 w-2.5" />
                </button>
              </>
            )}
          </div>
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(action.id)}
            className="text-destructive/60 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
            title="Supprimer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      <Dialog open={showImg} onOpenChange={setShowImg}>
        <DialogContent className="max-w-3xl p-2">
          {action.screenshotUrl && <img src={action.screenshotUrl} alt="" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </>
  );
};
