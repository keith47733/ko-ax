"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import KoaxLogo from "@/components/Logo";
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
      {/* Centered KO-AX Brand Masthead */}
      <div className="flex flex-col items-center justify-center mb-6 text-center select-none">
        <div className="flex items-center font-serif tracking-tight text-4xl sm:text-5xl leading-none text-stone-900 font-bold">
          <span>KO</span>
          <KoaxLogo className="h-7 sm:h-8 w-auto text-stone-900 shrink-0 mx-1" />
          <span>AX</span>
        </div>
        <span className="font-mono text-[10px] tracking-widest text-stone-500 uppercase mt-2 font-medium">
          PERSONAL MEDIA CONTROL SYSTEM
        </span>
      </div>

      {/* Container Card */}
      <div className="border border-stone-300 rounded-md bg-stone-50 shadow-md shadow-stone-800/10 overflow-hidden">
        {/* Terminal Header */}
        <div className="border-b border-stone-300 bg-stone-900 text-stone-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full inline-block ${
                currentOperator
                  ? "bg-emerald-600"
                  : pendingVerificationEmail
                    ? "bg-orange-700 animate-pulse"
                    : "bg-stone-500"
              }`}
            />
            <h1 className="font-serif tracking-tight text-base sm:text-lg font-semibold">
              Operator Access // Clearance
            </h1>
          </div>
          <span className="font-mono text-[10px] uppercase border border-stone-600 text-stone-300 px-1.5 py-0.5 rounded">
            {currentOperator
              ? "AUTHENTICATED"
              : pendingVerificationEmail
                ? "VERIFICATION PENDING"
                : "LOCKED"}
          </span>
        </div>

        {/* State 1: Verification Required Notice */}
        {pendingVerificationEmail ? (
          <div className="p-5 space-y-4">
            <div className="border border-stone-300 rounded-md bg-stone-100 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-700 inline-block animate-pulse" />
                <span className="font-mono text-xs uppercase font-medium text-stone-800">
                  VERIFICATION CLEARANCE DISPATCHED
                </span>
              </div>
              <h2 className="font-serif text-xl font-bold text-stone-900">
                Check Your Email Inbox
              </h2>
              <p className="font-mono text-xs text-stone-700 leading-relaxed">
                A verification link was dispatched to:
                <br />
                <strong className="text-stone-900 font-semibold break-all font-mono">
                  {pendingVerificationEmail}
                </strong>
              </p>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                Click the confirmation link in your email to activate your
                account clearance, then sign in with your passcode.
              </p>
            </div>

            <div className="space-y-2 pt-1">
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
                className="w-full h-11 border border-stone-800 bg-stone-900 hover:bg-stone-800 text-white font-medium uppercase text-xs tracking-wider rounded-md shadow-sm cursor-pointer transition-colors"
              >
                ➔ PROCEED TO OPERATOR SIGN IN
              </button>

              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isPending}
                className="w-full h-10 border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 font-medium uppercase text-xs tracking-wider rounded-md cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isPending
                  ? "DISPATCHING LINK..."
                  : "⟳ RESEND VERIFICATION EMAIL"}
              </button>
            </div>

            {/* Diagnostic Status Box */}
            <div
              className={`border p-2.5 rounded-md text-[11px] font-mono font-medium flex items-center gap-2 ${
                feedback.type === "error"
                  ? "border-red-300 bg-red-50 text-red-800"
                  : feedback.type === "success"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-stone-300 bg-stone-100 text-stone-700"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 inline-block ${
                  feedback.type === "error"
                    ? "bg-red-700"
                    : feedback.type === "success"
                      ? "bg-emerald-700"
                      : "bg-stone-600"
                }`}
              />
              <span className="truncate">{feedback.message}</span>
            </div>
          </div>
        ) : currentOperator ? (
          /* State 2: Active Authenticated Operator */
          <div className="p-5 space-y-4">
            <div className="border border-stone-300 rounded-md bg-stone-100 p-4 space-y-2">
              <span className="font-mono text-[10px] text-stone-500 uppercase font-medium block">
                ACTIVE OPERATOR IDENTITY:
              </span>
              <div className="font-serif font-bold text-xl text-stone-900 break-all">
                {currentOperator}
              </div>
              <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-emerald-800 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-700 inline-block animate-pulse" />
                <span>SESSION ENCRYPTED &amp; ACTIVE</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                href="/"
                className="h-10 flex items-center justify-center font-medium uppercase text-xs bg-stone-900 text-white hover:bg-stone-800 rounded-md transition-colors"
              >
                ➔ MEDIA TRACKER
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isPending}
                className="h-10 flex items-center justify-center font-medium uppercase text-xs bg-stone-50 text-stone-800 border border-stone-300 hover:bg-stone-100 rounded-md cursor-pointer transition-colors"
              >
                {isPending ? "EXITING..." : "LOGOUT OPERATOR"}
              </button>
            </div>
          </div>
        ) : (
          /* State 3: Sign In / Register Form */
          <>
            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 border-b border-stone-300 divide-x divide-stone-300 text-xs font-mono font-medium uppercase">
              <button
                type="button"
                onClick={() => {
                  setMode("sign_in");
                  setFeedback({
                    type: "info",
                    message: "ENTER SIGN IN CREDENTIALS.",
                  });
                }}
                className={`py-3 transition-colors cursor-pointer ${
                  mode === "sign_in"
                    ? "bg-stone-800 text-white"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100"
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
                className={`py-3 transition-colors cursor-pointer ${
                  mode === "sign_up"
                    ? "bg-stone-800 text-white"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                }`}
              >
                REGISTER OPERATOR
              </button>
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSubmit}
              className="p-5 space-y-4 text-xs font-sans"
            >
              {/* Email */}
              <div className="space-y-1">
                <label
                  htmlFor="auth-email"
                  className="block font-mono font-medium uppercase text-[11px] text-stone-700"
                >
                  OPERATOR IDENTIFIER (EMAIL):
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="OPERATOR@KO-AX.LOCAL"
                  className="w-full border border-stone-300 rounded-md px-3 py-2 bg-stone-50 text-stone-900 text-xs font-mono focus:outline-none focus:border-stone-500"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label
                  htmlFor="auth-password"
                  className="block font-mono font-medium uppercase text-[11px] text-stone-700"
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
                  className="w-full border border-stone-300 rounded-md px-3 py-2 bg-stone-50 text-stone-900 text-xs font-mono focus:outline-none focus:border-stone-500"
                />
              </div>

              {/* Stay Logged In Toggle */}
              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="stay-logged-in-checkbox"
                    checked={stayLoggedIn}
                    onChange={(e) => setStayLoggedIn(e.target.checked)}
                    className="h-4 w-4 border-stone-300 rounded accent-stone-800 cursor-pointer"
                  />
                  <span className="font-mono text-[11px] font-medium text-stone-800">
                    KEEP SESSION ACTIVE (PERSIST TOKEN: 30 DAYS)
                  </span>
                </label>
                <p className="font-mono text-[9px] text-stone-500 pl-6.5 pt-0.5 normal-case">
                  {stayLoggedIn
                    ? "Tokens are preserved in secure HTTP cookies across browser restarts."
                    : "Session terminates automatically when browser is closed."}
                </p>
              </div>

              {/* Primary Action Submit Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full h-11 bg-orange-700 hover:bg-orange-800 text-white font-medium uppercase text-xs tracking-wider rounded-md shadow-sm transition-colors cursor-pointer mt-2"
              >
                {isPending
                  ? "VERIFYING CLEARANCE..."
                  : mode === "sign_in"
                    ? "EXECUTE OPERATOR SIGN IN ➔"
                    : "INITIALIZE OPERATOR ACCOUNT ➔"}
              </button>

              {/* Diagnostic Status Box */}
              <div
                className={`border p-2.5 rounded-md text-[11px] font-mono font-medium flex items-center gap-2 ${
                  feedback.type === "error"
                    ? "border-red-300 bg-red-50 text-red-800"
                    : feedback.type === "success"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-stone-300 bg-stone-100 text-stone-700"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 inline-block ${
                    feedback.type === "error"
                      ? "bg-red-700"
                      : feedback.type === "success"
                        ? "bg-emerald-700"
                        : "bg-stone-600"
                  }`}
                />
                <span className="truncate">{feedback.message}</span>
              </div>

              {/* Security Protocol Footer */}
              <div className="pt-2 border-t border-stone-200 flex justify-between items-center text-xs">
                <span className="font-mono text-[10px] text-stone-500 font-medium uppercase">
                  OPERATOR SECURITY PROTOCOL
                </span>
                <span className="font-mono text-[10px] text-stone-400">
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
        <div className="max-w-md w-full mx-auto my-12 border border-stone-300 rounded-md bg-stone-50 p-6 font-mono text-xs uppercase font-medium text-stone-600 text-center shadow-sm">
          INITIALIZING OPERATOR SECURITY TERMINAL...
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
