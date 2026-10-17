"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { MemberInfo, Visit } from "./member";

export type Me = { member: MemberInfo | null; date?: string; mine?: Visit | null; earlier?: Visit[]; added?: Visit[] };
export type FeeStatus = { month: string; paidThisMonth: boolean };

/** The logged-in member's day (and fee status), kept fresh whenever the screen is shown. */
export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [fees, setFees] = useState<FeeStatus | null>(null);
  const [error, setError] = useState("");

  function reload() {
    api<Me>("/api/me").then(
      (data) => {
        setMe(data);
        setError("");
        if (data.member) api<FeeStatus>("/api/fees").then(setFees, () => {});
        else setFees(null);
      },
      (e) => setError(e.message),
    );
  }

  useEffect(() => {
    // Runs on first load and again whenever Next.js shows this kept-alive page again.
    reload();
    // Also refresh when the member switches back to the app.
    const onVisible = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return { me, setMe, fees, error, reload };
}

/** An open visit the member can still close (a forgotten morning visit doesn't count). */
export const isInside = (me: Me | null) => !!me?.mine && !me.mine.outTime && me.mine.canSetOut;
