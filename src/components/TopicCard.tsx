import type { TopicData } from "@/lib/topic-store";
import { TrendChart } from "./TrendChart";

function formatValue(v: number) {
  if (Number.isInteger(v)) return v.toString();
  const abs = Math.abs(v);
  if (abs >= 1000) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 2) return "nu";
  if (s < 60) return `${s}s sedan`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m sedan`;
  const h = Math.floor(m / 60);
  return `${h}h sedan`;
}

export function TopicCard({
  data,
  onOpen,
}: {
  data: TopicData;
  onOpen: () => void;
}) {
  const recent = data.history.slice(-60);
  const shortTopic = data.topic.replace(/^yrgo\/iot\//, "");
  return (
    <button
      onClick={onOpen}
      className="group flex flex-col gap-3 border border-border bg-card p-4 text-left transition-colors hover:border-primary"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div
            className="truncate font-mono text-xs uppercase tracking-wider text-muted-foreground"
            title={data.topic}
          >
            {shortTopic || data.topic}
          </div>
        </div>
        <div className="font-mono text-[10px] uppercase text-muted-foreground">
          {timeAgo(data.lastTs)}
        </div>
      </div>

      <div className="font-mono text-4xl font-semibold text-primary tabular-nums">
        {formatValue(data.last)}
      </div>

      <div className="-mx-1 h-[60px]">
        <TrendChart points={recent} height={60} />
      </div>
    </button>
  );
}
