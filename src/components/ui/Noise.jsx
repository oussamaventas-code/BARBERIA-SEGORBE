/** Ruido global con feTurbulence a 0.05 de opacidad */
export default function Noise() {
  return (
    <svg className="noise-overlay h-full w-full" aria-hidden="true">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  )
}
