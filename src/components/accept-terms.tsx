import Link from "next/link";

// Se abre en otra pestaña para que quien se está registrando no pierda lo
// que ya escribió en el formulario.
export function AcceptTerms() {
  return (
    <label style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", fontSize: "0.85rem", color: "var(--ink-dim)" }}>
      <input type="checkbox" name="accept_terms" required style={{ marginTop: "0.2rem" }} />
      <span>
        Acepto los{" "}
        <Link href="/terminos" target="_blank" style={{ color: "var(--accent-hover)", fontWeight: 600 }}>
          términos y condiciones
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" target="_blank" style={{ color: "var(--accent-hover)", fontWeight: 600 }}>
          política de privacidad
        </Link>
        .
      </span>
    </label>
  );
}
