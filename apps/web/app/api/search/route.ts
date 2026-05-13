import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { globalSearch } from "@/lib/db/search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const hits = await globalSearch(q);
  return NextResponse.json({ hits });
}
