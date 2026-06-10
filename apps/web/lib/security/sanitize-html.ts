import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitización de HTML para contenido controlado por el usuario (cuerpos de
 * campaña, plantillas de correo, contenido de RichText) antes de persistir o
 * de renderizar con dangerouslySetInnerHTML.
 *
 * Reemplaza al sanitizer casero por regex (evitable con `<img/src=x/onerror>`,
 * `<svg/onload>`, `javascript&colon;`, etc.). DOMPurify parsea el HTML real y
 * aplica una allowlist, lo que cierra esa clase de bypasses.
 *
 * Allowlist orientada a email/rich-text: formato básico, listas, links,
 * imágenes y tablas. Se prohíben script/style/iframe/svg/object y todos los
 * atributos on*. Los links se fuerzan a abrir con rel seguro vía hook.
 */

const ALLOWED_TAGS = [
  "p", "br", "b", "strong", "i", "em", "u", "s", "strike", "sub", "sup",
  "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code",
  "ul", "ol", "li", "a", "img", "span", "div", "hr",
  "table", "thead", "tbody", "tr", "td", "th",
];

const ALLOWED_ATTR = [
  "href", "src", "alt", "title", "width", "height",
  "style", "align", "target", "rel", "colspan", "rowspan",
];

// Esquemas de URI permitidos en href/src. Excluye javascript:, data: (salvo
// imágenes), vbscript:, etc.
const ALLOWED_URI_REGEXP = /^(?:https?:|mailto:|tel:|cid:|#)/i;

let hookInstalado = false;
function instalarHooks() {
  if (hookInstalado) return;
  hookInstalado = true;
  // Forzar rel seguro en todos los <a target="_blank"> para evitar tabnabbing.
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  instalarHooks();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "svg", "math", "link", "meta"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
    ALLOW_DATA_ATTR: false,
  });
}
