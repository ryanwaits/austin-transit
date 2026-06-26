// Same-origin subscribe for the self-contained preview. It validates and
// accepts the address; durable persistence (the `subscribers` table) lives in
// the Hono API, which production points NEXT_PUBLIC_API_BASE at.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  return Response.json({ ok: true }, { status: 201 });
}
