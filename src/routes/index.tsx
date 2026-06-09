import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { startMqtt, useConnection } from "@/lib/mqtt-client";
import { useTopics, clearAll } from "@/lib/topic-store";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { TopicCard } from "@/components/TopicCard";
import { TopicDetailModal } from "@/components/TopicDetailModal";
import { CredentialsDialog } from "@/components/CredentialsDialog";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Yrgo IoT Dashboard" },
      {
        name: "description",
        content:
          "Live MQTT dashboard for yrgo/iot/# topics with trend charts.",
      },
      { property: "og:title", content: "Yrgo IoT Dashboard" },
      {
        property: "og:description",
        content: "Realtidsövervakning av MQTT-topics med trendgrafer.",
      },
    ],
  }),
  component: Dashboard,
});

export function Dashboard() {
  const topics = useTopics();
  const { authFailed } = useConnection();
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const [showCreds, setShowCreds] = useState(false);
  const autoOpenedRef = useRef(false);
  const [, force] = useState(0);

  useEffect(() => {
    startMqtt();
  }, []);

  // Auto-open credentials dialog the first time auth fails
  useEffect(() => {
    if (authFailed && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setShowCreds(true);
    }
    if (!authFailed) autoOpenedRef.current = false;
  }, [authFailed]);

  // Tick every second so "X sedan" updates
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const openData = openTopic ? topics.find((t) => t.topic === openTopic) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-primary" />
            <div>
              <h1 className="font-mono text-lg font-semibold uppercase tracking-widest text-foreground">
                Yrgo · IoT
              </h1>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Subscribed: yrgo/iot/#
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionStatus />
            <button
              onClick={() => setShowCreds(true)}
              className="border border-border bg-background px-3 py-2 font-mono text-xs uppercase text-muted-foreground hover:border-primary hover:text-primary"
            >
              Inloggning
            </button>
            <button
              onClick={() => {
                if (confirm("Rensa all historik?")) clearAll();
              }}
              className="border border-border bg-background px-3 py-2 font-mono text-xs uppercase text-muted-foreground hover:border-destructive hover:text-destructive"
            >
              Rensa
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {topics.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 border border-dashed border-border bg-card/50 p-12 text-center">
            <div className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
              Väntar på meddelanden
            </div>
            <div className="max-w-md font-mono text-xs text-muted-foreground">
              Inga topics under <span className="text-primary">yrgo/iot/#</span>{" "}
              har tagits emot ännu. Kontrollera att Mosquitto kör med WebSocket
              på port 9001 och att enheter publicerar numeriska värden.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {topics.map((t) => (
              <TopicCard
                key={t.topic}
                data={t}
                onOpen={() => setOpenTopic(t.topic)}
              />
            ))}
          </div>
        )}
      </main>

      {openData && (
        <TopicDetailModal data={openData} onClose={() => setOpenTopic(null)} />
      )}

      {showCreds && (
        <CredentialsDialog
          authFailed={authFailed}
          onClose={() => setShowCreds(false)}
        />
      )}
    </div>
  );
}
