import { NextRequest, NextResponse } from "next/server";
import { registrarAperturaCorreo } from "@/lib/db/correo-tracking";

// 1x1 transparent GIF
const GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cleanId = id.replace(/\.(gif|png|jpg)$/i, "");
  // Fire-and-forget; never block the response.
  registrarAperturaCorreo(cleanId).catch(() => {});
  return new NextResponse(GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(GIF.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}
