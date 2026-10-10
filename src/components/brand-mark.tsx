// Logo real de la app (en vez del ícono dibujado a mano + texto
// separado que había antes) — siempre el lockup apaisado (ícono +
// "Cotiza Fácil"), sin placa de fondo: el PNG ya es transparente.
//
// Dos variantes superpuestas (clases .brand-mark-light/-dark, ver
// globals.css) en vez de una sola imagen: el wordmark "Cotiza Fácil"
// es azul marino fijo dentro del PNG, no sigue var(--ink), así que en
// modo oscuro necesita su propio archivo con el wordmark en blanco.
export function BrandMark({ height = 36 }: { height?: number }) {
  const style: React.CSSProperties = { height, width: "auto", flex: "0 0 auto" };
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-horizontal.png" alt="Cotiza Fácil" className="brand-mark-light" style={style} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-horizontal-dark.png" alt="Cotiza Fácil" className="brand-mark-dark" style={style} />
    </>
  );
}
