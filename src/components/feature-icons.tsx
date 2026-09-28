// Íconos SVG para la landing — mismo tratamiento de trazo que
// BrandMark (stroke, sin relleno, puntas redondeadas), en vez de
// emojis: no dependen de la fuente del sistema y se pueden themear
// con currentColor.
type IconProps = { size?: number };

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function PaletteIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...strokeProps}>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.9-.5-1.4 0-1.1.9-2 2-2h2.4c2.3 0 4.1-1.8 4.1-4.1C21.5 6 17.2 2 12 2z" />
      <circle cx="6.5" cy="11.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="7.3" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="7.3" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="11.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FileExportIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...strokeProps}>
      <path d="M12 3v11" />
      <path d="M8.5 10.5 12 14l3.5-3.5" />
      <path d="M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function EnvelopeIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...strokeProps}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3.5 7 12 13l8.5-6" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...strokeProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5 10.8 15 16 9.5" />
    </svg>
  );
}
