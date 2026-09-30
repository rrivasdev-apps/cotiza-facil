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

export function GalleryIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...strokeProps}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

export function SparkleIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...strokeProps}>
      <path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
      <path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4z" />
    </svg>
  );
}

export function GiftIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...strokeProps}>
      <rect x="3.5" y="9" width="17" height="4.5" rx="1" />
      <rect x="4.5" y="13.5" width="15" height="7.5" rx="1" />
      <path d="M12 9v12" />
      <path d="M12 9C10 9 8 7.8 8 6a2.2 2.2 0 0 1 4-1.4A2.2 2.2 0 0 1 16 6c0 1.8-2 3-4 3z" />
    </svg>
  );
}

export function HelpCircleIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...strokeProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9.3a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.3.9-1.3 1.8" />
      <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
