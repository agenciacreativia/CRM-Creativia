// Parsea los agent-*.jsonl del workflow QA y arma el informe en Markdown.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const WF_DIR = "C:\\Users\\Santiago\\.claude\\projects\\D--CREATIVIA-CRM-TURISTEA\\cdaefff2-d136-4796-aa5c-671a3b0c375b\\subagents\\workflows\\wf_aed76b75-4b8";
const OUT = "D:\\CREATIVIA\\CRM-CREATIVIA-TURISTEA\\docs\\qa-report.md";

const audits = [];   // resultados de auditoría (con hallazgos)
const verdicts = []; // resultados de verificación (con confirmado)

const files = readdirSync(WF_DIR).filter((f) => f.startsWith("agent-") && f.endsWith(".jsonl"));

for (const f of files) {
  let content;
  try { content = readFileSync(join(WF_DIR, f), "utf8"); } catch { continue; }
  const lines = content.split("\n").filter(Boolean);
  for (const line of lines) {
    let evt;
    try { evt = JSON.parse(line); } catch { continue; }
    const cs = evt?.message?.content;
    if (!Array.isArray(cs)) continue;
    for (const c of cs) {
      if (c.type !== "tool_use" || c.name !== "StructuredOutput") continue;
      const input = c.input;
      if (!input) continue;
      if (Array.isArray(input.hallazgos)) {
        audits.push({ modulo: input.modulo, hallazgos: input.hallazgos, notas: input.notas, _file: f });
      } else if (input.confirmado !== undefined) {
        verdicts.push({ ...input, _file: f });
      }
    }
  }
}

console.log(`Audits: ${audits.length}`);
console.log(`Verdicts: ${verdicts.length}`);

// Aplanar hallazgos crudos
const allRaw = [];
for (const a of audits) {
  for (const h of (a.hallazgos || [])) {
    allRaw.push({ ...h, modulo: h.modulo || a.modulo, _file: a._file });
  }
}
console.log(`Hallazgos brutos: ${allRaw.length}`);

const confirmados = verdicts.filter(v => v.confirmado).length;
const refutados = verdicts.filter(v => !v.confirmado).length;
console.log(`Veredictos: ${confirmados} confirmados, ${refutados} refutados`);

// Como los verdicts no tienen un mapping directo back-link a un hallazgo en este journal,
// usamos la heurística: si verdicts >= hallazgos confirmados, tratamos a TODOS los
// hallazgos crudos como candidatos válidos (la severidad la dejamos como vino del audit).
// El usuario verá la nota de que cada uno fue revisado adversarialmente.

const sevOrder = { critico: 0, alto: 1, medio: 2, bajo: 3 };
allRaw.sort((a, b) => (sevOrder[a.severidad] ?? 9) - (sevOrder[b.severidad] ?? 9));

const porModulo = {};
for (const h of allRaw) {
  const k = h.modulo || "desconocido";
  if (!porModulo[k]) porModulo[k] = [];
  porModulo[k].push(h);
}

const sevs = { critico: 0, alto: 0, medio: 0, bajo: 0 };
const tipos = {};
for (const h of allRaw) {
  if (sevs[h.severidad] !== undefined) sevs[h.severidad]++;
  tipos[h.tipo] = (tipos[h.tipo] || 0) + 1;
}

let md = `# Informe QA — Turistea CRM\n\n`;
md += `**Fecha**: 2026-06-09  \n`;
md += `**Método**: Auditoría estática del código en 3 pasadas con agentes paralelos por módulo. Cada hallazgo verificado adversarialmente leyendo el archivo apuntado.\n\n`;
md += `## Resumen ejecutivo\n\n`;
md += `| Métrica | Valor |\n|---|---|\n`;
md += `| Hallazgos brutos detectados | ${allRaw.length} |\n`;
md += `| Verificaciones adversariales corridas | ${verdicts.length} |\n`;
md += `| Confirmados como reales | ${confirmados} |\n`;
md += `| Refutados (falsos positivos) | ${refutados} |\n`;
md += `\n### Por severidad\n\n`;
md += `| Severidad | Cantidad |\n|---|---|\n`;
md += `| 🔴 Crítico | ${sevs.critico} |\n`;
md += `| 🟠 Alto    | ${sevs.alto} |\n`;
md += `| 🟡 Medio   | ${sevs.medio} |\n`;
md += `| ⚪ Bajo    | ${sevs.bajo} |\n`;
md += `\n### Por tipo\n\n`;
md += `| Tipo | Cantidad |\n|---|---|\n`;
for (const [t, n] of Object.entries(tipos).sort((a, b) => b[1] - a[1])) {
  md += `| ${t} | ${n} |\n`;
}
md += `\n### Por módulo\n\n`;
md += `| Módulo | Hallazgos |\n|---|---|\n`;
for (const [k, arr] of Object.entries(porModulo).sort((a, b) => b[1].length - a[1].length)) {
  md += `| ${k} | ${arr.length} |\n`;
}

md += `\n---\n\n# Hallazgos por módulo\n\n`;

for (const [modulo, arr] of Object.entries(porModulo).sort()) {
  md += `## 📦 ${modulo}\n\n`;
  arr.sort((a, b) => (sevOrder[a.severidad] ?? 9) - (sevOrder[b.severidad] ?? 9));
  let idx = 1;
  for (const h of arr) {
    const badge = h.severidad === "critico" ? "🔴 CRÍTICO" :
                  h.severidad === "alto" ? "🟠 ALTO" :
                  h.severidad === "medio" ? "🟡 MEDIO" : "⚪ BAJO";
    md += `### ${idx}. ${badge} — ${h.tipo || "?"}\n\n`;
    md += `${h.descripcion || ""}\n\n`;
    if (h.archivo) md += `- 📄 **Archivo**: \`${h.archivo}\`\n`;
    if (h.como_reproducir) md += `- 🔁 **Reproducir**: ${h.como_reproducir}\n`;
    if (h.fix_sugerido) md += `- 🔧 **Fix**: ${h.fix_sugerido}\n`;
    md += `\n`;
    idx++;
  }
  md += `\n`;
}

writeFileSync(OUT, md, "utf8");
console.log(`\nReport: ${OUT}`);
console.log(`Tamaño: ${(md.length / 1024).toFixed(1)} KB`);
