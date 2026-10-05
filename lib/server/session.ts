import { cookies } from "next/headers";

const NAME = "cc_session";

export async function readToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(NAME)?.value ?? null;
}

export async function writeToken(token: string, secure: boolean) {
  const jar = await cookies();
  jar.set(NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure,
  });
}

export async function clearToken() {
  const jar = await cookies();
  jar.set(NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
