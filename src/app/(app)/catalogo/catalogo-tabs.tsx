import Link from "next/link";

const TABS: { key: "campos" | "productos"; label: string }[] = [
  { key: "campos", label: "Campos" },
  { key: "productos", label: "Productos" },
];

export function CatalogoTabs({ active }: { active: "campos" | "productos" }) {
  return (
    <div style={{ display: "flex", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 999, padding: 3, gap: 2, alignSelf: "flex-start" }}>
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.key === "campos" ? "/catalogo" : "/catalogo?tab=productos"}
          style={{
            padding: "0.45rem 1.1rem",
            borderRadius: 999,
            fontWeight: 700,
            fontSize: "0.85rem",
            background: active === t.key ? "var(--card)" : "transparent",
            color: active === t.key ? "var(--ink)" : "var(--ink-dim)",
            boxShadow: active === t.key ? "var(--sh-soft)" : "none",
          }}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
