"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Attendance } from "@/lib/db";
import { api, nowTime } from "@/lib/client";
import { fmtTime, fmtDuration, durationMinutes } from "@/lib/time";
import { QrScanner } from "./qr-scanner";
import { Button, Card, ErrorText, Field } from "./ui";

export type Visit = Attendance & { canEditIn: boolean; canSetOut: boolean; canDelete: boolean };
export type MemberInfo = { phone: string; name: string };

// ---------------------------------------------------------------- Registration

export function RegisterForm({ onDone }: { onDone: (m: MemberInfo) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { member } = await api<{ member: MemberInfo }>("/api/auth/register", { body: { name, phone } });
      onDone(member);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold">Welcome! One-time sign up</h1>
          <p className="mt-1 text-sm text-muted">You&apos;ll stay logged in on this phone. Next time, just scan the QR.</p>
        </div>
        <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        <Field
          label="Mobile number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="numeric"
          autoComplete="tel"
          placeholder="10-digit number"
          required
        />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={loading}>
          Continue
        </Button>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------- Scan animation

export function ScanAnimation({ status, name }: { status: "in" | "out" | "already-in"; name: string }) {
  const isOut = status === "out";
  const color = isOut ? "var(--out)" : "var(--accent)";
  const first = name.split(" ")[0];
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="relative">
        <span className="pulse-ring absolute inset-0 rounded-full" style={{ boxShadow: `0 0 0 3px ${color}` }} />
        <svg viewBox="0 0 110 110" className="size-36">
          <circle className="draw-ring" cx="55" cy="55" r="48" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
          {isOut ? (
            <path className="draw-mark" d="M42 55h30m-11-12 12 12-12 12" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path className="draw-mark" d="M35 57l13 13 27-29" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </div>
      <div className="pop">
        <p className="text-3xl font-black tracking-tight" style={{ color }}>
          {status === "in" && "Checked in!"}
          {status === "out" && (
            <>
              See you soon <span className="wave inline-block">👋</span>
            </>
          )}
          {status === "already-in" && "Already checked in"}
        </p>
      </div>
      <p className="rise text-muted">
        {status === "in" && `Have a great workout, ${first} 💪`}
        {status === "out" && `Great session, ${first}!`}
        {status === "already-in" && `You checked in just now, ${first}. Scan again when you leave.`}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- Visit card (edit in / out)

export function VisitCard({
  visit,
  onChange,
  onDelete,
  title,
}: {
  visit: Visit;
  onChange: (v: Visit) => void;
  /** Shows a delete button (within 1 hour of check-in) when provided. */
  onDelete?: (v: Visit) => void;
  title?: string;
}) {
  const [editing, setEditing] = useState<"in" | "out" | null>(null);
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function patch(fields: { inTime?: string; outTime?: string }, key: string) {
    setError("");
    setLoading(key);
    try {
      const { record } = await api<{ record: Visit }>("/api/attendance", {
        method: "PATCH",
        body: { date: visit.date, id: visit.id, ...fields },
      });
      setEditing(null);
      onChange(record);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${visit.name}'s attendance from ${fmtTime(visit.inTime)}? This can't be undone.`)) return;
    setError("");
    setLoading("delete");
    try {
      await api("/api/attendance", { method: "DELETE", body: { date: visit.date, id: visit.id } });
      onDelete?.(visit);
    } catch (err) {
      setError((err as Error).message);
      setLoading(null);
    }
  }

  function startEdit(which: "in" | "out") {
    setEditing(which);
    setError("");
    setTime(which === "in" ? visit.inTime : visit.outTime || nowTime());
  }

  const open = !visit.outTime;
  return (
    <Card className="flex flex-col gap-4">
      {title && <p className="font-semibold">{title}</p>}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="In" value={fmtTime(visit.inTime)} accent="text-accent" />
        <Stat label="Out" value={fmtTime(visit.outTime)} accent="text-out" />
        <Stat label="Time" value={open ? "Active" : fmtDuration(durationMinutes(visit.inTime, visit.outTime))} />
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <Field
            label={editing === "in" ? "Correct in time (up to 1 hour earlier)" : "Out time (within 2 hours of now)"}
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant={editing === "in" ? "primary" : "out"}
              loading={loading === "save"}
              onClick={() => patch(editing === "in" ? { inTime: time } : { outTime: time }, "save")}
            >
              Save
            </Button>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {open && visit.canSetOut && (
            <Button variant="out" className="flex-1" loading={loading === "now"} onClick={() => patch({ outTime: "now" }, "now")}>
              Check out now
            </Button>
          )}
          {visit.canSetOut && (
            <Button variant="secondary" className="flex-1" onClick={() => startEdit("out")}>
              {open ? "Pick out time" : "Edit out time"}
            </Button>
          )}
          {visit.canEditIn && (
            <Button variant="secondary" className="flex-1" onClick={() => startEdit("in")}>
              Edit in time
            </Button>
          )}
        </div>
      )}
      {!editing && visit.canDelete && onDelete && (
        <Button variant="danger" className="self-center py-1.5 text-sm" loading={loading === "delete"} onClick={remove}>
          Delete this entry
        </Button>
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function Stat({ label, value, accent = "" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-2 py-3">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 font-mono text-lg font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------- Add for someone else

type PickMember = { ref: string; name: string; last4: string; inside: boolean };
let membersCache: PickMember[] | null = null;

/**
 * Pick a registered member (or enter someone new), then scan the gym QR for them.
 * The scan checks them in, or out if they are already in.
 */
export function AddOtherForm({ onAdded, onCancel }: { onAdded: (v: Visit) => void; onCancel: () => void }) {
  const [members, setMembers] = useState<PickMember[] | null>(membersCache);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<PickMember | "new" | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    api<{ members: PickMember[] }>("/api/members").then(
      (d) => setMembers((membersCache = d.members)),
      (e) => setError(e.message),
    );
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (members ?? []).filter((m) => !q || m.name.toLowerCase().includes(q) || m.last4.includes(q)).slice(0, 8);
  }, [members, query]);

  const ready = picked === "new" ? name.trim().length > 1 && phone.replace(/\D/g, "").length >= 10 : !!picked;
  const who = picked === "new" ? name.trim() : picked?.name;
  const checkingOut = !!picked && picked !== "new" && picked.inside;
  const first = who?.split(" ")[0];

  async function onScanned(k: string | undefined) {
    setScanning(false);
    setBusy(true);
    setError("");
    try {
      const target = picked === "new" ? { name, phone } : { ref: (picked as PickMember).ref };
      const { status, record } = await api<{ status: "in" | "out" | "already-in"; record: Visit }>(
        "/api/attendance/other",
        { body: { ...target, k, intent: checkingOut ? "out" : undefined } },
      );
      navigator.vibrate?.(120);
      setDone(
        status === "in"
          ? `${record.name} checked in at ${fmtTime(record.inTime)} ✓`
          : status === "out"
            ? `${record.name} checked out at ${fmtTime(record.outTime)} 👋`
            : `${record.name} was checked in just now`,
      );
      onAdded(record);
      setPicked(null);
      setQuery("");
      setName("");
      setPhone("");
      // Refresh the list so the "inside" badges match what just happened.
      api<{ members: PickMember[] }>("/api/members").then((d) => setMembers((membersCache = d.members)), () => {});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="font-semibold">Mark attendance for someone else</p>
        <p className="mt-1 text-sm text-muted">Pick the person, then scan the gym QR for them.</p>
      </div>

      {done && <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{done}</p>}

      {!picked && (
        <div className="flex flex-col gap-2">
          <input
            placeholder="Search member name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-accent"
          />
          <div className="flex max-h-72 flex-col overflow-y-auto rounded-xl border border-line">
            {!members && !error && <p className="p-3 text-sm text-muted">Loading members…</p>}
            {members && matches.length === 0 && <p className="p-3 text-sm text-muted">No member found</p>}
            {matches.map((m) => (
              <button
                key={m.ref}
                onClick={() => {
                  setPicked(m);
                  setDone("");
                }}
                className="flex items-center justify-between border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-surface-2"
              >
                <span className="font-medium">
                  {m.name}
                  {m.inside && <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-xs text-accent">inside</span>}
                </span>
                <span className="font-mono text-xs text-muted">••{m.last4}</span>
              </button>
            ))}
          </div>
          <Button variant="ghost" className="justify-start px-1 text-sm" onClick={() => setPicked("new")}>
            + Someone new (not registered yet)
          </Button>
        </div>
      )}

      {picked && picked !== "new" && (
        <div className="flex items-center justify-between rounded-xl border border-accent/40 bg-accent/5 px-4 py-3">
          <span>
            <span className="font-semibold">{picked.name}</span>{" "}
            <span className="font-mono text-xs text-muted">••{picked.last4}</span>
            {picked.inside && <span className="ml-2 text-xs text-accent">inside now</span>}
          </span>
          <Button variant="ghost" className="px-2 py-1 text-sm" onClick={() => setPicked(null)}>
            Change
          </Button>
        </div>
      )}

      {picked === "new" && (
        <div className="flex flex-col gap-3">
          <Field label="Their name" value={name} onChange={(e) => setName(e.target.value)} />
          <Field label="Their mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" />
          <Button variant="ghost" className="justify-start px-1 text-sm" onClick={() => setPicked(null)}>
            ← Pick from member list instead
          </Button>
        </div>
      )}

      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button
          variant={checkingOut ? "out" : "primary"}
          className="flex-1"
          disabled={!ready}
          loading={busy}
          onClick={() => setScanning(true)}
        >
          {!first ? "Scan QR to mark attendance" : checkingOut ? `Scan QR to check out ${first}` : `Scan QR to check in ${first}`}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Close
        </Button>
      </div>

      {scanning && (
        <QrScanner
          title={`Scan the gym QR to check ${checkingOut ? "out" : "in"} ${who}`}
          onResult={onScanned}
          onClose={() => setScanning(false)}
        />
      )}
    </Card>
  );
}

/** Earlier visits today (e.g. a morning session), read-only. */
export function EarlierVisits({ visits }: { visits: Visit[] }) {
  if (!visits.length) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Earlier today</h2>
      {visits.map((v) => (
        <div key={v.id} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 font-mono text-sm">
          <span>
            <span className="text-accent">{fmtTime(v.inTime)}</span> → <span className="text-out">{fmtTime(v.outTime)}</span>
          </span>
          <span className="text-muted">{v.outTime ? fmtDuration(durationMinutes(v.inTime, v.outTime)) : "no out time"}</span>
        </div>
      ))}
    </section>
  );
}

/**
 * People this member marked today. Whoever marked someone in can check them out,
 * since that person usually has no phone for leaving either.
 */
export function AddedVisits({
  visits,
  onChange,
  onDelete,
}: {
  visits: Visit[];
  onChange: (v: Visit) => void;
  onDelete: (v: Visit) => void;
}) {
  if (!visits.length) return null;
  const inside = visits.filter((v) => !v.outTime).length;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
        People you marked today{inside > 0 && <span className="ml-2 normal-case text-accent">{inside} still inside</span>}
      </h2>
      {visits.map((v) => (
        <AddedRow key={v.id} visit={v} onChange={onChange} onDelete={onDelete} />
      ))}
    </section>
  );
}

function AddedRow({
  visit,
  onChange,
  onDelete,
}: {
  visit: Visit;
  onChange: (v: Visit) => void;
  onDelete: (v: Visit) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const open = !visit.outTime;

  async function checkOut() {
    setBusy(true);
    setError("");
    try {
      const { record } = await api<{ record: Visit }>("/api/attendance", {
        method: "PATCH",
        body: { date: visit.date, id: visit.id, outTime: "now" },
      });
      navigator.vibrate?.([60, 60, 60]);
      onChange(record);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <VisitCard
          visit={visit}
          title={visit.name}
          onChange={(v) => {
            onChange(v);
            setEditing(false);
          }}
          onDelete={onDelete}
        />
        <Button variant="ghost" className="text-sm" onClick={() => setEditing(false)}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 rounded-xl border bg-surface px-4 py-3 ${open ? "border-accent/40" : "border-line"}`}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{visit.name}</p>
          <p className="font-mono text-xs text-muted">
            <span className="text-accent">{fmtTime(visit.inTime)}</span> →{" "}
            {open ? "inside" : <span className="text-out">{fmtTime(visit.outTime)}</span>}
          </p>
        </div>
        {open && visit.canSetOut && (
          <Button variant="out" className="px-4 py-2 text-sm" loading={busy} onClick={checkOut}>
            Check out
          </Button>
        )}
        {(visit.canEditIn || visit.canSetOut || visit.canDelete) && (
          <Button variant="ghost" className="px-2 py-2 text-sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
