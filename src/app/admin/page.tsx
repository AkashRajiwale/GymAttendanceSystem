"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AttendanceTab, FeesTab, MembersTab, QrTab } from "@/components/admin";
import { Button, Card, ErrorText, Field, FullPageSpinner, Header, Shell } from "@/components/ui";
import { api } from "@/lib/client";

const TABS = [
  { id: "attendance", label: "Attendance", Component: AttendanceTab },
  { id: "fees", label: "Fees", Component: FeesTab },
  { id: "members", label: "Members", Component: MembersTab },
  { id: "qr", label: "QR poster", Component: QrTab },
] as const;

export default function AdminPage() {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("attendance");

  useEffect(() => {
    api<{ admin: boolean }>("/api/admin/login").then((d) => setAdmin(d.admin), () => setAdmin(false));
  }, []);

  async function logout() {
    await api("/api/admin/login", { method: "DELETE" });
    setAdmin(false);
  }

  if (admin === null) return <FullPageSpinner />;
  if (!admin) {
    return (
      <Shell>
        <Header />
        <LoginForm onDone={() => setAdmin(true)} />
      </Shell>
    );
  }

  const Active = TABS.find((t) => t.id === tab)!.Component;
  return (
    <Shell wide>
      <div className="no-print">
        <Header
          right={
            <Button variant="ghost" className="text-sm" onClick={logout}>
              Log out
            </Button>
          }
        />
      </div>
      <nav className="no-print -mx-4 flex gap-1 overflow-x-auto px-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t.id ? "bg-accent text-accent-ink" : "bg-surface text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <Active />
    </Shell>
  );
}

function LoginForm({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/login", { body: { password } });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">Admin login</h1>
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={busy}>
          Log in
        </Button>
      </form>
    </Card>
  );
}
