// Logo real de la app (en vez del ícono dibujado a mano + texto
// separado que había antes) — siempre el lockup apaisado (ícono +
// "Cotiza Fácil"), sin placa de fondo: el PNG ya es transparente.
export function BrandMark({ height = 36 }: { height?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-horizontal.png"
      alt="Cotiza Fácil"
      style={{ height, width: "auto", display: "block", flex: "0 0 auto" }}
    />
  );
}
