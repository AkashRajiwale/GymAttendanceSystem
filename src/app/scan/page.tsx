"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RegisterForm, ScanAnimation, VisitCard, type Visit } from "@/components/member";
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
  const scannedUrl = useRef<string | null>(null);
  const router = useRouter();

  async function scan() {
    setPhase({ kind: "scanning" });
    setShowActions(false);
    try {
      const params = new URLSearchParams(location.search);
      const res = await api<{ status: ScanStatus; record: Visit }>("/api/scan", {
        body: { k: params.get("k") ?? undefined, intent: params.get("a") ?? undefined },
      });
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
              <VisitCard
                visit={phase.record}
                onChange={(record) => setPhase({ ...phase, record })}
                onDelete={() => router.push("/")}
              />
              <Button onClick={() => router.push("/")}>Done</Button>
              <Link href="/more" className="text-center text-sm text-muted underline-offset-4 hover:underline">
                Mark attendance for someone else
              </Link>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
