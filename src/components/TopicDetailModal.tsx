import { useMemo, useState } from "react";
import type { TopicData } from "@/lib/topic-store";
import { TrendChart } from "./TrendChart";

const WINDOWS = [
  { label: "1 min", ms: 60_000 },
  { label: "5 min", ms: 5 * 60_000 },
  { label: "1 h", ms: 60 * 60_000 },
  { label: "Allt", ms: Infinity },
];

export function TopicDetailModal({
  data,
  onClose,
}: {
  data: TopicData;
  onClose: () => void;
}) {
  const [winIdx, setWinIdx] = useState(1);
  const win = WINDOWS[winIdx];

  const filtered = useMemo(() => {
    if (!Number.isFinite(win.ms)) return data.history;
    const cutoff = Date.now() - win.ms;
    return data.history.filter((p) => p.t >= cutoff);
  }, [data.history, win.ms]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    let min = Infinity,
      max = -Infinity,
      sum = 0;
    for (const p of filtered) {
      if (p.v < min) min = p.v;
      if (p.v > max) max = p.v;
      sum += p.v;
    }
    return { min, max, avg: sum / filtered.length, count: filtered.length };
  }, [filtered]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-4xl flex-col gap-4 border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Topic
            </div>
            <h2 className="mt-1 break-all font-mono text-lg text-foreground">
              {data.topic}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="border border-border bg-background px-3 py-1 font-mono text-xs uppercase hover:border-primary"
          >
            Stäng
          </button>
        </div>

        <div className="flex items-baseline gap-6">
          <div>
            <div className="font-mono text-xs uppercase text-muted-foreground">
              Senast
            </div>
            <div className="font-mono text-5xl font-semibold text-primary tabular-nums">
              {data.last}
            </div>
          </div>
          {stats && (
            <div className="grid grid-cols-3 gap-4 font-mono text-sm">
              <Stat label="Min" value={stats.min} />
              <Stat label="Medel" value={stats.avg} />
              <Stat label="Max" value={stats.max} />
            </div>
          )}
        </div>

        <div className="flex gap-1">
          {WINDOWS.map((w, i) => (
            <button
              key={w.label}
              onClick={() => setWinIdx(i)}
              className={`border px-3 py-1 font-mono text-xs uppercase ${
                i === winIdx
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="border border-border bg-background p-2">
          {filtered.length > 1 ? (
            <TrendChart points={filtered} height={360} showAxes />
          ) : (
            <div className="flex h-[360px] items-center justify-center font-mono text-sm text-muted-foreground">
              Inga datapunkter i valt tidsfönster
            </div>
          )}
        </div>

        <div className="font-mono text-xs text-muted-foreground">
          {filtered.length} punkter · totalt {data.history.length} i minnet
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-foreground tabular-nums">
        {value.toFixed(2)}
      </div>
    </div>
  );
}
