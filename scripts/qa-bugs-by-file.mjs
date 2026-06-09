// Agrupa los bugs del workflow QA por archivo, ordenados por severidad.
// Sale a stdout en JSON limpio para que pueda consumirlo el siguiente paso.
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
      if (Array.isArray(input?.hallazgos)) {
        audits.push({ modulo: input.modulo, hallazgos: input.hallazgos });
      }
    }
  }
}

// Aplanar y deduplicar por (archivo, descripcion)
const seen = new Set();
const bugs = [];
for (const a of audits) {
  for (const h of a.hallazgos) {
    const key = `${h.archivo}|${(h.descripcion || "").slice(0, 100)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    bugs.push({
      severidad: h.severidad,
      tipo: h.tipo,
      modulo: h.modulo || a.modulo,
      archivo: h.archivo,
      descripcion: h.descripcion,
      como_reproducir: h.como_reproducir,
      fix_sugerido: h.fix_sugerido,
    });
  }
}

// Agrupar por archivo
const byFile = {};
for (const b of bugs) {
  const f = (b.archivo || "unknown").split(":")[0].replace(/^apps\/web\//, "");
  if (!byFile[f]) byFile[f] = [];
  byFile[f].push(b);
}

// Ordenar por severidad dentro de cada archivo
const sevOrder = { critico: 0, alto: 1, medio: 2, bajo: 3 };
for (const f in byFile) {
  byFile[f].sort((a, b) => (sevOrder[a.severidad] ?? 9) - (sevOrder[b.severidad] ?? 9));
}

// Stats globales
const sevCount = { critico: 0, alto: 0, medio: 0, bajo: 0 };
for (const b of bugs) sevCount[b.severidad] = (sevCount[b.severidad] || 0) + 1;

console.log(`Bugs únicos: ${bugs.length}`);
console.log(`Archivos afectados: ${Object.keys(byFile).length}`);
console.log(`Severidad: ${JSON.stringify(sevCount)}`);

// Solo críticos y altos para el lote inicial
const criticos = bugs.filter(b => b.severidad === "critico");
const altos = bugs.filter(b => b.severidad === "alto");
console.log(`\nCRÍTICOS (${criticos.length}):`);
for (const b of criticos) {
  console.log(`  ${b.archivo} | ${(b.descripcion || "").slice(0, 90)}`);
}

writeFileSync("D:\\CREATIVIA\\CRM-CREATIVIA-TURISTEA\\docs\\qa-bugs-by-file.json", JSON.stringify({ byFile, criticos, altos, sevCount, total: bugs.length }, null, 2));
console.log(`\nJSON: docs/qa-bugs-by-file.json`);
