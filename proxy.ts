import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  let isAuthenticated = false;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      });

      // Refreshing the auth token
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && user.email) {
        isAuthenticated = true;
      }
    } catch {
      // Continue to simulated check
    }
  }

  // Fallback: Check simulated operator session cookie
  const simCookie = request.cookies.get("koax_operator_session");
  if (simCookie?.value) {
    try {
      const parsed = JSON.parse(simCookie.value);
      if (parsed.email) {
        isAuthenticated = true;
      }
    } catch {
      // Malformed cookie
    }
  }

  // 1. If NOT authenticated and trying to access any protected route:
  if (!isAuthenticated && !pathname.startsWith("/auth")) {
    const authUrl = new URL("/auth", request.url);
    return NextResponse.redirect(authUrl);
  }

  // 2. If already authenticated and trying to access /auth:
  if (isAuthenticated && pathname === "/auth") {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public images/svg assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

