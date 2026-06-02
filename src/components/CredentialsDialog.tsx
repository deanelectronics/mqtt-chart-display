import { useState } from "react";
import { setCredentials, clearCredentials, hasCredentials } from "@/lib/mqtt-client";

export function CredentialsDialog({
  onClose,
  authFailed,
}: {
  onClose: () => void;
  authFailed?: boolean;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username) return;
    setCredentials(username, password);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md border border-border bg-card p-6"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="h-6 w-1 bg-primary" />
          <h2 className="font-mono text-sm uppercase tracking-widest text-foreground">
            MQTT-inloggning
          </h2>
        </div>

        {authFailed && (
          <div className="mb-4 border border-destructive/50 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
            Anslutningen avvisades — fel användarnamn eller lösenord.
          </div>
        )}

        <p className="mb-4 font-mono text-xs text-muted-foreground">
          Anonyma anslutningar används som standard. Fyll bara i om brokern
          kräver autentisering.
        </p>

        <label className="mb-3 block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Användarnamn
          </span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            className="w-full border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Lösenord
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
          />
        </label>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              clearCredentials();
              onClose();
            }}
            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive"
            disabled={!hasCredentials()}
          >
            Glöm sparade
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-border bg-background px-4 py-2 font-mono text-xs uppercase text-muted-foreground hover:text-foreground"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="border border-primary bg-primary px-4 py-2 font-mono text-xs uppercase text-primary-foreground hover:opacity-90"
            >
              Anslut
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
