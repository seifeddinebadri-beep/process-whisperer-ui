import { Bot, Brain, Search, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type AgentName = "analyst" | "clarifier" | "discoverer";
export type AgentStatus = "thinking" | "working" | "done" | "error";

interface AgentMessageProps {
  agent: AgentName;
  status: AgentStatus;
  message: string;
  detail?: string;
  timestamp?: Date;
  className?: string;
}

const agentConfig: Record<AgentName, { label: string; icon: typeof Bot; color: string; bgColor: string }> = {
  analyst: { label: "Analyst", icon: Brain, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  clarifier: { label: "Clarifier", icon: Bot, color: "text-violet-600", bgColor: "bg-violet-100 dark:bg-violet-900/30" },
  discoverer: { label: "Discoverer", icon: Search, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
};

const statusIcon: Record<AgentStatus, typeof Loader2> = {
  thinking: Loader2,
  working: Loader2,
  done: CheckCircle2,
  error: AlertCircle,
};

export function AgentMessage({ agent, status, message, detail, timestamp, className }: AgentMessageProps) {
  const config = agentConfig[agent];
  const StatusIcon = statusIcon[status];
  const isAnimating = status === "thinking" || status === "working";

  return (
    <div className={cn("flex gap-3 py-2", className)}>
      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0", config.bgColor)}>
        <config.icon className={cn("h-4 w-4", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-semibold", config.color)}>{config.label}</span>
          <StatusIcon className={cn(
            "h-3.5 w-3.5",
            status === "done" ? "text-green-600" : status === "error" ? "text-destructive" : "text-muted-foreground",
            isAnimating && "animate-spin"
          )} />
          {timestamp && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
        <p className="text-sm text-foreground mt-0.5">{message}</p>
        {detail && (
          <p className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded px-2 py-1">{detail}</p>
        )}
      </div>
    </div>
  );
}
