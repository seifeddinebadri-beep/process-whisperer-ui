import { AgentMessage, type AgentName, type AgentStatus } from "./AgentMessage";
import { cn } from "@/lib/utils";

export interface AgentLogEntry {
  id: string;
  agent: AgentName;
  status: AgentStatus;
  message: string;
  detail?: string;
  timestamp: Date;
}

interface AgentActivityLogProps {
  entries: AgentLogEntry[];
  className?: string;
}

export function AgentActivityLog({ entries, className }: AgentActivityLogProps) {
  if (entries.length === 0) return null;

  return (
    <div className={cn("space-y-0 divide-y divide-border/50", className)}>
      {entries.map((entry) => (
        <AgentMessage
          key={entry.id}
          agent={entry.agent}
          status={entry.status}
          message={entry.message}
          detail={entry.detail}
          timestamp={entry.timestamp}
        />
      ))}
    </div>
  );
}
