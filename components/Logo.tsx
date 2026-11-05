export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Minimalist Lens/Reel SVG */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="w-7 h-7 text-zinc-900"
      >
        <circle cx="10" cy="12" r="8" />
        <circle cx="17" cy="12" r="4" />
      </svg>
      
      {/* Wordmark */}
      <span className="font-sans text-xl font-bold tracking-[0.25em] text-zinc-900 mt-1">
        KURA
      </span>
    </div>
  );
}
