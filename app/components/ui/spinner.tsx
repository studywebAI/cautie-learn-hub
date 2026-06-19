'use client';

type SpinnerProps = {
  size?: number;
  color?: string;
  className?: string;
};

const bars = Array.from({ length: 12 }, (_, i) => ({
  rotate: i * 30,
  delay: i * 0.1,
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
