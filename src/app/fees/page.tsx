"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, FullPageSpinner, Header, Shell } from "@/components/ui";
import type { Payment } from "@/lib/db";
import { ApiError, api } from "@/lib/client";
import { fmtDate, fmtMonth } from "@/lib/time";

type Fees = { month: string; paidThisMonth: boolean; monthlyFee: number | null; payments: Payment[] };

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function FeesPage() {
  const [fees, setFees] = useState<Fees | null>(null);
  const [error, setError] = useState("");
  const [qrMissing, setQrMissing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api<Fees>("/api/fees").then(setFees, (e) => {
      if (e instanceof ApiError && e.status === 401) router.replace("/");
      else setError(e.message);
    });
  }, [router]);

  if (error) {
    return (
      <Shell>
        <Header />
        <Card className="text-danger">{error}</Card>
      </Shell>
    );
  }
  if (!fees) return <FullPageSpinner />;

  return (
    <Shell>
      <Header />

      <Card className={fees.paidThisMonth ? "border-accent/40" : "border-out/40"}>
        <p className="text-sm text-muted">{fmtMonth(fees.month)}</p>
        <p className={`mt-1 text-2xl font-bold ${fees.paidThisMonth ? "text-accent" : "text-out"}`}>
          {fees.paidThisMonth ? "Paid ✓" : "Fee pending"}
        </p>
        {!fees.paidThisMonth && fees.monthlyFee && <p className="mt-1 text-muted">Monthly fee: {rupees(fees.monthlyFee)}</p>}
      </Card>

      <Card className="flex flex-col items-center gap-3 text-center">
        <p className="font-semibold">Pay with any UPI app</p>
        {qrMissing ? (
          <p className="py-8 text-sm text-muted">UPI QR not added yet. Please pay at the front desk.</p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/upi-qr.png"
            alt="Gym UPI QR code"
            className="w-64 max-w-full rounded-xl bg-white p-2"
            onError={() => setQrMissing(true)}
          />
        )}
        <p className="text-sm text-muted">
          After paying, show the payment screenshot at the desk. Your fee will appear here once the admin records it.
        </p>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Payment history</h2>
        {fees.payments.length === 0 && <p className="text-sm text-muted">No payments recorded yet.</p>}
        {fees.payments.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
            <div>
              <p className="font-medium">{fmtMonth(p.month)}</p>
              <p className="text-xs text-muted">
                Paid {fmtDate(p.paidOn)} · {p.mode}
              </p>
            </div>
            <p className="font-mono font-semibold text-accent">{rupees(p.amount)}</p>
          </div>
        ))}
      </section>
    </Shell>
  );
}
