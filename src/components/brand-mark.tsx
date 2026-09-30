// Logo real de la app (en vez del ícono dibujado a mano + texto
// separado que había antes) — ver .brand-mark-* en globals.css.
//
// Va envuelto en una "chip" de fondo blanco fijo (no var(--card)) a
// propósito: el logo apaisado trae el texto "Cotiza Fácil" impreso en
// un azul marino casi negro, así que sobre el fondo oscuro del header
// en modo oscuro (--card ~#232427) el contraste sería casi nulo. Con
// el fondo blanco fijo, en modo claro la chip se funde con el header
// (ya es blanco) y en modo oscuro se ve como una placa blanca
// redondeada — siempre legible, sea cual sea el tema.
//
// Por debajo de 480px se cambia al isotipo cuadrado (sin texto) para
// no competir por ancho con los botones de "Iniciar sesión"/"Crear
// cuenta" del header público — mismo comportamiento que antes tenía
// el texto solo (ver el .public-header-title que esto reemplaza).
export function BrandMark({ height = 24 }: { height?: number }) {
  return (
    <span className="brand-mark">
      <span className="brand-mark-chip brand-mark-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal.png" alt="Cotiza Fácil" style={{ height, width: "auto", display: "block" }} />
      </span>
      <span className="brand-mark-chip brand-mark-icon">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.png" alt="Cotiza Fácil" style={{ height, width: "auto", display: "block" }} />
      </span>
    </span>
  );
}
