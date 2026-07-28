import { json, parseCookies, runtime, sha256 } from "../../../server";

export async function POST(request: Request) {
  const token = parseCookies(request).get("admin_session");
  if (token) {
    await runtime().DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  }
  return json(
    { ok: true },
    { headers: { "Set-Cookie": "admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict" } },
  );
}
