"use client";

import { useState, type FormEvent } from "react";
import type { Attendance } from "@/lib/db";
import { api, nowTime } from "@/lib/client";
import { fmtTime, fmtDuration, durationMinutes } from "@/lib/time";
import { Button, Card, ErrorText, Field } from "./ui";

export type Visit = Attendance & { canEditIn: boolean; canSetOut: boolean };
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

export function VisitCard({ visit, onChange, title }: { visit: Visit; onChange: (v: Visit) => void; title?: string }) {
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
            label={editing === "in" ? "Correct in time (up to 1 hour earlier)" : "Out time (within last 2 hours)"}
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

export function AddOtherForm({ onAdded, onCancel }: { onAdded: (v: Visit) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { record } = await api<{ record: Visit }>("/api/attendance/other", { body: { name, phone } });
      setName("");
      setPhone("");
      onAdded(record);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <p className="font-semibold">Mark attendance for someone else</p>
          <p className="mt-1 text-sm text-muted">For a friend at the gym without their phone. In time is set to now.</p>
        </div>
        <Field label="Their name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Field label="Their mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" required />
        <ErrorText>{error}</ErrorText>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" loading={loading}>
            Mark present
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Close
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Visits this member added for others today, each with its own in/out controls. */
export function AddedVisits({ visits, onChange }: { visits: Visit[]; onChange: (v: Visit) => void }) {
  if (!visits.length) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Added by you today</h2>
      {visits.map((v) => (
        <VisitCard key={v.id} visit={v} onChange={onChange} title={v.name} />
      ))}
    </section>
  );
}
