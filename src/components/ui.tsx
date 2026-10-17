"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { GYM_NAME } from "@/lib/brand";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "out" | "danger";
  loading?: boolean;
};

const variants = {
  primary: "bg-accent text-accent-ink hover:brightness-110",
  out: "bg-out text-accent-ink hover:brightness-110",
  secondary: "bg-surface-2 text-foreground border border-line hover:border-muted",
  ghost: "text-muted hover:text-foreground",
  danger: "text-danger hover:bg-danger/10",
};

export function Button({ variant = "primary", loading, className = "", children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition active:scale-[0.98] disabled:opacity-50 ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className = "size-4" }: { className?: string }) {
  return <span className={`${className} inline-block animate-spin rounded-full border-2 border-current border-t-transparent`} />;
}

export function Field({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-muted">{label}</span>
      <input
        className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-base outline-none transition focus:border-accent"
        {...rest}
      />
    </label>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>{children}</div>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{children}</p>;
}

export function Shell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <main className={`mx-auto flex w-full flex-1 flex-col gap-5 px-4 py-6 ${wide ? "max-w-4xl" : "max-w-md"}`}>
      {children}
    </main>
  );
}

export function Header({ right }: { right?: ReactNode }) {
  return (
    <header className="flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <span className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-black text-accent-ink">
          {GYM_NAME.slice(0, 1)}
        </span>
        {GYM_NAME}
      </Link>
      {right}
    </header>
  );
}

export function FullPageSpinner() {
  return (
    <div className="grid flex-1 place-items-center text-muted">
      <Spinner className="size-8" />
    </div>
  );
}
