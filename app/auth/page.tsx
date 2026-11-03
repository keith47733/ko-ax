"use client";

import React, { useState } from "react";
import Link from "next/link";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export default function AuthWireframePage() {
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<string>(
    isSupabaseConfigured
      ? "SUPABASE AUTH READY"
      : "WIREFRAME MODE (SET NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY FOR LIVE AUTH)"
  );
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) {
      setStatusMessage(
        `SIMULATED ${mode.toUpperCase()} FOR ${email || "USER"} [WIREFRAME MODE]`
      );
      return;
    }

    setIsLoading(true);
    setStatusMessage("AUTHENTICATING WITH SUPABASE...");

    try {
      if (mode === "sign_in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        setStatusMessage(error ? `ERROR: ${error.message}` : "SIGNED IN SUCCESSFULLY");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        setStatusMessage(
          error
            ? `ERROR: ${error.message}`
            : "SIGN UP SUBMITTED. CHECK EMAIL OR SIGN IN."
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto my-8 border-2 border-black bg-white text-black">
      <div className="border-b-2 border-black bg-black text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-sm font-bold uppercase">
          KO-AX // AUTHENTICATION WIREFRAME
        </h1>
        <span className="text-[11px] uppercase border border-white px-1.5 py-0.5">
          auth.users
        </span>
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 border-b-2 border-black divide-x-2 divide-black text-xs font-bold uppercase">
        <button
          type="button"
          onClick={() => setMode("sign_in")}
          className={`py-2.5 cursor-pointer ${
            mode === "sign_in"
              ? "bg-black text-white"
              : "bg-white text-black hover:bg-neutral-200"
          }`}
        >
          SIGN IN
        </button>
        <button
          type="button"
          onClick={() => setMode("sign_up")}
          className={`py-2.5 cursor-pointer ${
            mode === "sign_up"
              ? "bg-black text-white"
              : "bg-white text-black hover:bg-neutral-200"
          }`}
        >
          SIGN UP
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs uppercase">
        <div>
          <label htmlFor="auth-email" className="block font-bold mb-1">
            EMAIL ADDRESS:
          </label>
          <input
            id="auth-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="OPERATOR@KO-AX.LOCAL"
            className="w-full border-2 border-black px-3 py-2 bg-white text-black text-xs focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="auth-password" className="block font-bold mb-1">
            PASSWORD:
          </label>
          <input
            id="auth-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full border-2 border-black px-3 py-2 bg-white text-black text-xs focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full border-2 border-black bg-black text-white py-2.5 font-bold uppercase hover:bg-neutral-800 cursor-pointer"
        >
          {isLoading
            ? "PROCESSING..."
            : mode === "sign_in"
            ? "SUBMIT SIGN IN"
            : "CREATE ACCOUNT"}
        </button>

        <div className="border-2 border-black bg-neutral-100 p-2 text-[11px]">
          STATUS: {statusMessage}
        </div>

        <div className="pt-2 border-t-2 border-black flex justify-between items-center">
          <Link href="/" className="underline font-bold">
            &larr; RETURN TO MAIN VIEW
          </Link>
        </div>
      </form>
    </div>
  );
}

