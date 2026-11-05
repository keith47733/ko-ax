"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import {
  getOperatorSessionAction,
  loginAction,
  signupAction,
  logoutAction,
  resendVerificationAction,
} from "@/app/actions/auth";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [currentOperator, setCurrentOperator] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<
    string | null
  >(null);
  const isVerificationError =
    searchParams.get("error") === "VERIFICATION_FAILED";
  const [feedback, setFeedback] = useState<{
    type: "info" | "error" | "success";
    message: string;
  }>(() => ({
    type: isVerificationError ? "error" : "info",
    message: isVerificationError
      ? "VERIFICATION FAILED OR LINK EXPIRED. PLEASE REQUEST A NEW LINK."
      : "AWAITING OPERATOR CREDENTIALS",
  }));

  // Check if already authenticated on mount
  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      const result = await getOperatorSessionAction();
      if (isMounted && result.success && result.user?.email) {
        setCurrentOperator(result.user.email);
        setFeedback({
          type: "success",
          message: `OPERATOR SESSION ACTIVE: ${result.user.email}`,
        });
      }
    }
    checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    if (stayLoggedIn) {
      formData.append("stayLoggedIn", "on");
    }

    startTransition(async () => {
      setFeedback({
        type: "info",
        message: "PROCESSING CREDENTIAL CLEARANCE...",
      });

      const action = mode === "sign_in" ? loginAction : signupAction;
      const res = await action(formData);

      if (res.error) {
        setFeedback({ type: "error", message: res.error });
        if (res.emailConfirmationRequired) {
          setPendingVerificationEmail(email);
        }
      } else if (res.emailConfirmationRequired) {
        // Supabase requires email verification
        setPendingVerificationEmail(res.user?.email || email);
        setFeedback({
          type: "info",
          message:
            res.message ||
            "VERIFICATION EMAIL DISPATCHED. PLEASE CHECK YOUR INBOX.",
        });
      } else {
        // Authenticated with valid session
        setFeedback({
          type: "success",
          message: res.message || "CLEARANCE GRANTED. OPERATOR LOGGED IN.",
        });
        if (res.user?.email) {
          setCurrentOperator(res.user.email);
        }
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 800);
      }
    });
  }

  function handleResendVerification() {
    const targetEmail = pendingVerificationEmail || email;
    if (!targetEmail) return;

    startTransition(async () => {
      setFeedback({
        type: "info",
        message: "DISPATCHING NEW VERIFICATION LINK...",
      });
      const res = await resendVerificationAction(targetEmail);
      if (res.error) {
        setFeedback({ type: "error", message: res.error });
      } else {
        setFeedback({
          type: "success",
          message:
            res.message || "VERIFICATION LINK RE-SENT. CHECK YOUR INBOX.",
        });
      }
    });
  }

  function handleLogout() {
    startTransition(async () => {
      await logoutAction();
      setCurrentOperator(null);
      setEmail("");
      setPassword("");
      setPendingVerificationEmail(null);
      setFeedback({ type: "info", message: "OPERATOR SESSION TERMINATED." });
      router.refresh();
    });
  }

  return (
    <div className="max-w-md w-full mx-auto my-6 sm:my-10">
      {/* Centered Kura Brand Masthead */}
      <div className="flex flex-col items-center justify-center mb-6 text-center select-none">
        <Logo className="justify-center" />
        <span className="font-mono text-xs tracking-widest text-zinc-700 uppercase mt-2.5 font-bold">
          PERSONAL MEDIA CONTROL SYSTEM
        </span>
      </div>

      {/* Container Card */}
      <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {/* Minimalist Terminal Header */}
        <div className="bg-zinc-950 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full inline-block ${
                currentOperator
                  ? "bg-[#34D399] shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                  : pendingVerificationEmail
                    ? "bg-[#FF7A50] animate-pulse shadow-[0_0_8px_rgba(255,122,80,0.6)]"
                    : "bg-zinc-600"
              }`}
            />
            <h1 className="font-sans tracking-tight text-sm sm:text-base font-black">
              Operator Access // Clearance
            </h1>
          </div>
          <span
            className={`font-mono text-[11px] uppercase px-2.5 py-1 rounded-md font-black tracking-wide ${
              currentOperator
                ? "bg-[#34D399] text-emerald-950"
                : pendingVerificationEmail
                  ? "bg-[#FF7A50] text-zinc-950"
                  : "bg-zinc-800 text-zinc-300"
            }`}
          >
            {currentOperator
              ? "AUTHENTICATED"
              : pendingVerificationEmail
                ? "VERIFICATION PENDING"
                : "LOCKED"}
          </span>
        </div>

        {/* State 1: Verification Required Notice */}
        {pendingVerificationEmail ? (
          <div className="p-6 space-y-4">
            <div className="rounded-2xl bg-[#F4F3F0] p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF7A50] inline-block animate-pulse" />
                <span className="font-mono text-xs uppercase font-black text-zinc-950">
                  VERIFICATION CLEARANCE DISPATCHED
                </span>
              </div>
              <h2 className="font-sans text-xl sm:text-2xl font-black text-zinc-950">
                Check Your Email Inbox
              </h2>
              <p className="font-mono text-xs sm:text-sm text-zinc-800 leading-relaxed font-bold">
                A verification link was dispatched to:
                <br />
                <strong className="text-zinc-950 font-black break-all font-mono">
                  {pendingVerificationEmail}
                </strong>
              </p>
              <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-medium">
                Click the confirmation link in your email to activate your
                account clearance, then sign in with your passcode.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setMode("sign_in");
                  setPendingVerificationEmail(null);
                  setFeedback({
                    type: "info",
                    message: "ENTER YOUR SECURITY PASSCODE TO SIGN IN.",
                  });
                }}
                className="w-full h-12 bg-zinc-950 hover:bg-black text-white font-black uppercase text-xs sm:text-sm tracking-wider rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.99]"
              >
                ➔ PROCEED TO OPERATOR SIGN IN
              </button>

              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isPending}
                className="w-full h-11 bg-[#F4F3F0] hover:bg-zinc-200 text-zinc-950 font-bold uppercase text-xs tracking-wider rounded-xl cursor-pointer disabled:opacity-50 transition-all"
              >
                {isPending
                  ? "DISPATCHING LINK..."
                  : "⟳ RESEND VERIFICATION EMAIL"}
              </button>
            </div>

            {/* Diagnostic Status Box */}
            <div
              className={`p-3.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2.5 ${
                feedback.type === "error"
                  ? "bg-red-50 text-red-950"
                  : feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-950"
                    : "bg-[#F4F3F0] text-zinc-950"
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 inline-block ${
                  feedback.type === "error"
                    ? "bg-red-500"
                    : feedback.type === "success"
                      ? "bg-[#34D399]"
                      : "bg-[#818CF8]"
                }`}
              />
              <span className="truncate">{feedback.message}</span>
            </div>
          </div>
        ) : currentOperator ? (
          /* State 2: Active Authenticated Operator */
          <div className="p-6 space-y-5">
            <div className="rounded-2xl bg-[#F4F3F0] p-5 space-y-2.5">
              <span className="font-mono text-xs text-zinc-700 uppercase font-black block">
                ACTIVE OPERATOR IDENTITY:
              </span>
              <div className="font-sans font-black text-2xl text-zinc-950 break-all">
                {currentOperator}
              </div>
              <div className="flex items-center gap-2 pt-1 font-mono text-xs font-black">
                <span className="w-2.5 h-2.5 rounded-full bg-[#34D399] inline-block animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                <span className="text-emerald-950">SESSION ENCRYPTED &amp; ACTIVE</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Link
                href="/"
                className="h-12 flex items-center justify-center font-bold uppercase text-xs sm:text-sm bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all shadow-sm active:scale-[0.99]"
              >
                ➔ MEDIA TRACKER
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isPending}
                className="h-12 flex items-center justify-center font-bold uppercase text-xs sm:text-sm bg-[#F4F3F0] text-zinc-950 hover:bg-zinc-200 rounded-xl cursor-pointer transition-all"
              >
                {isPending ? "EXITING..." : "LOGOUT OPERATOR"}
              </button>
            </div>
          </div>
        ) : (
          /* State 3: Sign In / Register Form */
          <>
            {/* Mode Selector Tabs */}
            <div className="p-3 pt-4">
              <div className="grid grid-cols-2 p-1 bg-[#F4F3F0] rounded-xl gap-1 text-xs font-mono font-medium uppercase">
                <button
                  type="button"
                  onClick={() => {
                    setMode("sign_in");
                    setFeedback({
                      type: "info",
                      message: "ENTER SIGN IN CREDENTIALS.",
                    });
                  }}
                  className={`py-2.5 transition-all cursor-pointer rounded-lg text-xs font-bold ${
                    mode === "sign_in"
                      ? "bg-zinc-800 hover:bg-zinc-700 text-white shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 font-medium"
                  }`}
                >
                  SIGN IN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("sign_up");
                    setFeedback({
                      type: "info",
                      message: "ENTER NEW OPERATOR CREDENTIALS.",
                    });
                  }}
                  className={`py-2.5 transition-all cursor-pointer rounded-lg text-xs font-bold ${
                    mode === "sign_up"
                      ? "bg-zinc-800 hover:bg-zinc-700 text-white shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 font-medium"
                  }`}
                >
                  REGISTER OPERATOR
                </button>
              </div>
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSubmit}
              className="p-6 pt-2 space-y-4 text-xs font-sans"
            >
              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-email"
                  className="block font-mono font-bold uppercase text-xs text-zinc-900"
                >
                  OPERATOR IDENTIFIER (EMAIL):
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="OPERATOR@KURA.LOCAL"
                  className="w-full rounded-xl px-4 py-3 bg-[#F4F3F0] text-zinc-950 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-950/20 placeholder:text-zinc-500 font-medium transition-all"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-password"
                  className="block font-mono font-bold uppercase text-xs text-zinc-900"
                >
                  SECURITY PASSCODE:
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl px-4 py-3 bg-[#F4F3F0] text-zinc-950 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-950/20 placeholder:text-zinc-500 font-medium transition-all"
                />
              </div>

              {/* Stay Logged In Toggle */}
              <div className="pt-1">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="stay-logged-in-checkbox"
                    checked={stayLoggedIn}
                    onChange={(e) => setStayLoggedIn(e.target.checked)}
                    className="h-4.5 w-4.5 rounded accent-zinc-950 cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold text-zinc-950">
                    KEEP SESSION ACTIVE (PERSIST TOKEN: 30 DAYS)
                  </span>
                </label>
                <p className="font-mono text-[11px] text-zinc-700 pl-7 pt-1 font-medium normal-case">
                  {stayLoggedIn
                    ? "Tokens are preserved in secure HTTP cookies across browser restarts."
                    : "Session terminates automatically when browser is closed."}
                </p>
              </div>

              {/* Primary Action Submit Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full h-12 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.99] text-white font-bold uppercase text-xs sm:text-sm tracking-wider rounded-xl shadow-sm transition-all cursor-pointer mt-3"
              >
                {isPending
                  ? "VERIFYING CLEARANCE..."
                  : mode === "sign_in"
                    ? "EXECUTE OPERATOR SIGN IN ➔"
                    : "INITIALIZE OPERATOR ACCOUNT ➔"}
              </button>

              {/* Diagnostic Status Box */}
              <div
                className={`p-3.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2.5 ${
                  feedback.type === "error"
                    ? "bg-red-50 text-red-950"
                    : feedback.type === "success"
                      ? "bg-emerald-50 text-emerald-950"
                      : "bg-[#F4F3F0] text-zinc-950"
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 inline-block ${
                    feedback.type === "error"
                      ? "bg-red-500"
                      : feedback.type === "success"
                        ? "bg-[#34D399]"
                        : "bg-[#818CF8]"
                  }`}
                />
                <span className="truncate">{feedback.message}</span>
              </div>

              {/* Security Protocol Footer */}
              <div className="pt-3 border-t border-zinc-200/60 flex justify-between items-center text-xs">
                <span className="font-mono text-[11px] text-zinc-700 font-bold uppercase">
                  OPERATOR SECURITY PROTOCOL
                </span>
                <span className="font-mono text-[11px] text-zinc-700 font-bold">
                  v0.2.0
                </span>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md w-full mx-auto my-12 rounded-2xl bg-white p-6 font-mono text-xs uppercase font-medium text-zinc-500 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          INITIALIZING OPERATOR SECURITY TERMINAL...
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
