export function MaiLogo({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="mai-petal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD54F" />
          <stop offset="100%" stopColor="#F5B800" />
        </linearGradient>
      </defs>
      {/* 5 petals */}
      <g transform="translate(50, 45)">
        {[0, 72, 144, 216, 288].map((angle) => (
          <path
            key={angle}
            d="M0,-28 C8,-22 10,-10 0,-2 C-10,-10 -8,-22 0,-28Z"
            fill="url(#mai-petal)"
            opacity={0.9}
            transform={`rotate(${angle})`}
          />
        ))}
        <circle cx="0" cy="0" r="4" fill="#5C3D1A" />
        <circle cx="0" cy="0" r="2.5" fill="#8B6914" />
      </g>
      {/* DB ellipses */}
      <g transform="translate(50, 78)">
        <ellipse cx="0" cy="0" rx="18" ry="5" fill="none" stroke="#F5B800" strokeWidth="1.5" opacity="0.7" />
        <ellipse cx="0" cy="5" rx="18" ry="5" fill="none" stroke="#F5B800" strokeWidth="1.5" opacity="0.5" />
        <line x1="-18" y1="0" x2="-18" y2="5" stroke="#F5B800" strokeWidth="1.5" opacity="0.6" />
        <line x1="18" y1="0" x2="18" y2="5" stroke="#F5B800" strokeWidth="1.5" opacity="0.6" />
      </g>
    </svg>
  )
}
