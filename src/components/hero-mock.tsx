import Image from "next/image";

// Laptop + teléfono del hero con capturas reales del inicio de la app
// (public/landing/). Hay que reemplazarlas si cambia esa pantalla.
// aria-hidden: es decorativo.
export function HeroMock() {
  return (
    <div className="hm" aria-hidden="true">
      <div className="hm-chip hm-chip-pdf">
        <span className="hm-chip-pdf-icon">PDF</span> PDF listo para enviar
      </div>
      <div className="hm-laptop">
        <div className="hm-laptop-lid">
          <Image
            src="/landing/app-inicio-desktop.png"
            alt=""
            width={1031}
            height={786}
            priority
            className="hm-laptop-shot"
          />
        </div>
        <div className="hm-laptop-base" />
      </div>
      <div className="hm-phone">
        <div className="hm-phone-screen">
          <Image
            src="/landing/app-inicio-movil.png"
            alt=""
            width={640}
            height={1054}
            className="hm-phone-shot"
          />
        </div>
      </div>
      <div className="hm-chip hm-chip-ok">
        <span className="hm-chip-ok-icon">✓</span> Presupuesto aprobado
      </div>
    </div>
  );
}
