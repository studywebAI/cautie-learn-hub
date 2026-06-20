'use client';

type SpinnerProps = {
  size?: number;
  color?: string;
  className?: string;
};

const BAR_COUNT = 16;
const bars = Array.from({ length: BAR_COUNT }, (_, i) => ({
  rotate: i * (360 / BAR_COUNT),
  delay: i * (0.8 / BAR_COUNT),
}));

export function Spinner({ size = 20, color = 'var(--accent-brand)', className }: SpinnerProps) {
  return (
    <div
      className={className}
      style={{ position: 'relative', width: size, height: size }}
      role="status"
      aria-label="Loading"
    >
      {bars.map((bar, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 animate-fade-spin rounded-full"
          style={{
            width: size * 0.08,
            height: size * 0.24,
            backgroundColor: color,
            transform: `rotate(${bar.rotate}deg) translate(0, -${size * 0.38}px)`,
            transformOrigin: 'center',
            animationDelay: `${bar.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
