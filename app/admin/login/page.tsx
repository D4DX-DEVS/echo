"use client";
import { useActionState, useState } from "react";
import { login } from "../actions";
import ThemeToggle from "@/components/ThemeToggle";

export default function Login() {
  const [err, action, pending] = useActionState(login, undefined);
  const [show, setShow] = useState(false);
  return (
    <div className="min-h-screen bg-page md:grid md:grid-cols-[1fr_1fr] lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden md:flex flex-col justify-between overflow-hidden bg-nav text-white p-10 lg:p-14">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute -left-16 bottom-10 h-56 w-56 rounded-full bg-white/5" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="The Echo" className="relative h-16 w-auto self-start brightness-0 invert" />
        <div className="relative">
          <h2 className="text-3xl lg:text-4xl font-bold leading-snug">Write. Publish.<br />Be heard.</h2>
          <p className="mt-3 max-w-sm text-white/75">Manage stories, photos, videos and pages of The Echo from one place.</p>
        </div>
        <p className="relative text-sm text-white/60">© The Echo</p>
      </aside>

      <main className="relative grid place-items-center p-5 min-h-screen md:min-h-0">
        <ThemeToggle className="absolute top-4 right-4 w-10 h-10 grid place-items-center rounded-full border border-line text-fg hover:bg-surface cursor-pointer" />
        <form action={action} className="w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="The Echo" className="md:hidden h-16 w-auto mx-auto mb-6" />
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted mt-1 mb-6">Sign in to manage The Echo.</p>

          <label htmlFor="password" className="block text-sm font-semibold mb-1.5">Password</label>
          <div className="relative">
            <input id="password" name="password" type={show ? "text" : "password"} placeholder="Enter your password" className="field !py-3 !pr-14 !rounded-xl" autoFocus required autoComplete="current-password" />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-1 px-3 text-xs font-semibold text-brand-text hover:underline cursor-pointer">
              {show ? "Hide" : "Show"}
            </button>
          </div>
          {err && <p role="alert" className="mt-3 rounded-lg bg-accent/10 border border-accent/30 px-3 py-2 text-sm text-accent font-medium">{err}</p>}
          <button className="btn w-full !py-3 !rounded-xl mt-5" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
          <p className="text-center text-xs text-muted mt-6">Only for The Echo team.</p>
        </form>
      </main>
    </div>
  );
}
