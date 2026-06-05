import { NextRequest, NextResponse } from "next/server";
import { registrarClickCorreo } from "@/lib/db/correo-tracking";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dest = req.nextUrl.searchParams.get("u");
  if (!dest) return new NextResponse("missing u", { status: 400 });

  // Validate it's an http(s) URL before redirecting (prevent open-redirect via weird schemes).
  let url: URL;
  try {
    url = new URL(dest);
    if (!/^https?:$/.test(url.protocol)) throw new Error("bad scheme");
  } catch {
    return new NextResponse("invalid url", { status: 400 });
  }

  registrarClickCorreo(id).catch(() => {});
  return NextResponse.redirect(url.toString(), 302);
}
