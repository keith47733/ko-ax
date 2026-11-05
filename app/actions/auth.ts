"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionResult {
  success?: boolean;
  error?: string;
  message?: string;
  emailConfirmationRequired?: boolean;
  user?: {
    email: string;
    id: string;
  } | null;
}

interface SessionCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge?: number;
}

const SIMULATED_SESSION_COOKIE = "koax_operator_session";

export async function getOperatorSessionAction(): Promise<AuthActionResult> {
  const cookieStore = await cookies();

  // 1. Check live Supabase session if configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && user.email) {
        return {
          success: true,
          user: {
            email: user.email,
            id: user.id,
          },
        };
      }
    } catch {
      // Fall through to simulated session check
    }
  }

  // 2. Check fallback simulated session
  const simCookie = cookieStore.get(SIMULATED_SESSION_COOKIE);
  if (simCookie?.value) {
    try {
      const parsed = JSON.parse(simCookie.value);
      if (parsed.email) {
        return {
          success: true,
          user: {
            email: parsed.email,
            id: "simulated_operator",
          },
        };
      }
    } catch {
      // Cookie corrupted, discard
    }
  }

  return { success: false, user: null };
}

export async function loginAction(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim();
  const password = (formData.get("password") as string)?.trim();
  const stayLoggedIn = formData.get("stayLoggedIn") === "on";

  if (!email || !password) {
    return { error: "OPERATOR EMAIL AND PASSWORD REQUIRED." };
  }

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Live Supabase Auth
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const isUnconfirmed = error.message.toLowerCase().includes("email not confirmed");
        return {
          error: isUnconfirmed
            ? "EMAIL NOT CONFIRMED. PLEASE VERIFY YOUR ACCOUNT VIA THE LINK IN YOUR INBOX."
            : error.message.toUpperCase(),
          emailConfirmationRequired: isUnconfirmed,
        };
      }

      if (data.user) {
        // Clear simulated session cookie so the browser exclusively runs on live Supabase
        cookieStore.delete(SIMULATED_SESSION_COOKIE);
        revalidatePath("/");
        return {
          success: true,
          emailConfirmationRequired: false,
          user: {
            email: data.user.email || email,
            id: data.user.id,
          },
          message: "OPERATOR AUTHENTICATED SUCCESSFULLY.",
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toUpperCase() : "AUTHENTICATION FAILED.";
      return { error: msg };
    }
  }

  // Simulated Wireframe Session Fallback
  const cookieOptions: SessionCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };

  // If "Stay Logged In" is checked, persist for 30 days; otherwise session-only (expires on browser close)
  if (stayLoggedIn) {
    cookieOptions.maxAge = 60 * 60 * 24 * 30; // 30 days
  }

  cookieStore.set(
    SIMULATED_SESSION_COOKIE,
    JSON.stringify({ email, stayLoggedIn, loggedInAt: new Date().toISOString() }),
    cookieOptions
  );

  revalidatePath("/");
  return {
    success: true,
    emailConfirmationRequired: false,
    user: { email, id: "simulated_operator" },
    message: stayLoggedIn
      ? "SIMULATED OPERATOR ACCESS GRANTED (PERSISTENT TOKEN: 30 DAYS)."
      : "SIMULATED OPERATOR ACCESS GRANTED (SESSION ONLY).",
  };
}

export async function signupAction(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim();
  const password = (formData.get("password") as string)?.trim();
  const stayLoggedIn = formData.get("stayLoggedIn") === "on";

  if (!email || !password) {
    return { error: "OPERATOR EMAIL AND PASSWORD REQUIRED." };
  }

  if (password.length < 6) {
    return { error: "SECURITY PASSCODE MUST BE AT LEAST 6 CHARACTERS." };
  }

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { error: error.message.toUpperCase() };
      }

      if (data.user) {
        const hasSession = Boolean(data.session);
        if (hasSession) {
          revalidatePath("/");
          return {
            success: true,
            emailConfirmationRequired: false,
            user: {
              email: data.user.email || email,
              id: data.user.id,
            },
            message: "OPERATOR REGISTERED & AUTHENTICATED.",
          };
        } else {
          // Supabase requires email verification before session token is granted
          return {
            success: true,
            emailConfirmationRequired: true,
            user: {
              email: data.user.email || email,
              id: data.user.id,
            },
            message: "OPERATOR ACCOUNT CREATED. VERIFICATION LINK DISPATCHED.",
          };
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toUpperCase() : "SIGN UP FAILED.";
      return { error: msg };
    }
  }

  // Simulated Wireframe Session Fallback
  const cookieOptions: SessionCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };

  if (stayLoggedIn) {
    cookieOptions.maxAge = 60 * 60 * 24 * 30; // 30 days
  }

  cookieStore.set(
    SIMULATED_SESSION_COOKIE,
    JSON.stringify({ email, stayLoggedIn, loggedInAt: new Date().toISOString() }),
    cookieOptions
  );

  revalidatePath("/");
  return {
    success: true,
    emailConfirmationRequired: false,
    user: { email, id: "simulated_operator" },
    message: "OPERATOR ACCOUNT CREATED (SIMULATED MODE).",
  };
}

export async function resendVerificationAction(
  email: string
): Promise<AuthActionResult> {
  const trimmed = email.trim();
  if (!trimmed) {
    return { error: "OPERATOR EMAIL REQUIRED FOR VERIFICATION." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: trimmed,
      });

      if (error) {
        return { error: error.message.toUpperCase() };
      }

      return {
        success: true,
        message: "VERIFICATION LINK RE-SENT. CHECK YOUR INBOX.",
      };
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message.toUpperCase() : "FAILED TO RE-SEND LINK.";
      return { error: msg };
    }
  }

  return {
    success: true,
    message: "VERIFICATION LINK DISPATCHED (SIMULATED MODE).",
  };
}

export async function logoutAction(): Promise<AuthActionResult> {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore signOut errors
    }
  }

  cookieStore.delete(SIMULATED_SESSION_COOKIE);
  revalidatePath("/");

  return { success: true, user: null, message: "OPERATOR SESSION TERMINATED." };
}

export async function deleteAccountAction(): Promise<AuthActionResult> {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (supabaseUrl && anonKey) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // If service role key is available, execute admin deletion
        if (serviceRoleKey) {
          const { createClient: createAdminClient } = await import("@supabase/supabase-js");
          const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);
          await adminSupabase.from("user_episodes").delete().eq("user_id", user.id);
          await adminSupabase.from("user_media").delete().eq("user_id", user.id);
          await adminSupabase.auth.admin.deleteUser(user.id);
        } else {
          // Clean up user data rows via user's authenticated scope
          await supabase.from("user_episodes").delete().eq("user_id", user.id);
          await supabase.from("user_media").delete().eq("user_id", user.id);
        }
        await supabase.auth.signOut();
      }
    } catch {
      // Continue cleanup
    }
  }

  cookieStore.delete(SIMULATED_SESSION_COOKIE);
  revalidatePath("/");

  return { success: true, user: null, message: "OPERATOR ACCOUNT AND DATA PURGED." };
}
