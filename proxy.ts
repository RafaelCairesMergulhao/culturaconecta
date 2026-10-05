import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/entrar", "/regras", "/termos", "/privacidade"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (request.cookies.has("cc_session")) return NextResponse.next();
  return NextResponse.redirect(new URL("/entrar", request.url));
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"],
};
