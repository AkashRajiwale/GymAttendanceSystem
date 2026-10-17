"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AddOtherForm,
  AddedVisits,
  EarlierVisits,
  RegisterForm,
  VisitCard,
  type MemberInfo,
  type Visit,
} from "@/components/member";
import { QrScanner } from "@/components/qr-scanner";
import { Button, Card, FullPageSpinner, Header, Shell } from "@/components/ui";
import { api } from "@/lib/client";
import { fmtDate, fmtMonth } from "@/lib/time";

type Me = { member: MemberInfo | null; date?: string; mine?: Visit | null; earlier?: Visit[]; added?: Visit[] };
type Fees = { month: string; paidThisMonth: boolean };

export default function Home() {
  const [me, setMe] = useState<Me | null>(null);
  const [fees, setFees] = useState<Fees | null>(null);
  const [showOther, setShowOther] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api<Me>("/api/me").then(
      (data) => {
        setMe(data);
        if (data.member) api<Fees>("/api/fees").then(setFees, () => {});
      },
      (e) => setError(e.message),
    );
  }

  useEffect(() => {
    // Runs on first load and again whenever Next.js shows this kept-alive page again.
    load();
    // Also refresh when the member switches back to the app, so the lists stay current.
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  async function logout() {
    if (!confirm("Log out from this phone?")) return;
    await api("/api/auth/logout", { method: "POST" });
    setMe({ member: null });
    setFees(null);
  }

  const replaceAdded = (v: Visit) =>
    setMe((m) => m && { ...m, added: m.added?.some((a) => a.id === v.id) ? m.added.map((a) => (a.id === v.id ? v : a)) : [...(m.added ?? []), v] });

  if (error) {
    return (
      <Shell>
        <Header />
        <Card className="text-center">
          <p className="text-danger">{error}</p>
          <Button className="mt-4" variant="secondary" onClick={() => location.reload()}>
            Retry
          </Button>
        </Card>
      </Shell>
    );
  }
  if (!me) return <FullPageSpinner />;
  // An open visit the member can still close (a forgotten morning visit doesn't count).
  const inside = !!me.mine && !me.mine.outTime && me.mine.canSetOut;

  if (!me.member) {
    return (
      <Shell>
        <Header />
        <RegisterForm onDone={() => load()} />
      </Shell>
    );
  }

  return (
    <Shell>
      <Header
        right={
          <Link href="/fees" className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium">
            My fees
          </Link>
        }
      />

      <div>
        <p className="text-muted">{fmtDate(me.date!)}</p>
        <h1 className="text-2xl font-bold">Hi, {me.member.name.split(" ")[0]} 👋</h1>
      </div>

      {fees && !fees.paidThisMonth && (
        <Link href="/fees" className="flex items-center justify-between rounded-2xl border border-out/40 bg-out/10 px-4 py-3">
          <span>
            <span className="block font-semibold text-out">Fee due for {fmtMonth(fees.month)}</span>
            <span className="text-sm text-muted">Tap to pay with UPI</span>
          </span>
          <span className="text-out">→</span>
        </Link>
      )}

      {me.mine ? (
        <VisitCard visit={me.mine} onChange={(v) => setMe({ ...me, mine: v })} title="Today's attendance" />
      ) : (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <ScanIcon />
          <p className="text-lg font-semibold">Not checked in yet today</p>
          <p className="text-sm text-muted">Scan the QR code at the gym entrance to mark your attendance.</p>
        </Card>
      )}

      {/* Always available, so a member can come back for a second visit the same day. */}
      <Button variant={inside ? "out" : "primary"} className="py-4 text-lg" onClick={() => setScanning(true)}>
        <ScanIcon small /> {inside ? "Scan QR to check out" : me.mine ? "Scan QR to check in again" : "Scan QR to check in"}
      </Button>
      {scanning && <QrScanner onClose={() => setScanning(false)} />}

      <EarlierVisits visits={me.earlier ?? []} />

      <AddedVisits visits={me.added ?? []} onChange={replaceAdded} />

      {showOther ? (
        <AddOtherForm onAdded={replaceAdded} onCancel={() => setShowOther(false)} />
      ) : (
        <Button variant="secondary" onClick={() => setShowOther(true)}>
          + Mark attendance for someone else
        </Button>
      )}

      <div className="mt-auto flex justify-center pt-6">
        <Button variant="ghost" onClick={logout} className="text-sm">
          Log out ({me.member.phone})
        </Button>
      </div>
    </Shell>
  );
}

function ScanIcon({ small }: { small?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={small ? "size-6" : "size-12 text-accent"} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" />
    </svg>
  );
}
