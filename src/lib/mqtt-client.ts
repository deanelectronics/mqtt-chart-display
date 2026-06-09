import type { MqttClient } from "mqtt";
import { useSyncExternalStore } from "react";
import { ingest, loadFromStorage } from "./topic-store";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error"
  | "offline";

const CREDS_KEY = "yrgo-iot-credentials";

type Creds = { username: string; password: string } | null;

let client: MqttClient | null = null;
let starting = false;
let status: ConnectionStatus = "idle";
let lastError: string | null = null;
let authFailed = false;
let brokerUrl: string | null = null;
let creds: Creds = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setStatus(s: ConnectionStatus, err: string | null = null) {
  status = s;
  lastError = err;
  emit();
}

function isAuthError(msg: string | null | undefined): boolean {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes("not authorized") ||
    m.includes("bad user") ||
    m.includes("bad username") ||
    m.includes("unauthorized") ||
    m.includes("connection refused: 4") ||
    m.includes("connection refused: 5")
  );
}

function loadCreds(): Creds {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.username === "string") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export async function startMqtt() {
  if (typeof window === "undefined" || client || starting) return;
  starting = true;
  loadFromStorage();
  creds = loadCreds();
  const host = window.location.hostname || "localhost";
  brokerUrl = `ws://${host}:9001`;
  authFailed = false;
  setStatus("connecting");
  try {
    const mqttModule = await import("mqtt");
    const mqtt = mqttModule.default ?? mqttModule;
    if (client) return;
    client = mqtt.connect(brokerUrl, {
      reconnectPeriod: 3000,
      connectTimeout: 8000,
      clean: true,
      username: creds?.username,
      password: creds?.password,
    });
  } catch (e) {
    setStatus("error", e instanceof Error ? e.message : String(e));
    starting = false;
    return;
  }

  client.on("connect", () => {
    starting = false;
    authFailed = false;
    setStatus("connected");
    client?.subscribe("yrgo/iot/#", { qos: 0 }, (err) => {
      if (err) setStatus("error", err.message);
    });
  });

  client.on("reconnect", () => setStatus("reconnecting"));
  client.on("offline", () => {
    starting = false;
    setStatus("offline");
  });
  client.on("error", (err) => {
    starting = false;
    if (isAuthError(err.message)) {
      authFailed = true;
      // Stop the reconnect loop so we don't spam the broker with bad creds.
      try {
        client?.end(true);
      } catch {
        /* ignore */
      }
      client = null;
    }
    setStatus("error", err.message);
  });
  client.on("close", () => {
    starting = false;
    if (status === "connected") setStatus("reconnecting");
  });

  client.on("message", (topic, payload) => {
    ingest(topic, payload.toString());
  });
}

export function setCredentials(username: string, password: string) {
  try {
    localStorage.setItem(CREDS_KEY, JSON.stringify({ username, password }));
  } catch {
    /* ignore */
  }
  creds = { username, password };
  authFailed = false;
  if (client) {
    try {
      client.end(true);
    } catch {
      /* ignore */
    }
    client = null;
  }
  startMqtt();
}

export function clearCredentials() {
  try {
    localStorage.removeItem(CREDS_KEY);
  } catch {
    /* ignore */
  }
  creds = null;
  authFailed = false;
  if (client) {
    try {
      client.end(true);
    } catch {
      /* ignore */
    }
    client = null;
  }
  startMqtt();
}

export function hasCredentials(): boolean {
  return creds !== null;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getConn() {
  return { status, lastError, brokerUrl, authFailed };
}

const SERVER_SNAPSHOT = {
  status: "idle" as ConnectionStatus,
  lastError: null,
  brokerUrl: null,
  authFailed: false,
};

function getServer() {
  return SERVER_SNAPSHOT;
}

export function useConnection() {
  return useSyncExternalStore(subscribe, getConn, getServer);
}
