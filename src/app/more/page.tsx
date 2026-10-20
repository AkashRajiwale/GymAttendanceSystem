"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { InstallApp } from "@/components/install-app";
import { AddOtherForm, AddedVisits, EarlierVisits, VisitCard, type Visit } from "@/components/member";
import { Button, Card, FullPageSpinner, Header, Shell } from "@/components/ui";
import { isInside, useMe } from "@/components/use-me";
import { api } from "@/lib/client";
import { fmtMonth } from "@/lib/time";

/** Everything that isn't the scan button: today's visits, people you marked, fees, logout. */
export default function MorePage() {
  const { me, setMe, fees, error, reload } = useMe();
  const [showOther, setShowOther] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (me && !me.member) router.replace("/");
  }, [me, router]);

  // Two taps instead of window.confirm(), which in-app browsers silently block.
  async function logout() {
    if (!confirmLogout) return setConfirmLogout(true);
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }

  const upsertAdded = (v: Visit) =>
    setMe(
      (m) =>
        m && {
          ...m,
          added: m.added?.some((a) => a.id === v.id) ? m.added.map((a) => (a.id === v.id ? v : a)) : [...(m.added ?? []), v],
        },
    );

  const home = (
    <Link href="/" className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium">
      ← Home
    </Link>
  );

  if (error) {
    return (
      <Shell>
        <Header right={home} />
        <Card className="text-danger">{error}</Card>
      </Shell>
    );
  }
  if (!me?.member) return <FullPageSpinner />;

  // Home only shows a small summary; the full controls for the latest visit live here while
  // anything is still allowed (check out, edit, delete). Once locked it joins the read-only list.
  const latest = me.mine;
  const editable = latest && (latest.canEditIn || latest.canSetOut || latest.canDelete) ? latest : null;
  const earlier = [...(me.earlier ?? []), ...(latest && !editable ? [latest] : [])];

  return (
    <Shell>
      <Header right={home} />

      <Link
        href="/fees"
        className={`flex items-center justify-between rounded-2xl border px-4 py-4 ${
          fees && !fees.paidThisMonth ? "border-out/40 bg-out/10" : "border-line bg-surface"
        }`}
      >
        <span>
          <span className="block font-semibold">My fees</span>
          <span className={`text-sm ${fees && !fees.paidThisMonth ? "text-out" : "text-muted"}`}>
            {!fees ? "…" : fees.paidThisMonth ? `${fmtMonth(fees.month)} paid ✓` : `${fmtMonth(fees.month)} due — tap to pay`}
          </span>
        </span>
        <span className="text-muted">→</span>
      </Link>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Today</h2>
        {!me.mine && <p className="text-sm text-muted">No attendance yet today.</p>}
        {editable && (
          <VisitCard
            key={editable.id}
            visit={editable}
            onChange={(v) => setMe({ ...me, mine: v })}
            onDelete={reload}
            title={isInside(me) ? "You're in the gym" : "Last visit"}
          />
        )}
      </section>
      <EarlierVisits visits={earlier} />

      <AddedVisits
        visits={me.added ?? []}
        onChange={upsertAdded}
        onDelete={(v) => setMe((m) => m && { ...m, added: m.added?.filter((a) => a.id !== v.id) })}
      />

      {showOther ? (
        <AddOtherForm onAdded={upsertAdded} onCancel={() => setShowOther(false)} />
      ) : (
        <Button variant="secondary" onClick={() => setShowOther(true)}>
          + Mark attendance for someone else
        </Button>
      )}

      <div className="mt-auto flex flex-col items-center gap-3 pt-6">
        <InstallApp />
        <Button variant={confirmLogout ? "danger" : "ghost"} onClick={logout} className="text-sm">
          {confirmLogout ? "Tap again to log out" : `Log out (${me.member.phone})`}
        </Button>
      </div>
    </Shell>
  );
}
