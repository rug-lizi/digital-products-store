import { clientIp, constantTimeEqual, getSecureSetting, json, positiveInt, randomToken, runtime, sha256 } from "../../../server";

export async function POST(request: Request) {
  const now = Date.now();
  const ipHash = await sha256(clientIp(request));
  const attempt = await runtime().DB.prepare(
    "SELECT failures, reset_at FROM login_attempts WHERE ip_hash = ?",
  ).bind(ipHash).first<{ failures: number; reset_at: number }>();
  if (attempt && attempt.reset_at > now && attempt.failures >= 5) {
    return json(
      { error: "Too many login attempts. Try again later." },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: string };
    password = body.password || "";
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }
  const expected = (await getSecureSetting("ADMIN_PASSWORD")) || runtime().ADMIN_PASSWORD || "";
  if (expected.length < 12 || !(await constantTimeEqual(password, expected))) {
    const resetAt = attempt && attempt.reset_at > now ? attempt.reset_at : now + 15 * 60 * 1000;
    const failures = attempt && attempt.reset_at > now ? attempt.failures + 1 : 1;
    await runtime().DB.prepare(
      `INSERT INTO login_attempts (ip_hash, failures, reset_at) VALUES (?, ?, ?)
       ON CONFLICT(ip_hash) DO UPDATE SET failures = excluded.failures, reset_at = excluded.reset_at`,
    ).bind(ipHash, failures, resetAt).run();
    return json({ error: "Invalid password" }, { status: 401 });
  }

  await runtime().DB.prepare("DELETE FROM login_attempts WHERE ip_hash = ?").bind(ipHash).run();
  const token = randomToken();
  const tokenHash = await sha256(token);
  const maxAge = positiveInt(runtime().ADMIN_SESSION_HOURS, 8) * 60 * 60;
  await runtime().DB.batch([
    runtime().DB.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").bind(now),
    runtime().DB.prepare(
      "INSERT INTO admin_sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)",
    ).bind(tokenHash, now, now + maxAge * 1000),
  ]);
  return json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": `admin_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`,
      },
    },
  );
}
