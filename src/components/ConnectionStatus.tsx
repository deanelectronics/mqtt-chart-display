import { useConnection } from "@/lib/mqtt-client";

const LABELS: Record<string, string> = {
  idle: "Inaktiv",
  connecting: "Ansluter…",
  connected: "Ansluten",
  reconnecting: "Återansluter…",
  offline: "Offline",
  error: "Fel",
};

export function ConnectionStatus() {
  const { status, lastError, brokerUrl } = useConnection();
  const ok = status === "connected";
  const warn = status === "connecting" || status === "reconnecting";
  const dotClass = ok
    ? "bg-success"
    : warn
      ? "bg-accent animate-pulse"
      : "bg-destructive";

  return (
    <div className="flex items-center gap-3 border border-border bg-card px-3 py-2 font-mono text-xs">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass}`} />
      <span className="uppercase tracking-wider text-foreground">
        {LABELS[status] ?? status}
      </span>
      {brokerUrl && (
        <span className="text-muted-foreground">{brokerUrl}</span>
      )}
      {lastError && (
        <span className="text-destructive">· {lastError}</span>
      )}
    </div>
  );
}
