"use client";

import { loginAction, signupAction } from "@/app/actions/auth";
import { EyeIcon, EyeOffIcon } from "@/components/Icons";
import LoadingSpinner from "@/components/LoadingSpinner";
import Logo from "@/components/Logo";
import { useRouter } from "next/navigation";
import React, { Suspense, useState, useTransition } from "react";

function AuthForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: "info" | "error" | "success";
    message: string;
    isAlreadyRegistered?: boolean;
  } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    if (stayLoggedIn) {
      formData.append("stayLoggedIn", "on");
    }

    startTransition(async () => {
      setFeedback(null);
      const action = mode === "sign_in" ? loginAction : signupAction;
      const res = await action(formData);

      if (res.error) {
        const isDup =
          res.error.toLowerCase().includes("already registered") ||
          res.error.toLowerCase().includes("already in use") ||
          res.error.toLowerCase().includes("user already exists");
        setFeedback({
          type: "error",
          message: res.error,
          isAlreadyRegistered: isDup,
        });
      } else {
        // Immediate clean transition into the storehouse — zero intermediate screen or double-hop!
        router.push("/");
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto my-8 w-full max-w-md px-4 sm:my-14">
      {/* Centered Kura Brand Masthead with Amber Gradient Rings */}
      <div className="mb-6 flex flex-col items-center justify-center text-center select-none">
        <Logo className="justify-center" />
        <span className="mt-2.5 font-mono text-xs font-bold tracking-widest text-zinc-500 uppercase">
          KURA PERSONAL MEDIA STOREHOUSE
        </span>
      </div>

      {/* Main Floating Ceramic Card */}
      <div className="overflow-hidden rounded-2xl border border-zinc-400/90 bg-white shadow-[0_10px_30px_rgb(0,0,0,0.06)]">
        {/* Mode Selector Tabs (Default to SIGN IN) */}
        <div className="border-b border-zinc-200 bg-canvas/70 p-3">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1 font-mono text-xs font-bold uppercase">
            <button
              type="button"
              onClick={() => {
                setMode("sign_in");
                setFeedback(null);
              }}
              className={`cursor-pointer rounded-lg py-2.5 text-xs font-bold transition-all ${
                mode === "sign_in"
                  ? "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800"
                  : "text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-950"
              }`}
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("sign_up");
                setFeedback(null);
              }}
              className={`cursor-pointer rounded-lg py-2.5 text-xs font-bold transition-all ${
                mode === "sign_up"
                  ? "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800"
                  : "text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-950"
              }`}
            >
              SIGN UP
            </button>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6 font-sans text-xs">
          {/* Feedback Alert Banner */}
          {feedback?.type === "error" && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 font-mono text-xs font-bold text-rose-800">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                  <span>{feedback.message}</span>
                </div>
                {feedback.isAlreadyRegistered && mode === "sign_up" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("sign_in");
                      setFeedback(null);
                    }}
                    className="shrink-0 font-black uppercase underline hover:text-rose-950 cursor-pointer"
                  >
                    Sign In ➔
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="auth-email"
              className="block font-mono text-xs font-bold tracking-wider text-zinc-800 uppercase"
            >
              USER EMAIL:
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@kura.local"
              className="w-full rounded-xl border border-zinc-300 bg-canvas px-4 py-3 font-mono text-sm font-medium text-zinc-950 placeholder:text-zinc-400 transition-all focus:border-[#e0b438] focus:bg-white focus:ring-2 focus:ring-[#e0b438]/25 focus:outline-none"
            />
          </div>

          {/* Password with Eye Show/Hide Toggle */}
          <div className="space-y-1.5">
            <label
              htmlFor="auth-password"
              className="block font-mono text-xs font-bold tracking-wider text-zinc-800 uppercase"
            >
              PASSWORD:
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-zinc-300 bg-canvas px-4 py-3 pr-11 font-mono text-sm font-medium text-zinc-950 placeholder:text-zinc-400 transition-all focus:border-[#e0b438] focus:bg-white focus:ring-2 focus:ring-[#e0b438]/25 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-zinc-400 transition-colors hover:text-zinc-800"
              >
                {showPassword ? (
                  <EyeOffIcon className="h-4.5 w-4.5" />
                ) : (
                  <EyeIcon className="h-4.5 w-4.5" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me Toggle */}
          <div className="pt-0.5">
            <label className="flex cursor-pointer items-center gap-2.5 select-none">
              <input
                type="checkbox"
                id="stay-logged-in-checkbox"
                checked={stayLoggedIn}
                onChange={(e) => setStayLoggedIn(e.target.checked)}
                className="h-4.5 w-4.5 cursor-pointer rounded accent-[#e0b438]"
              />
              <span className="font-mono text-xs font-bold text-zinc-800">
                Remember me (keep session active for 30 days)
              </span>
            </label>
          </div>

          {/* Mode Toggle Prompt below Remember Me */}
          <div className="flex items-center gap-1.5 pt-1 font-mono text-xs">
            {mode === "sign_in" ? (
              <>
                <span className="font-medium text-zinc-600">
                  Don&apos;t have an account?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("sign_up");
                    setFeedback(null);
                  }}
                  className="cursor-pointer font-bold text-[#c49622] underline underline-offset-2 transition-colors hover:text-[#9a700f] uppercase"
                >
                  SIGN UP
                </button>
              </>
            ) : (
              <>
                <span className="font-medium text-zinc-600">
                  Already have an account?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("sign_in");
                    setFeedback(null);
                  }}
                  className="cursor-pointer font-bold text-[#c49622] underline underline-offset-2 transition-colors hover:text-[#9a700f] uppercase"
                >
                  SIGN IN
                </button>
              </>
            )}
          </div>

          {/* Primary Action Submit Button with Luminous Beeswax Yellow Gradient */}
          <button
            type="submit"
            disabled={isPending}
            className="btn-beeswax-gradient mt-4 flex h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-[#cca028]/60 bg-gradient-to-r from-[#f0d574] via-[#e2b73e] to-[#cca028] font-mono text-xs font-black tracking-wider text-zinc-950 uppercase shadow-md shadow-[#d4951a]/30 transition-all duration-150 hover:from-[#f5dc86] hover:via-[#e8c04c] hover:to-[#d4aa32] hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
          >
            {isPending ? (
              <LoadingSpinner
                size="sm"
                className="border-zinc-950/20 border-t-zinc-950"
              />
            ) : mode === "sign_in" ? (
              "ENTER YOUR STOREHOUSE ➔"
            ) : (
              "CREATE USER & ENTER ➔"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
