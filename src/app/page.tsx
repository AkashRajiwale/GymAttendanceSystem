"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RegisterForm } from "@/components/member";
import { InstallApp } from "@/components/install-app";
import { QrScanner } from "@/components/qr-scanner";
import { Button, Card, FullPageSpinner, Header, Shell } from "@/components/ui";
import { isInside, useMe } from "@/components/use-me";
import { fmtDate, fmtDuration, fmtTime, istToMs } from "@/lib/time";

/** Home is just the scan button, plus the visit in progress. Everything else is in /more. */
export default function Home() {
  const { me, fees, error, reload } = useMe();
  const [scanning, setScanning] = useState(false);

  if (error) {
    return (
      <Shell>
        <Header />
        <Card className="text-center">
          <p className="text-danger">{error}</p>
          <Button className="mt-4" variant="secondary" onClick={reload}>
            Retry
          </Button>
        </Card>
      </Shell>
    );
  }
  if (!me) return <FullPageSpinner />;

  if (!me.member) {
    return (
      <Shell>
        <Header />
        <RegisterForm onDone={reload} />
      </Shell>
    );
  }

  const inside = isInside(me);
  const feeDue = fees && !fees.paidThisMonth;

  return (
    <Shell>
      <Header
        right={
          <Link href="/more" className="relative rounded-lg border border-line px-3 py-1.5 text-sm font-medium">
            Menu
            {feeDue && (
              <span className="absolute -right-1 -top-1 size-3 rounded-full bg-out ring-2 ring-background" aria-label="Fee due" />
            )}
          </Link>
        }
      />

      <div className="text-center">
        <p className="text-sm text-muted">{fmtDate(me.date!)}</p>
        <h1 className="text-xl font-bold">Hi, {me.member.name.split(" ")[0]} 👋</h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6">
        <button
          onClick={() => setScanning(true)}
          className={`relative grid size-56 place-items-center rounded-full font-bold text-accent-ink shadow-2xl transition active:scale-95 ${
            inside ? "bg-out" : "bg-accent"
          }`}
        >
          {!inside && <span className="pulse-ring absolute inset-0 rounded-full" style={{ boxShadow: "0 0 0 3px var(--accent)" }} />}
          <span className="flex flex-col items-center gap-2">
            <svg viewBox="0 0 24 24" className="size-16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" />
            </svg>
            <span className="text-xl">{inside ? "Scan to check out" : "Scan to check in"}</span>
          </span>
        </button>
        <p className="text-sm text-muted">
          {inside ? "Scan the gym QR when you leave" : "Scan the QR poster at the entrance"}
        </p>
      </div>

      {inside && me.mine && <ActiveLine inTime={me.mine.inTime} date={me.mine.date} />}

      <InstallApp />

      {scanning && <QrScanner intent={inside ? "out" : undefined} onClose={() => setScanning(false)} />}
    </Shell>
  );
}

/** One small line under the button while inside: in time, time spent so far, and a link to edit. */
function ActiveLine({ inTime, date }: { inTime: string; date: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const mins = Math.max(0, Math.floor((now - istToMs(date, inTime)) / 60_000));

  return (
    <div className="flex items-center justify-center gap-3 rounded-full border border-line bg-surface px-4 py-2 text-sm">
      <span className="text-muted">
        In <span className="font-mono font-semibold text-accent">{fmtTime(inTime)}</span>
      </span>
      <span className="text-line">|</span>
      <span className="font-mono font-semibold">{fmtDuration(mins)}</span>
      <span className="text-line">|</span>
      <Link href="/more" className="text-muted underline-offset-4 hover:text-foreground hover:underline">
        Edit
      </Link>
    </div>
  );
}
