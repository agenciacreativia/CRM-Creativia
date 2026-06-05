import { NextResponse } from "next/server";
import { loadPickerData } from "@/lib/db/picker-data";

/** Reference data for the create-record modals (empresas, contactos, pipelines, etapas, usuarios, motivos). */
export async function GET() {
  try {
    const data = await loadPickerData();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
