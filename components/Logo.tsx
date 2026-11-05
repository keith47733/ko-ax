export default function KoaxLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 70 40"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Thinner, longer charcoal wire */}
      <rect x="0" y="16" width="35" height="8" fill="currentColor" />

      {/* Slimmer hex nut profile */}
      <polygon
        points="35,16 39,10 51,10 55,16 55,24 51,30 39,30 35,24"
        fill="currentColor"
      />

      {/* Burnt Orange apothecary stinger */}
      <rect x="55" y="18" width="15" height="4" fill="#c2410c" />
    </svg>
  );
}
