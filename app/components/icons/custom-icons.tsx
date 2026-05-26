import { type SVGProps } from 'react';

export function FlashcardIcon({ className, strokeWidth = 1.6, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* back-left card */}
      <rect x="3" y="4" width="12" height="15" rx="2" transform="rotate(-22 9 11.5)" />
      {/* back-right card */}
      <rect x="9" y="4" width="12" height="15" rx="2" transform="rotate(16 15 11.5)" />
      {/* front card */}
      <rect x="6" y="3.5" width="12" height="15" rx="2" transform="rotate(-4 12 11)" />
    </svg>
  );
}

export function TimelineIcon({ className, strokeWidth = 1.6, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* clock circle */}
      <circle cx="12" cy="7" r="4.5" />
      {/* clock hands */}
      <polyline points="12 5 12 7 13.5 8.2" />
      {/* vertical connector from clock to timeline */}
      <line x1="12" y1="11.5" x2="12" y2="15.5" />
      {/* horizontal timeline line */}
      <line x1="3" y1="18" x2="21" y2="18" />
      {/* left node */}
      <circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none" />
      {/* center node */}
      <circle cx="12" cy="18" r="1.5" fill="currentColor" stroke="none" />
      {/* right node */}
      <circle cx="21" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
