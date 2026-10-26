import type { CrewMember } from '../data/crew'

/**
 * A crew portrait, drawn rather than photographed: a helmet whose visor
 * reflects Nadir (a dark disk ringed by the accretion glow, in the member's
 * own hue), over a field of stars seeded by their name. No two are alike and
 * nothing looks like stock.
 */

function seeded(name: string) {
  let h = 2166136261
  for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

export function Portrait({ member }: { member: CrewMember }) {
  const rand = seeded(member.name)
  const { hue, id } = member
  const tilt = (rand() - 0.5) * 18
  const stars = Array.from({ length: 26 }, () => ({
    x: rand() * 240,
    y: rand() * 200,
    r: 0.4 + rand() * 1.1,
    o: 0.25 + rand() * 0.6,
  }))
  const glow = `hsl(${hue} 95% 62%)`
  const deep = `hsl(${hue} 70% 22%)`
  const ai = id === 'vela'

  return (
    <svg
      viewBox="0 0 240 200"
      aria-hidden="true"
      className="block h-auto w-full"
    >
      <defs>
        <radialGradient id={`fondo-${id}`} cx="50%" cy="35%" r="75%">
          <stop offset="0" stopColor={deep} />
          <stop offset="1" stopColor="#05050a" />
        </radialGradient>
        <linearGradient id={`casco-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4efe6" />
          <stop offset="0.55" stopColor="#bdb6aa" />
          <stop offset="1" stopColor="#5d5850" />
        </linearGradient>
        <radialGradient id={`visor-${id}`} cx="40%" cy="35%" r="80%">
          <stop offset="0" stopColor="#1a1a24" />
          <stop offset="1" stopColor="#020205" />
        </radialGradient>
        <radialGradient id={`halo-${id}`}>
          <stop offset="0.45" stopColor={glow} stopOpacity="0" />
          <stop offset="0.62" stopColor={glow} stopOpacity="0.95" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`recorte-${id}`}>
          <ellipse cx="120" cy="96" rx="46" ry="38" />
        </clipPath>
      </defs>

      <rect width="240" height="200" fill={`url(#fondo-${id})`} />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
      ))}

      {/* Shoulders */}
      <path
        d="M38 200 C46 160 82 146 120 146 C158 146 194 160 202 200 Z"
        fill={`url(#casco-${id})`}
        opacity="0.92"
      />
      <path d="M96 162 h48 v10 h-48 z" fill={deep} opacity="0.9" />

      <g transform={`rotate(${tilt.toFixed(1)} 120 100)`}>
        {/* Helmet shell */}
        <circle cx="120" cy="98" r="62" fill={`url(#casco-${id})`} />
        <circle
          cx="120"
          cy="98"
          r="62"
          fill="none"
          stroke="#000"
          strokeOpacity="0.25"
        />
        {/* Visor, with Nadir reflected in it */}
        <ellipse cx="120" cy="96" rx="46" ry="38" fill={`url(#visor-${id})`} />
        <g clipPath={`url(#recorte-${id})`}>
          <ellipse
            cx="128"
            cy="100"
            rx="36"
            ry="9"
            fill="none"
            stroke={glow}
            strokeWidth="3.5"
            opacity="0.9"
            transform="rotate(-8 128 100)"
          />
          <circle cx="128" cy="100" r="20" fill={`url(#halo-${id})`} />
          <circle cx="128" cy="100" r="10.5" fill="#000" />
          <path
            d="M92 70 Q120 58 150 66"
            stroke="#fff"
            strokeOpacity="0.35"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          {ai &&
            Array.from({ length: 7 }, (_, i) => (
              <line
                key={i}
                x1="74"
                x2="166"
                y1={80 + i * 5}
                y2={80 + i * 5}
                stroke={glow}
                strokeOpacity="0.18"
              />
            ))}
        </g>
        <ellipse
          cx="120"
          cy="96"
          rx="46"
          ry="38"
          fill="none"
          stroke="#000"
          strokeWidth="3"
          strokeOpacity="0.6"
        />
        {/* Mission patch */}
        <circle
          cx="166"
          cy="140"
          r="9"
          fill="#05050a"
          stroke={glow}
          strokeWidth="1.5"
        />
        <circle cx="166" cy="140" r="3" fill={glow} />
      </g>
    </svg>
  )
}
