/** Seat usage as a ring. The arc is drawn at the same radius and stroke as the design's gauge. */
export function SeatGauge({ percent }: { percent: number }) {
  const radius = 16.2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(percent, 100) / 100) * circumference;
  const color = percent >= 80 ? "#10b981" : percent >= 50 ? "#f97316" : "#f43f5e";
  return (
    <div className="relative size-[36px] shrink-0">
      <svg viewBox="0 0 36 36" className="absolute inset-0 size-full" aria-hidden="true">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="#e4e4e7" strokeWidth="3.6" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3.6"
          strokeDasharray={`${filled} ${circumference}`}
          transform="rotate(-90 18 18)"
        />
      </svg>
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-bold leading-none text-[#18181b]">
        {percent}
      </span>
    </div>
  );
}
