import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AgentActivityLog, type AgentLogEntry } from "./AgentActivityLog";
import { Search } from "lucide-react";

interface AgentDiscoveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: AgentLogEntry[];
}

export function AgentDiscoveryModal({ open, onOpenChange, entries }: AgentDiscoveryModalProps) {
  const isDone = entries.some((e) => e.status === "done" && e.agent === "discoverer");
  const hasError = entries.some((e) => e.status === "error");

  return (
    <Dialog open={open} onOpenChange={isDone || hasError ? onOpenChange : undefined}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Search className="h-4 w-4 text-amber-600" />
            </div>
            Agent Discoverer
          </DialogTitle>
        </DialogHeader>
        <AgentActivityLog entries={entries} />
      </DialogContent>
    </Dialog>
  );
}
