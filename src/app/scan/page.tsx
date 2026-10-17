"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AddOtherForm, AddedVisits, RegisterForm, ScanAnimation, VisitCard, type Visit } from "@/components/member";
import { Button, Card, Header, Shell, Spinner } from "@/components/ui";
import { ApiError, api } from "@/lib/client";

type ScanStatus = "in" | "out" | "already-in";
type Phase =
  | { kind: "scanning" }
  | { kind: "register" }
  | { kind: "error"; message: string }
  | { kind: "done"; status: ScanStatus; record: Visit };

export default function ScanPage() {
  const [phase, setPhase] = useState<Phase>({ kind: "scanning" });
  const [showActions, setShowActions] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [added, setAdded] = useState<Visit[]>([]);
  const scannedUrl = useRef<string | null>(null);

  async function scan() {
    setPhase({ kind: "scanning" });
    setShowActions(false);
    setShowOther(false);
    setAdded([]);
    try {
      const key = new URLSearchParams(location.search).get("k") ?? undefined;
      const res = await api<{ status: ScanStatus; record: Visit }>("/api/scan", { body: { k: key } });
      setPhase({ kind: "done", ...res });
      navigator.vibrate?.(res.status === "out" ? [60, 60, 60] : 120);
      setTimeout(() => setShowActions(true), 1400);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setPhase({ kind: "register" });
      else setPhase({ kind: "error", message: (e as Error).message });
    }
  }

  useEffect(() => {
    // Next.js keeps this page alive between visits and re-runs this effect when it is
    // shown again. Scan once per link (in-app scans add a unique `t`), so a new scan always
    // hits the server, while React's double effect run or the Back button doesn't re-scan.
    if (scannedUrl.current === location.search) return;
    scannedUrl.current = location.search;
    scan();
  }, []);

  const upsertAdded = (v: Visit) =>
    setAdded((list) => (list.some((a) => a.id === v.id) ? list.map((a) => (a.id === v.id ? v : a)) : [...list, v]));

  return (
    <Shell>
      <Header />

      {phase.kind === "scanning" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted">
          <Spinner className="size-10 text-accent" />
          <p>Marking your attendance…</p>
        </div>
      )}

      {phase.kind === "register" && <RegisterForm onDone={() => scan()} />}

      {phase.kind === "error" && (
        <Card className="flex flex-col items-center gap-4 text-center">
          <p className="text-danger">{phase.message}</p>
          <Button variant="secondary" onClick={() => scan()}>
            Try again
          </Button>
        </Card>
      )}

      {phase.kind === "done" && (
        <>
          <ScanAnimation status={phase.status} name={phase.record.name} />
          {showActions && (
            <div className="rise flex flex-col gap-4" style={{ animationDelay: "0s" }}>
              <VisitCard visit={phase.record} onChange={(record) => setPhase({ ...phase, record })} />
              <AddedVisits visits={added} onChange={upsertAdded} />
              {showOther ? (
                <AddOtherForm onAdded={upsertAdded} onCancel={() => setShowOther(false)} />
              ) : (
                <Button variant="secondary" onClick={() => setShowOther(true)}>
                  + Mark attendance for someone else
                </Button>
              )}
              <Link href="/" className="text-center text-sm text-muted underline-offset-4 hover:underline">
                Go to home
              </Link>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
