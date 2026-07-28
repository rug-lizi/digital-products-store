import { json, recordEvent } from "../../../server";

export async function POST(request: Request) {
  await recordEvent(request, "page_view");
  return json({ ok: true });
}
