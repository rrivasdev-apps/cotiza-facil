"use client";

import Image from "next/image";
import { useState, type KeyboardEvent, type ReactNode } from "react";

type BenefitFlipCardProps = {
  title: string;
  body: string;
  backBody: string;
  art: string;
  icon: ReactNode;
};

// Tarjeta con anverso (ilustración + descripción) y reverso (detalle).
// En computadora gira con el mouse (CSS :hover); en pantallas táctiles y
// con teclado gira al tocar / con Enter o Espacio. Ambas caras están en
// el DOM, así que el lector de pantalla lee todo el contenido.
export function BenefitFlipCard({ title, body, backBody, art, icon }: BenefitFlipCardProps) {
  const [flipped, setFlipped] = useState(false);

  const handleClick = (event: React.MouseEvent) => {
    // Con mouse el giro lo hace :hover; un clic no debe dejarla "pegada".
    // detail === 0 es un clic sintético (teclado/lector de pantalla).
    const hasHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (hasHover && event.detail > 0) return;
    setFlipped((value) => !value);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setFlipped((value) => !value);
  };

  return (
    <div
      className="landing-flip"
      data-flipped={flipped}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`${title}. Toca para ver el detalle`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="landing-flip-inner">
        <div className="landing-flip-face landing-card">
          {/* Ilustración decorativa: el texto de la tarjeta va aparte, en HTML. */}
          <Image src={art} alt="" width={1600} height={1000} unoptimized loading="lazy" className="landing-card-art" />
          <div className="landing-card-head">
            <div className="landing-card-icon">{icon}</div>
            <h3>{title}</h3>
          </div>
          <p>{body}</p>
          <span className="landing-flip-hint" aria-hidden="true">
            Ver detalle ↻
          </span>
        </div>
        <div className="landing-flip-face landing-flip-back">
          <div className="landing-flip-back-icon" aria-hidden="true">
            {icon}
          </div>
          <p className="landing-flip-back-title">{title}</p>
          <p className="landing-flip-back-body">{backBody}</p>
          <span className="landing-flip-hint" aria-hidden="true">
            Volver ↻
          </span>
        </div>
      </div>
    </div>
  );
}
