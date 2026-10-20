"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
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

/** How long the logo must be held to open the admin login. */
const ADMIN_HOLD_MS = 1500;

export function Header({ right }: { right?: ReactNode }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const held = useRef(false);

  // Press and hold the logo to open /admin (hidden from members); a normal tap goes home.
  const startHold = () => {
    held.current = false;
    timer.current = setTimeout(() => {
      held.current = true;
      navigator.vibrate?.(40);
      router.push("/admin");
    }, ADMIN_HOLD_MS);
  };
  const cancelHold = () => clearTimeout(timer.current);

  return (
    <header className="flex items-center justify-between">
      <Link
        href="/"
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => held.current && e.preventDefault()}
        draggable={false}
        className="flex min-w-0 select-none items-center [-webkit-touch-callout:none]"
      >
        {/* logo-header.png is public/logo.png trimmed to the artwork (788x120); the -light copy has
            the white "Warasgav" text recolored dark so it shows on the light theme. */}
        <Image
          src="/logo-header.png"
          alt={GYM_NAME}
          width={788}
          height={120}
          priority
          draggable={false}
          className="pointer-events-none h-8 w-auto max-w-full sm:h-9 light:hidden"
        />
        <Image
          src="/logo-header-light.png"
          alt={GYM_NAME}
          width={788}
          height={120}
          priority
          draggable={false}
          className="pointer-events-none hidden h-8 w-auto max-w-full sm:h-9 light:block"
        />
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
