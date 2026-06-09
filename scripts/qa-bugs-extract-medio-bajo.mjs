// Extrae bugs medios y bajos agrupados por archivo, dedupeados.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WF_DIR = "C:\\Users\\Santiago\\.claude\\projects\\D--CREATIVIA-CRM-TURISTEA\\cdaefff2-d136-4796-aa5c-671a3b0c375b\\subagents\\workflows\\wf_aed76b75-4b8";

const audits = [];
const files = readdirSync(WF_DIR).filter((f) => f.startsWith("agent-") && f.endsWith(".jsonl"));
for (const f of files) {
  let content;
  try { content = readFileSync(join(WF_DIR, f), "utf8"); } catch { continue; }
  for (const line of content.split("\n").filter(Boolean)) {
    let evt;
    try { evt = JSON.parse(line); } catch { continue; }
    const cs = evt?.message?.content;
    if (!Array.isArray(cs)) continue;
    for (const c of cs) {
      if (c.type !== "tool_use" || c.name !== "StructuredOutput") continue;
      const input = c.input;
      if (Array.isArray(input?.hallazgos)) audits.push({ modulo: input.modulo, hallazgos: input.hallazgos });
    }
  }
}

const seen = new Set();
const all = [];
for (const a of audits) {
  for (const h of a.hallazgos) {
    const key = `${h.archivo}|${(h.descripcion || "").slice(0, 100)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    all.push({ ...h, modulo: h.modulo || a.modulo });
  }
}

const medios = all.filter(b => b.severidad === "medio");
const bajos = all.filter(b => b.severidad === "bajo");

const byFile = (arr) => {
  const o = {};
  for (const b of arr) {
    const f = (b.archivo || "?").split(":")[0].split(",")[0].split(" ")[0].replace(/^apps\/web\//, "");
    if (!o[f]) o[f] = [];
    o[f].push(b);
  }
  return o;
};

const mediosByFile = byFile(medios);
const bajosByFile = byFile(bajos);

writeFileSync("D:/CREATIVIA/CRM-CREATIVIA-TURISTEA/docs/qa-medios-by-file.json", JSON.stringify(mediosByFile, null, 2));
writeFileSync("D:/CREATIVIA/CRM-CREATIVIA-TURISTEA/docs/qa-bajos-by-file.json", JSON.stringify(bajosByFile, null, 2));

console.log(`Medios: ${medios.length} en ${Object.keys(mediosByFile).length} archivos`);
console.log(`Bajos: ${bajos.length} en ${Object.keys(bajosByFile).length} archivos`);
console.log("\nTop 15 archivos con bugs medios:");
Object.entries(mediosByFile).sort((a,b)=>b[1].length-a[1].length).slice(0, 15).forEach(([f, arr]) => {
  console.log(`  [${arr.length}] ${f}`);
});
console.log("\nTop 15 archivos con bugs bajos:");
Object.entries(bajosByFile).sort((a,b)=>b[1].length-a[1].length).slice(0, 15).forEach(([f, arr]) => {
  console.log(`  [${arr.length}] ${f}`);
});
