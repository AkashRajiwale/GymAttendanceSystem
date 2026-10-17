"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Attendance, Member, Payment } from "@/lib/db";
import { GYM_NAME } from "@/lib/brand";
import { api } from "@/lib/client";
import { buildReportPdf, download, reportText, sharePdf, whatsappLink } from "@/lib/report";
import { currentMonth, durationMinutes, fmtDate, fmtDuration, fmtMonth, fmtTime, today } from "@/lib/time";
import { Button, Card, ErrorText, Field, Spinner } from "./ui";

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const inputClass = "rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-accent";

function useData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    api<T>(url).then(
      (d) => {
        if (!live) return;
        setData(d);
        setError("");
      },
      (e) => live && setError(e.message),
    );
    return () => {
      live = false;
    };
  }, [url, tick]);
  return { data, error, reload: () => setTick((t) => t + 1) };
}

// ---------------------------------------------------------------- Attendance + daily report

export function AttendanceTab() {
  const [date, setDate] = useState(today());
  const { data, error, reload } = useData<{ date: string; records: Attendance[] }>(`/api/admin/attendance?date=${date}`);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const records = data?.date === date ? data.records : null;

  async function share() {
    if (!records) return;
    setBusy("share");
    const file = await buildReportPdf(date, records);
    const result = await sharePdf(file, `${GYM_NAME} attendance ${fmtDate(date)}`);
    setNote(result === "downloaded" ? "PDF downloaded — attach it in the WhatsApp group." : "");
    setBusy("");
  }

  async function downloadPdf() {
    if (!records) return;
    setBusy("download");
    download(await buildReportPdf(date, records));
    setBusy("");
  }

  const inside = records?.filter((r) => !r.outTime).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Date
          <input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} className={inputClass} />
        </label>
        <div className="flex gap-6 pb-2">
          <Stat label="Total" value={records?.length ?? "–"} />
          <Stat label="Still inside" value={records ? inside : "–"} />
        </div>
      </div>

      <Card className="flex flex-col gap-3">
        <div>
          <p className="font-semibold">Daily report for WhatsApp</p>
          <p className="text-sm text-muted">
            Send this to the gym group every night at 10 PM. On a phone, &quot;Share PDF&quot; opens WhatsApp directly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={share} loading={busy === "share"} disabled={!records}>
            Share PDF
          </Button>
          <Button variant="secondary" onClick={downloadPdf} loading={busy === "download"} disabled={!records}>
            Download PDF
          </Button>
          <a
            className={`inline-flex items-center rounded-xl border border-line bg-surface-2 px-4 py-3 font-semibold ${!records ? "pointer-events-none opacity-50" : ""}`}
            href={records ? whatsappLink(reportText(date, records)) : "#"}
            target="_blank"
            rel="noreferrer"
          >
            Send as text
          </a>
        </div>
        {note && <p className="text-sm text-accent">{note}</p>}
      </Card>

      <ErrorText>{error}</ErrorText>
      {!records && !error && <Loading />}

      {records && (
        <div className="overflow-hidden rounded-2xl border border-line">
          {records.length === 0 && <p className="p-6 text-center text-muted">No attendance on this day.</p>}
          {records.map((r, i) => (
            <AttendanceRow key={r.id} index={i + 1} record={r} onChange={reload} />
          ))}
        </div>
      )}

      {showAdd ? (
        <AddAttendanceForm
          date={date}
          onDone={() => {
            setShowAdd(false);
            reload();
          }}
          onCancel={() => setShowAdd(false)}
        />
      ) : (
        <Button variant="secondary" onClick={() => setShowAdd(true)}>
          + Add entry manually
        </Button>
      )}
    </div>
  );
}

function AttendanceRow({ record, index, onChange }: { record: Attendance; index: number; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [inTime, setInTime] = useState(record.inTime);
  const [outTime, setOutTime] = useState(record.outTime);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/attendance", { method: "PATCH", body: { date: record.date, id: record.id, inTime, outTime } });
      setEditing(false);
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${record.name}'s attendance?`)) return;
    setBusy(true);
    await api("/api/admin/attendance", { method: "DELETE", body: { date: record.date, id: record.id } }).catch((e) => setError(e.message));
    onChange();
  }

  return (
    <div className="flex flex-col gap-2 border-b border-line bg-surface px-4 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="w-6 text-sm text-muted">{index}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{record.name}</p>
          <p className="text-xs text-muted">
            {record.phone}
            {record.addedBy && ` · added by ${record.addedBy}`}
          </p>
        </div>
        {!editing && (
          <div className="text-right font-mono text-sm">
            <p>
              <span className="text-accent">{fmtTime(record.inTime)}</span> → <span className="text-out">{fmtTime(record.outTime)}</span>
            </p>
            <p className="text-xs text-muted">{record.outTime ? fmtDuration(durationMinutes(record.inTime, record.outTime)) : "inside"}</p>
          </div>
        )}
        {!editing && (
          <Button variant="ghost" className="px-2 py-1 text-sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>
      {editing && (
        <div className="flex flex-wrap items-end gap-2 pl-9">
          <label className="flex flex-col gap-1 text-xs text-muted">
            In
            <input type="time" value={inTime} onChange={(e) => setInTime(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Out
            <input type="time" value={outTime} onChange={(e) => setOutTime(e.target.value)} className={inputClass} />
          </label>
          <Button className="px-3 py-2 text-sm" onClick={save} loading={busy}>
            Save
          </Button>
          <Button variant="secondary" className="px-3 py-2 text-sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button variant="danger" className="px-3 py-2 text-sm" onClick={remove} disabled={busy}>
            Delete
          </Button>
        </div>
      )}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

function AddAttendanceForm({ date, onDone, onCancel }: { date: string; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", inTime: "", outTime: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/attendance", { body: { ...form, date } });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <p className="font-semibold sm:col-span-2">Add attendance for {fmtDate(date)}</p>
        <Field label="Name" value={form.name} onChange={set("name")} required />
        <Field label="Mobile number" value={form.phone} onChange={set("phone")} inputMode="numeric" required />
        <Field label="In time" type="time" value={form.inTime} onChange={set("inTime")} required />
        <Field label="Out time (optional)" type="time" value={form.outTime} onChange={set("outTime")} />
        <div className="sm:col-span-2">
          <ErrorText>{error}</ErrorText>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" loading={busy}>
            Add
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------- Fees

type FeesData = {
  month: string;
  monthlyFee: number | null;
  payments: Payment[];
  total: number;
  unpaid: (Member & { visitedThisMonth: boolean })[];
};

export function FeesTab() {
  const [month, setMonth] = useState(currentMonth());
  const { data, error, reload } = useData<FeesData>(`/api/admin/payments?month=${month}`);
  const members = useData<{ members: Member[] }>("/api/admin/members");
  const [activeOnly, setActiveOnly] = useState(true);
  const fees = data?.month === month ? data : null;

  async function remove(p: Payment) {
    if (!confirm(`Delete ${p.name}'s payment of ${rupees(p.amount)}?`)) return;
    await api("/api/admin/payments", { method: "DELETE", body: { id: p.id } });
    reload();
  }

  const unpaid = fees?.unpaid.filter((m) => !activeOnly || m.visitedThisMonth) ?? [];
  const reminder = (name: string) =>
    `Hi ${name.split(" ")[0]}, a friendly reminder from ${GYM_NAME}: your fee for ${fmtMonth(month)} is due${
      fees?.monthlyFee ? ` (${rupees(fees.monthlyFee)})` : ""
    }. You can pay by UPI in the gym app. Thank you!`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Month
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className={inputClass} />
        </label>
        <div className="flex gap-6 pb-2">
          <Stat label="Collected" value={fees ? rupees(fees.total) : "–"} />
          <Stat label="Paid" value={fees?.payments.length ?? "–"} />
          <Stat label="Unpaid" value={fees?.unpaid.length ?? "–"} />
        </div>
      </div>

      {/* Remount when the month or fee loads so the form's defaults follow them */}
      <AddPaymentForm
        key={`${month}-${data?.monthlyFee}`}
        month={month}
        monthlyFee={data?.monthlyFee ?? null}
        members={members.data?.members ?? []}
        onDone={reload}
      />

      <ErrorText>{error}</ErrorText>
      {!fees && !error && <Loading />}

      {fees && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Paid for {fmtMonth(month)}</h3>
            {fees.payments.length === 0 && <p className="text-sm text-muted">No payments yet.</p>}
            {fees.payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-muted">
                    {p.phone} · {fmtDate(p.paidOn)} · {p.mode}
                    {p.note && ` · ${p.note}`}
                  </p>
                </div>
                <p className="font-mono font-semibold text-accent">{rupees(p.amount)}</p>
                <Button variant="danger" className="px-2 py-1 text-sm" onClick={() => remove(p)}>
                  ✕
                </Button>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Not paid yet</h3>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
                Came this month
              </label>
            </div>
            {unpaid.length === 0 && <p className="text-sm text-muted">Everyone has paid 🎉</p>}
            {unpaid.map((m) => (
              <div key={m.phone} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.name}</p>
                  <p className="text-xs text-muted">{m.phone}</p>
                </div>
                <a
                  href={whatsappLink(reminder(m.name), m.phone)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-out/15 px-3 py-1.5 text-sm font-semibold text-out"
                >
                  Remind
                </a>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}

function AddPaymentForm({
  month,
  monthlyFee,
  members,
  onDone,
}: {
  month: string;
  monthlyFee: number | null;
  members: Member[];
  onDone: () => void;
}) {
  const [member, setMember] = useState("");
  const [amount, setAmount] = useState(monthlyFee ? String(monthlyFee) : "");
  const [forMonth, setForMonth] = useState(month);
  const [paidOn, setPaidOn] = useState(today());
  const [mode, setMode] = useState("UPI");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  // The member box accepts "Name — phone" picked from the list, or a bare phone number.
  const phone = member.match(/(\d{10})\s*$/)?.[1] ?? "";
  const picked = members.find((m) => m.phone === phone);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (!picked) return setError("Pick a member from the list");
    setBusy(true);
    try {
      await api("/api/admin/payments", { body: { phone, month: forMonth, amount, paidOn, mode, note } });
      setOk(`Saved ${rupees(Number(amount))} for ${picked.name}`);
      setMember("");
      setNote("");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <p className="font-semibold sm:col-span-2">Record a payment</p>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm text-muted">Member (type name or phone)</span>
          <input list="members" value={member} onChange={(e) => setMember(e.target.value)} className={`${inputClass} py-3`} required />
          <datalist id="members">
            {members.map((m) => (
              <option key={m.phone} value={`${m.name} — ${m.phone}`} />
            ))}
          </datalist>
        </label>
        <Field label="Amount (₹)" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <Field label="Fee for month" type="month" value={forMonth} onChange={(e) => setForMonth(e.target.value)} required />
        <Field label="Paid on" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">Mode</span>
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={`${inputClass} py-3`}>
            <option>UPI</option>
            <option>Cash</option>
            <option>Other</option>
          </select>
        </label>
        <div className="sm:col-span-2">
          <Field label="Note (optional, e.g. UPI ref)" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <ErrorText>{error}</ErrorText>
          {ok && <p className="text-sm text-accent">{ok}</p>}
          <Button type="submit" loading={busy}>
            Save payment
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------- Members

export function MembersTab() {
  const { data, error } = useData<{ members: (Member & { lastVisit: string })[] }>("/api/admin/members");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.members ?? []).filter((m) => !s || m.name.toLowerCase().includes(s) || m.phone.includes(s));
  }, [data, q]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input placeholder="Search name or phone" value={q} onChange={(e) => setQ(e.target.value)} className={`${inputClass} flex-1 py-3`} />
        <Stat label="Members" value={data?.members.length ?? "–"} />
      </div>
      <ErrorText>{error}</ErrorText>
      {!data && !error && <Loading />}
      <div className="overflow-hidden rounded-2xl border border-line">
        {list.map((m) => (
          <div key={m.phone} className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 last:border-b-0">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{m.name}</p>
              <p className="text-xs text-muted">
                Joined {m.joinedAt ? fmtDate(m.joinedAt.slice(0, 10)) : "—"}
                {m.lastVisit && ` · last visit ${fmtDate(m.lastVisit)}`}
              </p>
            </div>
            <a href={`tel:${m.phone}`} className="font-mono text-sm text-muted">
              {m.phone}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- QR poster

export function QrTab() {
  const { data, error } = useData<{ scanUrl: string }>("/api/admin/config");
  const [img, setImg] = useState("");

  useEffect(() => {
    if (!data) return;
    import("qrcode").then((QR) => QR.toDataURL(data.scanUrl, { width: 720, margin: 1 }).then(setImg));
  }, [data]);

  return (
    <div className="flex flex-col items-center gap-4">
      <ErrorText>{error}</ErrorText>
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl bg-white p-8 text-center text-black">
        <p className="text-2xl font-black">{GYM_NAME}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img ? <img src={img} alt="Attendance QR code" className="w-full" /> : <Spinner className="my-24 size-8" />}
        <p className="text-lg font-bold">Scan to mark attendance</p>
        <p className="text-sm text-gray-600">Scan when you arrive and again when you leave</p>
      </div>
      {data && <p className="break-all text-center font-mono text-xs text-muted">{data.scanUrl}</p>}
      <div className="no-print flex gap-2">
        <Button onClick={() => window.print()}>Print poster</Button>
        {img && (
          <a href={img} download="attendance-qr.png" className="inline-flex items-center rounded-xl border border-line bg-surface-2 px-4 py-3 font-semibold">
            Download QR
          </a>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}

function Loading() {
  return (
    <div className="grid place-items-center py-10 text-muted">
      <Spinner className="size-6" />
    </div>
  );
}
