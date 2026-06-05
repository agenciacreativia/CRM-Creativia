import { notFound, redirect } from "next/navigation";
import { getProducto, listProductos } from "@/lib/db/productos";
import { ProductosManagerEditor } from "./editor-shell";

type Params = Promise<{ id: string }>;

export default async function EditarProductoPage({ params }: { params: Params }) {
  const { id } = await params;
  const p = await getProducto(id);
  if (!p) notFound();
  if (p.origen !== "propio") redirect(`/productos/${id}`);
  const all = await listProductos();
  return <ProductosManagerEditor initial={all} editingId={id} />;
}
