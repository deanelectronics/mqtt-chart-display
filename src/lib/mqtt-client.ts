import mqtt, { type MqttClient } from "mqtt";
import { useSyncExternalStore } from "react";
import { ingest, loadFromStorage } from "./topic-store";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error"
  | "offline";

let client: MqttClient | null = null;
let status: ConnectionStatus = "idle";
let lastError: string | null = null;
let brokerUrl: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setStatus(s: ConnectionStatus, err: string | null = null) {
  status = s;
  lastError = err;
  emit();
}

export function startMqtt() {
  if (typeof window === "undefined" || client) return;
  loadFromStorage();
  const host = window.location.hostname || "localhost";
  brokerUrl = `ws://${host}:9001`;
  setStatus("connecting");
  try {
    client = mqtt.connect(brokerUrl, {
      reconnectPeriod: 3000,
      connectTimeout: 8000,
      clean: true,
    });
  } catch (e) {
    setStatus("error", e instanceof Error ? e.message : String(e));
    return;
  }

  client.on("connect", () => {
    setStatus("connected");
    client?.subscribe("yrgo/iot/#", { qos: 0 }, (err) => {
      if (err) setStatus("error", err.message);
    });
  });

  client.on("reconnect", () => setStatus("reconnecting"));
  client.on("offline", () => setStatus("offline"));
  client.on("error", (err) => setStatus("error", err.message));
  client.on("close", () => {
    if (status === "connected") setStatus("reconnecting");
  });

  client.on("message", (topic, payload) => {
    ingest(topic, payload.toString());
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getConn() {
  return { status, lastError, brokerUrl };
}

function getServer() {
  return { status: "idle" as ConnectionStatus, lastError: null, brokerUrl: null };
}

export function useConnection() {
  return useSyncExternalStore(subscribe, getConn, getServer);
}
