export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Minimalist Aperture / Interlocking Rings with Beeswax Yellow Gradient */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7 shrink-0"
      >
        <defs>
          <linearGradient
            id="kura-beeswax-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#F2D779" />
            <stop offset="50%" stopColor="#E0B438" />
            <stop offset="100%" stopColor="#C49622" />
          </linearGradient>
        </defs>
        <circle cx="10" cy="12" r="8" stroke="url(#kura-beeswax-gradient)" />
        <circle cx="17" cy="12" r="4" stroke="url(#kura-beeswax-gradient)" />
      </svg>

      {/* Wordmark */}
      <span className="font-sans text-xl font-bold tracking-[0.25em] text-zinc-950">
        KURA
      </span>
    </div>
  );
}
