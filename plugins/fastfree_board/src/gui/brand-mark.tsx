/**
 * FastFree Infinity Mark — compact inline rendering of the official master asset
 * (see fastfree-brand skill, assets/logo/fastfree-infinity-mark.svg).
 * Geometry follows the brand source; micro-detail (circuit traces, inner
 * typography) is dropped because it is illegible below 64px.
 * `bare` renders only the glyph (transparent background) for host chrome slots.
 */
export function FastFreeMark(props: { size?: number; class?: string; bare?: boolean }) {
  const size = () => props.size ?? 34
  return (
    <svg class={props.class} width={size()} height={size()} viewBox="0 0 512 512" role="img" aria-label="FastFree" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ffgm-bronze" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F59E0B" />
          <stop offset="45%" stop-color="#B45309" />
          <stop offset="100%" stop-color="#78350F" />
        </linearGradient>
        <linearGradient id="ffgm-silver" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="35%" stop-color="#CBD5E1" />
          <stop offset="70%" stop-color="#64748B" />
          <stop offset="100%" stop-color="#334155" />
        </linearGradient>
        <radialGradient id="ffgm-glow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="30%" stop-color="#67E8F9" stop-opacity="0.95" />
          <stop offset="62%" stop-color="#00F0FF" stop-opacity="0.75" />
          <stop offset="100%" stop-color="#1D4ED8" stop-opacity="0" />
        </radialGradient>
      </defs>
      {!props.bare && <rect width="512" height="512" rx="118" fill="#030712" />}
      <path d="M 256,256 C 220,165 145,150 95,185 C 45,220 38,290 85,335 C 135,380 215,350 256,256 Z"
        fill="url(#ffgm-bronze)" stroke="#92400E" stroke-width="10" stroke-linejoin="round" />
      <path d="M 256,256 C 292,165 367,150 417,185 C 467,220 474,290 427,335 C 377,380 297,350 256,256 Z"
        fill="url(#ffgm-silver)" stroke="#475569" stroke-width="10" stroke-linejoin="round" />
      <circle cx="150" cy="256" r="46" fill="#0F172A" stroke="#B45309" stroke-width="10" />
      <circle cx="362" cy="256" r="46" fill="#0F172A" stroke="#94A3B8" stroke-width="10" />
      <circle cx="256" cy="256" r="74" fill="url(#ffgm-glow)" />
      <polygon points="256,196 308,226 308,286 256,316 204,286 204,226"
        fill="#0A192F" stroke="#38BDF8" stroke-width="12" stroke-linejoin="round" />
      <path d="M 256,232 Q 256,256 232,256 Q 256,256 256,280 Q 256,256 280,256 Q 256,256 256,232 Z" fill="#FFFFFF" />
    </svg>
  )
}
