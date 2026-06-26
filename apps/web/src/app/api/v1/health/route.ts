export function GET() {
  return Response.json({ ok: true, mock_mode: true, time: new Date().toISOString() });
}
