import { ID_TOKEN_RE } from "@/lib/composite-template";
import type { PresupuestoData } from "@/lib/types";

// Evaluador aritmético seguro (sin eval/Function): +, -, *, /,
// paréntesis y números decimales. Cualquier otro carácter, o texto
// sobrante al final, hace que devuelva null en vez de un resultado
// parcial.
export function evaluateArithmetic(expr: string): number | null {
  let i = 0;

  function skipWs() {
    while (i < expr.length && /\s/.test(expr[i])) i++;
  }

  function parseNumber(): number | null {
    const start = i;
    while (i < expr.length && /[0-9.]/.test(expr[i])) i++;
    const matched = expr.slice(start, i);
    if (matched === "" || matched === ".") return null;
    const n = Number(matched);
    return Number.isFinite(n) ? n : null;
  }

  function parseFactor(): number | null {
    skipWs();
    if (expr[i] === "-") {
      i++;
      const v = parseFactor();
      return v === null ? null : -v;
    }
    if (expr[i] === "(") {
      i++;
      const v = parseExpr();
      skipWs();
      if (expr[i] !== ")") return null;
      i++;
      return v;
    }
    return parseNumber();
  }

  function parseTerm(): number | null {
    let v = parseFactor();
    if (v === null) return null;
    for (;;) {
      skipWs();
      if (expr[i] === "*") {
        i++;
        const rhs = parseFactor();
        if (rhs === null) return null;
        v *= rhs;
      } else if (expr[i] === "/") {
        i++;
        const rhs = parseFactor();
        if (rhs === null) return null;
        v = rhs === 0 ? NaN : v / rhs;
      } else {
        break;
      }
    }
    return v;
  }

  function parseExpr(): number | null {
    let v = parseTerm();
    if (v === null) return null;
    for (;;) {
      skipWs();
      if (expr[i] === "+") {
        i++;
        const rhs = parseTerm();
        if (rhs === null) return null;
        v += rhs;
      } else if (expr[i] === "-") {
        i++;
        const rhs = parseTerm();
        if (rhs === null) return null;
        v -= rhs;
      } else {
        break;
      }
    }
    return v;
  }

  const result = parseExpr();
  skipWs();
  if (i !== expr.length || result === null || !Number.isFinite(result)) return null;
  return result;
}

// Reemplaza cada {{id:<uuid>}} por el valor numérico ya cargado de ese
// campo y evalúa el resultado. Si algún campo referenciado todavía no
// tiene un valor numérico válido (por ejemplo, depende de otra fórmula
// que se resuelve en una pasada posterior), devuelve null en vez de
// tratarlo como 0 — evita mostrar un total incompleto como si fuera
// definitivo.
export function evaluateFormula(template: string, data: PresupuestoData): number | null {
  let allResolved = true;
  const substituted = template.replace(ID_TOKEN_RE, (_match, fieldId: string) => {
    const raw = data[fieldId];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const num = Number(value);
    if (!Number.isFinite(num)) {
      allResolved = false;
      return "0";
    }
    return `(${num})`;
  });
  if (!allResolved) return null;
  return evaluateArithmetic(substituted);
}
