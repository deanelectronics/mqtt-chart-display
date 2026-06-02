import { useSyncExternalStore } from "react";

export type Point = { t: number; v: number };
export type TopicData = {
  topic: string;
  last: number;
  lastTs: number;
  history: Point[];
};

const MAX_POINTS = 500;
const STORAGE_KEY = "yrgo-iot-history-v1";
const PERSIST_DEBOUNCE_MS = 5000;

type State = Map<string, TopicData>;

let state: State = new Map();
const listeners = new Set<() => void>();
let snapshot: TopicData[] = [];
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function recomputeSnapshot() {
  snapshot = Array.from(state.values()).sort((a, b) =>
    a.topic.localeCompare(b.topic),
  );
}

function emit() {
  recomputeSnapshot();
  for (const l of listeners) l();
  schedulePersist();
}

function schedulePersist() {
  if (typeof window === "undefined") return;
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      const obj: Record<string, Point[]> = {};
      for (const [topic, data] of state) obj[topic] = data.history;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // quota — ignore
    }
  }, PERSIST_DEBOUNCE_MS);
}

export function loadFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, Point[]>;
    for (const [topic, history] of Object.entries(obj)) {
      if (!Array.isArray(history) || history.length === 0) continue;
      const last = history[history.length - 1];
      state.set(topic, {
        topic,
        last: last.v,
        lastTs: last.t,
        history: history.slice(-MAX_POINTS),
      });
    }
    recomputeSnapshot();
    for (const l of listeners) l();
  } catch {
    // ignore
  }
}

export function ingest(topic: string, rawPayload: string) {
  const v = Number(rawPayload);
  if (!Number.isFinite(v)) return; // skip non-numeric
  const t = Date.now();
  const existing = state.get(topic);
  const history = existing ? existing.history.slice() : [];
  history.push({ t, v });
  if (history.length > MAX_POINTS) history.splice(0, history.length - MAX_POINTS);
  state.set(topic, { topic, last: v, lastTs: t, history });
  emit();
}

export function clearAll() {
  state = new Map();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot(): TopicData[] {
  return [];
}

export function useTopics(): TopicData[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getTopic(topic: string): TopicData | undefined {
  return state.get(topic);
}
